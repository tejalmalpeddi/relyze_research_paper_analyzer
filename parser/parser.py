import json
import sys
import time
from pathlib import Path

import pymupdf
from docling.document_converter import DocumentConverter

from database import (
    connect_to_supabase,
    save_document,
    update_document_images,
    upload_images,
    upload_pdf,
)

# Base directory (parser/)
PARSER_DIRECTORY = Path(__file__).resolve().parent

# Input / Output files
PDF_INPUT_FILE = PARSER_DIRECTORY / "physicspaper1.pdf"

RAW_TEXT_JSON = PARSER_DIRECTORY / "output_raw.json"
STRUCTURED_JSON = PARSER_DIRECTORY / "output_structured.json"
MARKDOWN_FILE = PARSER_DIRECTORY / "output_paper.md"

IMAGE_OUTPUT_DIRECTORY = PARSER_DIRECTORY / "assets"


def extract_raw_text_from_pdf(pdf_path):
    pdf_document = pymupdf.open(pdf_path)

    raw_text_data = {
        "file_name": str(pdf_path),
        "page_count": len(pdf_document),
        "pages": []
    }

    for page_number, pdf_page in enumerate(pdf_document, start=1):
        raw_text_data["pages"].append({
            "page_number": page_number,
            "text": pdf_page.get_text("text")
        })

    pdf_document.close()
    return raw_text_data


def extract_structured_document(pdf_path):
    document_converter = DocumentConverter()
    conversion_result = document_converter.convert(pdf_path)

    markdown_document = conversion_result.document.export_to_markdown()
    structured_document = conversion_result.document.export_to_dict()

    return markdown_document, structured_document


def _cluster_rects(rects, pad=15):
    """
    Merge overlapping/nearby rectangles into clusters. Used to group the many
    individual vector-drawing paths that make up a single figure (e.g. a
    matplotlib plot exported to PDF) into one bounding box per figure.
    """
    clusters = [pymupdf.Rect(r) for r in rects]
    merged = True
    while merged:
        merged = False
        out = []
        while clusters:
            base = clusters.pop()
            expanded = pymupdf.Rect(base) + (-pad, -pad, pad, pad)
            i = 0
            while i < len(clusters):
                if expanded.intersects(clusters[i]):
                    base |= clusters[i]
                    expanded = pymupdf.Rect(base) + (-pad, -pad, pad, pad)
                    clusters.pop(i)
                    merged = True
                else:
                    i += 1
            out.append(base)
        clusters = out
    return clusters


def extract_images_from_pdf(
    pdf_path,
    output_directory,
    min_area=2500,
    min_paths=30,
    min_raster_dim=50,
):
    """
    Extract figures from a PDF, handling both:

      1. Embedded raster images (photos, scanned figures/tables, etc.) --
         found via page.get_images(), same as before.
      2. Vector-drawn figures (plots/charts exported from matplotlib, gnuplot,
         Origin, LaTeX/TikZ, etc.). These have NO embedded bitmap at all --
         they're pure drawing instructions (lines, curves, fills) -- so
         get_images() can never find them. This is very common in research
         papers, since most plots are vector graphics, not photos. We detect
         these by clustering the page's vector drawing paths into figure-sized
         regions and rasterizing (rendering) just that region to a PNG.

    Filters applied to avoid false positives:
      - min_area: drops tiny clusters (underlines, single rules, borders)
      - min_paths: drops clusters made of only a few paths, which is almost
        always a table's grid/border lines rather than an actual figure
      - min_raster_dim: drops tiny embedded bitmaps (colored digit stamps,
        bullet icons, etc.) that aren't meaningful standalone images
    """
    output_path = Path(output_directory)
    output_path.mkdir(parents=True, exist_ok=True)

    pdf_document = pymupdf.open(pdf_path)
    extracted_xrefs = set()
    saved_count = 0
    extracted_images = []

    for page_number, pdf_page in enumerate(pdf_document, start=1):
        page_raster_rects = []

        # --- 1. Embedded raster images ---
        page_images = pdf_page.get_images(full=True)
        for image_number, image_info in enumerate(page_images, start=1):
            image_xref = image_info[0]
            img_width, img_height = image_info[2], image_info[3]

            if image_xref in extracted_xrefs:
                continue
            extracted_xrefs.add(image_xref)

            if img_width < min_raster_dim or img_height < min_raster_dim:
                continue

            try:
                image_data = pdf_document.extract_image(image_xref)
            except Exception as e:
                print(f"Page {page_number}: failed to extract xref {image_xref}: {e}")
                continue

            image_extension = image_data["ext"]
            image_filename = (
                f"page_{page_number}_raster_{image_number}.{image_extension}"
            )
            image_path = output_path / image_filename

            with open(image_path, "wb") as image_file:
                image_file.write(image_data["image"])
            saved_count += 1

            extracted_images.append({
                "page_number": page_number,
                "image_type": "raster",
                "file_name": image_filename
            })

            # Track raster placement so we don't duplicate it as a "vector figure"
            for rect in pdf_page.get_image_rects(image_xref):
                page_raster_rects.append(rect)

        # --- 2. Vector-drawn figures (no embedded bitmap) ---
        drawings = pdf_page.get_drawings()
        vector_figures_saved = 0

        if drawings:
            drawing_rects = [d["rect"] for d in drawings if d["rect"].get_area() > 0]
            clusters = _cluster_rects(drawing_rects, pad=15)

            for cluster in clusters:
                if cluster.get_area() < min_area:
                    continue

                paths_in_cluster = sum(1 for r in drawing_rects if cluster.contains(r))
                if paths_in_cluster < min_paths:
                    continue

                if any(
                    cluster.intersects(r)
                    and (cluster & r).get_area() > 0.8 * cluster.get_area()
                    for r in page_raster_rects
                ):
                    continue

                clip = cluster + (-5, -5, 5, 5)
                clip = clip & pdf_page.rect
                pix = pdf_page.get_pixmap(matrix=pymupdf.Matrix(3, 3), clip=clip)

                vector_figures_saved += 1
                image_filename = f"page_{page_number}_vector_{vector_figures_saved}.png"
                pix.save(output_path / image_filename)
                saved_count += 1

                extracted_images.append({
                    "page_number": page_number,
                    "image_type": "vector",
                    "file_name": image_filename
                })

        print(
            f"Page {page_number}: {len(page_images)} raster image(s) found, "
            f"{vector_figures_saved} vector figure(s) extracted"
        )

    pdf_document.close()
    print(f"Done. {saved_count} image file(s) saved to {output_path}")
    return extracted_images


