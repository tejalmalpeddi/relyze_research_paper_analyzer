import json
import pymupdf
from docling.document_converter import DocumentConverter

PDF_FILE = "physicspaper1.pdf"
RAW_TEXT_OUTPUT = "output_raw.json"
STRUCTURED_OUTPUT = "output_structured.json"
MARKDOWN_OUTPUT = "output_paper.md"


def extract_basic_text(pdf_path):
    doc = pymupdf.open(pdf_path)
    data = {
        "file_name": pdf_path,
        "page_count": len(doc),
        "pages": []
    }
    for page_num, page in enumerate(doc, start=1):
        data["pages"].append({
            "page_number": page_num,
            "text": page.get_text("text")
        })
    doc.close()
    return data


def extract_table_and_layout_data(pdf_path):
    converter = DocumentConverter()
    result = converter.convert(pdf_path)

    markdown_content = result.document.export_to_markdown()
    layout_json = result.document.export_to_dict()

    return markdown_content, layout_json


if __name__ == "__main__":
    # Raw PyMuPDF Text Extraction
    raw_data = extract_basic_text(PDF_FILE)
    with open(RAW_TEXT_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(raw_data, f, indent=2, ensure_ascii=False)

    # Structured Docling Tables/Layout Extraction
    md_text, structured_json = extract_table_and_layout_data(PDF_FILE)

    with open(MARKDOWN_OUTPUT, "w", encoding="utf-8") as f:
        f.write(md_text)

    with open(STRUCTURED_OUTPUT, "w", encoding="utf-8") as f:
        json.dump(structured_json, f, indent=2, ensure_ascii=False)