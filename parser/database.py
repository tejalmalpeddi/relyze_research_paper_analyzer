import mimetypes
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
    markdown_document,
    user_id=None,
):
    document_data = {
        "file_name": file_name,
        "title": file_name,
        "storage_path": storage_path,
        "raw_text": raw_text_data,
        "structured_data": structured_document,
        "markdown_content": markdown_document,
        "filters": [],
        "status": "processing"
    }

    if user_id is not None:
        document_data["user_id"] = user_id

    response = (
        supabase
        .table("documents")
        .insert(document_data)
        .execute()
    )

    return response


def upload_images(
    supabase,
    image_directory,
    paper_name,
    extracted_images
):
    uploaded_images = []

    for image in extracted_images:
        local_path = image_directory / image["file_name"]
        content_type = (
            mimetypes.guess_type(local_path.name)[0]
            or "application/octet-stream"
        )

        storage_path = (
            f"{paper_name}/{image['file_name']}"
        )

        with open(local_path, "rb") as image_file:
            supabase.storage.from_("images").upload(
                path=storage_path,
                file=image_file,
                file_options={
                    "content-type": content_type,
                    "upsert": "true"
                }
            )

        uploaded_images.append({
            "page_number": image["page_number"],
            "image_type": image["image_type"],
            "file_name": image["file_name"],
            "storage_path": storage_path,
            "content_type": content_type
        })

    return uploaded_images


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