def process_pdf(pdf_path, user_id=None):
    pdf_path = Path(pdf_path).resolve()

    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    if pdf_path.suffix.lower() != ".pdf":
        raise ValueError("Selected file must be a PDF.")

    total_start = time.perf_counter()

    raw_text_start = time.perf_counter()
    raw_text_data = extract_raw_text_from_pdf(pdf_path)
    raw_text_time = time.perf_counter() - raw_text_start
    print(f"Raw text extraction time: {raw_text_time:.2f} seconds")

    structured_start = time.perf_counter()
    markdown_document, structured_document = extract_structured_document(
        pdf_path
    )
    structured_time = time.perf_counter() - structured_start
    print(f"Structured document extraction time: {structured_time:.2f} seconds")

    paper_image_directory = IMAGE_OUTPUT_DIRECTORY / pdf_path.stem

    print(f"Saving images to: {paper_image_directory}")

    image_start = time.perf_counter()
    extracted_images = extract_images_from_pdf(
        pdf_path,
        paper_image_directory
    )
    image_time = time.perf_counter() - image_start
    print(f"Image extraction time: {image_time:.2f} seconds")

    database_start = time.perf_counter()

    supabase = connect_to_supabase()

    storage_path = upload_pdf(
        supabase,
        pdf_path
    )

    response = save_document(
        supabase,
        pdf_path.name,
        storage_path,
        raw_text_data,
        structured_document,
        markdown_document,
        user_id,
    )

    document_id = response.data[0]["id"]

    uploaded_images = upload_images(
        supabase,
        paper_image_directory,
        pdf_path.stem,
        extracted_images
    )

    update_document_images(
        supabase,
        document_id,
        uploaded_images
    )

    database_time = time.perf_counter() - database_start
    print(f"Supabase save time: {database_time:.2f} seconds")

    total_time = time.perf_counter() - total_start
    print(f"Total processing time: {total_time:.2f} seconds")

    return response, extracted_images


def parse_and_save_pdf(pdf_path, user_id=None):
    response, _ = process_pdf(pdf_path, user_id=user_id)
    return response.data[0]


def write_local_outputs(pdf_path):
    pdf_path = Path(pdf_path).resolve()

    raw_text_data = extract_raw_text_from_pdf(pdf_path)
    markdown_document, structured_document = extract_structured_document(
        pdf_path
    )

    with open(RAW_TEXT_JSON, "w", encoding="utf-8") as f:
        json.dump(raw_text_data, f, indent=2, ensure_ascii=False)

    with open(MARKDOWN_FILE, "w", encoding="utf-8") as f:
        f.write(markdown_document)

    with open(STRUCTURED_JSON, "w", encoding="utf-8") as f:
        json.dump(structured_document, f, indent=2, ensure_ascii=False)


# Use sys.argv (argument vector) to read arguments passed from the terminal.
# argv[0] is the script name and argv[1] is the single PDF path provided at runtime.
if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Error: Please provide exactly one PDF file.")
        print("Usage: python parser.py <pdf_path>")
        sys.exit(1)

    process_pdf(sys.argv[1])
