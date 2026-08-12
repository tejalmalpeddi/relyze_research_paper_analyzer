import os

from dotenv import load_dotenv
from supabase import create_client


def connect_to_supabase():
    load_dotenv()

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")

    return create_client(
        supabase_url,
        supabase_key
    )


def upload_pdf(supabase, pdf_path):
    storage_path = pdf_path.name

    with open(pdf_path, "rb") as pdf_file:
        supabase.storage.from_("papers").upload(
            path=storage_path,
            file=pdf_file,
            file_options={
                "content-type": "application/pdf",
                "upsert": "true"
            }
        )

    return storage_path


def save_document(
    supabase,
    file_name,
    storage_path,
    raw_text_data,
    structured_document,
    markdown_document
):
    document_data = {
        "file_name": file_name,
        "storage_path": storage_path,
        "raw_text": raw_text_data,
        "structured_data": structured_document,
        "markdown_content": markdown_document,
        "status": "completed"
    }

    response = (
        supabase
        .table("documents")
        .insert(document_data)
        .execute()
    )

    return response

# Upload extracted images to the Supabase images bucket and return their storage metadata
def upload_images(
    supabase,
    image_directory,
    paper_name,
    extracted_images
):
    uploaded_images = []

    for image in extracted_images:
        local_path = image_directory / image["file_name"]

        storage_path = (
            f"{paper_name}/{image['file_name']}"
        )

        with open(local_path, "rb") as image_file:
            supabase.storage.from_("images").upload(
                path=storage_path,
                file=image_file,
                file_options={
                    "content-type": "image/png",
                    "upsert": "true"
                }
            )

        uploaded_images.append({
            "page_number": image["page_number"],
            "image_type": image["image_type"],
            "file_name": image["file_name"],
            "storage_path": storage_path
        })

    return uploaded_images


# Update the document row with metadata for its uploaded images
def update_document_images(
    supabase,
    document_id,
    uploaded_images
):
    response = (
        supabase
        .table("documents")
        .update({
            "images": uploaded_images
        })
        .eq("id", document_id)
        .execute()
    )

    return response

