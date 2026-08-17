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


def save_document(
    supabase,
    file_name,
    raw_text_data,
    structured_document,
    markdown_document,
    user_id=None,
    title=None,
):
    document_data = {
        "file_name": file_name,
        "raw_text": raw_text_data,
        "structured_data": structured_document,
        "markdown_content": markdown_document,
        "status": "processing"
    }
    if user_id is not None:
        document_data["user_id"] = user_id
    if title is not None:
        document_data["title"] = title

    response = (
        supabase
        .table("documents")
        .insert(document_data)
        .execute()
    )

    return response
