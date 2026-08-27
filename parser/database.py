import os
import re

from dotenv import load_dotenv
from supabase import create_client


# Removes "<!-- image -->" line wherever it detects a figure
_IMAGE_PLACEHOLDER_LINE = re.compile(r"^[ \t]*<!--[ \t]*image[ \t]*-->[ \t]*\n?", re.MULTILINE)

# Collapses 3+ newlines down to a single blank line between paragraphs.
_EXCESS_BLANK_LINES = re.compile(r"\n{3,}")

# PDF fonts often encode common letter pairs as a single ligature
# glyph, but renders as a missing-glyph box
_LIGATURE_MAP = {
    "ﬀ": "ff",
    "ﬁ": "fi",
    "ﬂ": "fl",
    "ﬃ": "ffi",
    "ﬄ": "ffl",
    "ﬅ": "st",
    "ﬆ": "st",
}

# Unicode spaces normalized to a regular space
_WHITESPACE_MAP = {
    " ": " ",
    " ": " ",
    " ": " ",
    " ": " ",
    " ": " ",
    " ": " ",
    " ": " ",
    " ": " ",
    " ": " ",
    " ": " ",
    " ": " ",
    " ": " ",
    " ": " ",
    " ": " ",
    "　": " ",
    "​": "",
    "﻿": "",
}

_CHAR_TRANSLATE_TABLE = str.maketrans({**_LIGATURE_MAP, **_WHITESPACE_MAP})


def clean_markdown_artifacts(markdown_text: str) -> str:
    """
    Operates on the plain markdown string & no dict/list recursion needed here since
    markdown_content is always a str, never a nested structure.
    """
    without_placeholders = _IMAGE_PLACEHOLDER_LINE.sub("", markdown_text)
    without_excess_blank_lines = _EXCESS_BLANK_LINES.sub("\n\n", without_placeholders)
    return without_excess_blank_lines.translate(_CHAR_TRANSLATE_TABLE)


def _strip_null_bytes(value):
    """
    Recursively remove NUL characters (\\u0000) from strings.
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


def create_pending_document(supabase, file_name, user_id=None, title=None):
    """
    Inserts a document row before the PDF has actually been parsed, so the
    caller gets an id back immediately and can hand it to the frontend for
    status polling while the (slow) docling parse runs in the background.
    "processing" is reused as the pending status rather than adding a new
    value -- the documents table has a check constraint on `status` that
    only allows the pipeline's existing set of values.
    """
    document_data = _strip_null_bytes({
        "file_name": file_name,
        "status": "processing",
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

    return response.data[0]


def update_parsed_document(
    supabase,
    document_id,
    raw_text_data,
    structured_document,
    markdown_document,
    title=None,
):
    """
    Fills in the heavy parsed content on a document row created earlier by
    create_pending_document(), once the docling parse actually finishes.
    """
    update_payload = _strip_null_bytes({
        "raw_text": raw_text_data,
        "structured_data": structured_document,
        "markdown_content": markdown_document,
    })
    if title is not None:
        update_payload["title"] = _strip_null_bytes(title)

    response = (
        supabase
        .table("documents")
        .update(update_payload)
        .eq("id", document_id)
        .execute()
    )

    if not response.data:
        raise ValueError(f"Document {document_id} could not be updated")

    return response.data[0]
