import json
from pathlib import Path
import os
from typing import Optional
os.environ["PYTORCH_ENABLE_MPS_FALLBACK"] = "1"

import pymupdf
from docling.document_converter import DocumentConverter

from database import connect_to_supabase, save_document

# Base directory (parser/)
PARSER_DIRECTORY = Path(__file__).resolve().parent

# Input / Output files
PDF_INPUT_FILE = PARSER_DIRECTORY / "physicspaper1.pdf"

RAW_TEXT_JSON = PARSER_DIRECTORY / "output_raw.json"
STRUCTURED_JSON = PARSER_DIRECTORY / "output_structured.json"
MARKDOWN_FILE = PARSER_DIRECTORY / "output_paper.md"

IMAGE_OUTPUT_DIRECTORY = PARSER_DIRECTORY / "assets"




def _strip_null_bytes(value):
    """
    Postgres refuses to store the \\u0000 (null) character in text/json
    columns -- some PDFs (scanned pages, damaged fonts, odd encodings)
    produce it in their extracted text, which otherwise makes the
    documents.insert() in save_document() fail after all the parsing work
    is done. Recurses through the raw-text/structured-document dicts and
    the markdown string so no null byte reaches the database call.
    """
    if isinstance(value, str):
        return value.replace("\x00", "")
    if isinstance(value, dict):
        return {key: _strip_null_bytes(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_strip_null_bytes(item) for item in value]
    return value


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


def extract_title(document) -> Optional[str]:
    """
    Best-effort real paper title, read off Docling's own layout detection
    rather than the filename. In standard academic PDF layout the title is
    the first section-header-labeled text block on the page (it sits above
    the author line, which layout detection also tags as a section header,
    so "first one" is what distinguishes it). Returns None if the document
    has no section headers at all (e.g. a scanned PDF with no layout info),
    letting the caller fall back to a filename-derived title instead.
    """
    for text_item in document.texts:
        label = getattr(text_item, "label", None)
        if label is not None and getattr(label, "value", None) == "section_header":
            title = text_item.text.strip()
            if title:
                return title
    return None


def extract_structured_document(pdf_path):
    from docling.datamodel.pipeline_options import PdfPipelineOptions, AcceleratorOptions, AcceleratorDevice
    from docling.datamodel.base_models import InputFormat
    from docling.document_converter import PdfFormatOption


    pipeline_options = PdfPipelineOptions()
    pipeline_options.accelerator_options = AcceleratorOptions(
        num_threads=4,
        device=AcceleratorDevice.CPU
    )

    document_converter = DocumentConverter(
        format_options={
            InputFormat.PDF: PdfFormatOption(
                pipeline_options=pipeline_options
            )
        }
    )

    conversion_result = document_converter.convert(pdf_path)

    markdown_document = conversion_result.document.export_to_markdown()
    structured_document = conversion_result.document.export_to_dict()
    title = extract_title(conversion_result.document)

    return markdown_document, structured_document, title


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


def _rect_area(rect) -> float:
    get_area = getattr(rect, "get_area", None)
    if callable(get_area):
        return get_area()
    return max(0, rect.x1 - rect.x0) * max(0, rect.y1 - rect.y0)


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

            # Track raster placement so we don't duplicate it as a "vector figure"
            for rect in pdf_page.get_image_rects(image_xref):
                page_raster_rects.append(rect)

        # --- 2. Vector-drawn figures (no embedded bitmap) ---
        drawings = pdf_page.get_drawings()
        vector_figures_saved = 0

        if drawings:
            drawing_rects = [d["rect"] for d in drawings if _rect_area(d["rect"]) > 0]
            clusters = _cluster_rects(drawing_rects, pad=15)

            for cluster in clusters:
                if _rect_area(cluster) < min_area:
                    continue

                paths_in_cluster = sum(1 for r in drawing_rects if cluster.contains(r))
                if paths_in_cluster < min_paths:
                    continue

                if any(
                    cluster.intersects(r)
                    and _rect_area(cluster & r) > 0.8 * _rect_area(cluster)
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

        print(
            f"Page {page_number}: {len(page_images)} raster image(s) found, "
            f"{vector_figures_saved} vector figure(s) extracted"
        )

    pdf_document.close()
    print(f"Done. {saved_count} image file(s) saved to {output_path}")


def _image_type_from_name(file_name: str) -> str:
    if "_vector_" in file_name:
        return "vector"
    if "_raster_" in file_name:
        return "raster"
    return "image"


def _page_number_from_name(file_name: str) -> Optional[int]:
    parts = file_name.split("_")
    if len(parts) < 2 or parts[0] != "page":
        return None

    try:
        return int(parts[1])
    except ValueError:
        return None


def _image_metadata(output_directory: Path, document_id: str) -> list[dict]:
    document_directory = output_directory / document_id
    if not document_directory.exists():
        return []

    images = []
    for image_path in sorted(document_directory.iterdir()):
        if not image_path.is_file():
            continue

        images.append(
            {
                "file_name": image_path.name,
                "storage_path": f"/assets/{document_id}/{image_path.name}",
                "page_number": _page_number_from_name(image_path.name),
                "image_type": _image_type_from_name(image_path.name),
            }
        )
    return images


def parse_and_save_pdf(pdf_path, user_id=None, file_name=None):
    pdf_path = Path(pdf_path)
    stored_file_name = file_name or pdf_path.name

    raw_text_data = _strip_null_bytes(extract_raw_text_from_pdf(pdf_path))
    markdown_document, structured_document, extracted_title = extract_structured_document(pdf_path)
    markdown_document = _strip_null_bytes(markdown_document)
    structured_document = _strip_null_bytes(structured_document)
    extracted_title = _strip_null_bytes(extracted_title) if extracted_title else extracted_title

    title = extracted_title or Path(stored_file_name).stem.replace("_", " ").replace("-", " ").title()

    supabase = connect_to_supabase()
    response = save_document(
        supabase,
        stored_file_name,
        raw_text_data,
        structured_document,
        markdown_document,
        user_id,
        title,
    )

    document = response.data[0]
    document_id = document["id"]
    document_image_directory = IMAGE_OUTPUT_DIRECTORY / document_id
    extract_images_from_pdf(pdf_path, document_image_directory)
    images = _image_metadata(IMAGE_OUTPUT_DIRECTORY, document_id)

    if images:
        update_response = (
            supabase.table("documents")
            .update({"images": images})
            .eq("id", document_id)
            .execute()
        )
        if update_response.data:
            document = update_response.data[0]

    return document


if __name__ == "__main__":
    # Extract plain text using PyMuPDF
    raw_text_data = extract_raw_text_from_pdf(PDF_INPUT_FILE)

    with open(RAW_TEXT_JSON, "w", encoding="utf-8") as f:
        json.dump(raw_text_data, f, indent=2, ensure_ascii=False)

    # Extract structured document using Docling
    markdown_document, structured_document, extracted_title = extract_structured_document(
        PDF_INPUT_FILE
    )

    with open(MARKDOWN_FILE, "w", encoding="utf-8") as f:
        f.write(markdown_document)

    with open(STRUCTURED_JSON, "w", encoding="utf-8") as f:
        json.dump(structured_document, f, indent=2, ensure_ascii=False)

    # Extract images (raster + vector-drawn figures) into parser/assets
    print(f"Saving images to: {IMAGE_OUTPUT_DIRECTORY}")

    extract_images_from_pdf(
        PDF_INPUT_FILE,
        IMAGE_OUTPUT_DIRECTORY
    )

    # Save parsed document to Supabase
    supabase = connect_to_supabase()

    response = save_document(
        supabase,
        PDF_INPUT_FILE.name,
        raw_text_data,
        structured_document,
        markdown_document,
        title=extracted_title or PDF_INPUT_FILE.stem.replace("_", " ").replace("-", " ").title(),
    )

    print(response.data)
