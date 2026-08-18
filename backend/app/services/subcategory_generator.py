"""
Main service: the router calls generate_subcategories() here.
Tries the OpenAI path first; falls back to a placeholder if anything fails.
"""

import logging
import os
import uuid
from pathlib import Path
import re

from app.schemas.subcategories import SubcategoryItem, SubcategoryResponse, ContentLevels, PrerequisiteLevels

logger = logging.getLogger(__name__)



def _derive_title(file_name: str) -> str:
    """Turn 'attention-is-all-you-need.pdf' → 'Attention Is All You Need'."""
    stem = Path(file_name).stem
    stem = re.sub(r"[_\-]+", " ", stem)
    return stem.title()


def _fallback_placeholder(pages: list[dict]) -> list[SubcategoryItem]:
    """Returns a placeholder node when the LLM path fails or is not configured."""
    snippet = pages[0]["text"][:150] if pages else "No text available."
    return [
        SubcategoryItem(
            id="sub_1",
            name="Document Overview",
            category="Background",
            content=ContentLevels(
                beginner="The AI concept-map generator could not produce valid structured output for this import, so this placeholder keeps the paper available.",
                intermediate="The LLM request ran, but its response could not be parsed into the required concept-map JSON shape. Re-import the paper or check the backend log for the exact parsing error.",
                advanced="The subcategory generator fell back because the LLM response failed schema or JSON parsing. The import still completed, but the generated map uses this placeholder until valid structured output is produced.",
            ),
            sourcePage=1,
            sourceSnippet=snippet,
            relatedTerms=[],
            prerequisites=PrerequisiteLevels(),
            importance=3,
        )
    ]

# Main function (what the router calls)
def generate_subcategories(parser_output: dict) -> SubcategoryResponse:
    """
    Tries the LLM path first. If anything goes wrong, returns a single placeholder node so the frontend never crashes.
    """
    file_name = parser_output.get("file_name", "unknown.pdf")
    pages = parser_output.get("pages", [])

    # Same filename always produces the same paperId (deterministic)
    paper_id = str(uuid.uuid5(uuid.NAMESPACE_URL, file_name))

    subcategories: list[SubcategoryItem] = []

    # Try the LLM path if the API key is set
    if os.getenv("GROQ_API_KEY"):
        try:
            from app.services.llm_subcategory_generator import generate_with_llm
            from app.schemas.subcategories import SubcategoryItem as SI

            logger.info("GROQ_API_KEY found — attempting LLM subcategory extraction.")
            raw_items = generate_with_llm(pages)

            for idx, raw in enumerate(raw_items, start=1):
                try:
                    raw["id"] = f"sub_{idx}"  # the LLM doesn't produce this field, so we add it
                    subcategories.append(SI(**raw))
                except Exception as validation_err:
                    logger.warning("Skipping invalid LLM item #%d: %s", idx, validation_err)

            if subcategories:
                logger.info("LLM path succeeded — %d subcategories extracted.", len(subcategories))
            else:
                logger.warning("LLM returned no valid items.")

        except Exception as llm_err:
            # Catches everything: no package, bad key, network error, malformed JSON, etc.
            logger.warning("LLM path failed (%s). Returning placeholder.", llm_err)

    # Fall back to placeholder if the LLM gave us nothing
    if not subcategories:
        subcategories = _fallback_placeholder(pages)

    return SubcategoryResponse(
        paperId=paper_id,
        title=_derive_title(file_name),
        sourceFile=file_name,
        subcategories=subcategories,
        totalCount=len(subcategories),
    )
