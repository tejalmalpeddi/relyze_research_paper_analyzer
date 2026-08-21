import os

from dotenv import load_dotenv
from supabase import create_client


def _strip_null_bytes(value):
    """
    Recursively remove NUL characters (\\u0000) from strings.

    PDFs occasionally contain NUL bytes in their text streams (bad fonts,
    corrupt encodings, etc.), which PyMuPDF/Docling will happily extract.
    Postgres text/jsonb columns cannot store NUL bytes at all ('unsupported
    Unicode escape sequence', code 22P05), so anything headed for Supabase
    has to be scrubbed first.
    """
    if isinstance(value, str):
        return value.replace("\x00", "")
    if isinstance(value, dict):
        return {key: _strip_null_bytes(val) for key, val in value.items()}
    if isinstance(value, list):
        return [_strip_null_bytes(item) for item in value]
    return value


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
    document_data = _strip_null_bytes({
        "file_name": file_name,
        "raw_text": raw_text_data,
        "structured_data": structured_document,
        "markdown_content": markdown_document,
        "status": "processing"
    })
    if user_id is not None:
        document_data["user_id"] = user_id
    if title is not None:
        document_data["title"] = _strip_null_bytes(title)

    response = (
        supabase
        .table("documents")
        .insert(document_data)
        .execute()
    )

    return response
