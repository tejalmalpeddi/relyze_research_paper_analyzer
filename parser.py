import fitz  # PyMuPDF
import json

PDF_FILE = "physicspaper1.pdf"
OUTPUT_FILE = "output2.json"

doc = fitz.open(PDF_FILE)

data = {
    "file_name": PDF_FILE,
    "page_count": len(doc),
    "pages": []
}

for page_num, page in enumerate(doc, start=1):
    data["pages"].append({
        "page_number": page_num,
        "text": page.get_text("text")
    })

doc.close()

with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Saved raw text to {OUTPUT_FILE}")