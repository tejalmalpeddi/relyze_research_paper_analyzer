import json
import os
import re
from typing import Optional

from app.schemas.background import BackgroundContent

MAX_BACKGROUND_CHARS = 7000
MAX_BACKGROUND_ITEMS = 6
MAX_KEY_TERMS = 12
MAX_IMAGE_ITEMS = 8
SUMMARY_SENTENCE_LIMIT = 2
DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b"
DEFAULT_GROQ_FALLBACK_MODELS = "qwen/qwen3.6-27b"
MAX_KEYWORD_WORDS = 5


def _page_context(pages: list[dict]) -> str:
    return "\n\n".join(
        f"[Page {page.get('page_number', '?')}]\n{page.get('text', '')}"
        for page in sorted(pages, key=lambda page: page.get("page_number", 0))
    )[:MAX_BACKGROUND_CHARS]


def _subcategory_context(subcategories: list) -> list[dict]:
    return [
        {
            "name": sub.name,
            "category": sub.category,
            "summary": sub.content.intermediate,
            "sourcePage": sub.sourcePage,
            "relatedTerms": sub.relatedTerms,
            "prerequisites": {
                "beginner": sub.prerequisites.beginner,
                "intermediate": sub.prerequisites.intermediate,
                "advanced": sub.prerequisites.advanced,
            },
        }
        for sub in subcategories
    ]


def _dedupe(items: list[str]) -> list[str]:
    seen = set()
    unique_items = []
    for item in items:
        normalized = item.strip()
        key = normalized.lower()
        if normalized and key not in seen:
            unique_items.append(normalized)
            seen.add(key)
    return unique_items


def _term_key(value: str) -> str:
    return " ".join(value.lower().replace("-", " ").replace("_", " ").split())


def _clean_keyword_term(value) -> str:
    term = _clean_string(value)
    term = re.sub(r"\s+", " ", term).strip(" -*•:;,.()[]{}")
    words = re.findall(r"[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)?", term)
    lower = term.lower()
    first_word = words[0].lower() if words else ""
    last_word = words[-1].lower() if words else ""

    if (
        not term
        or len(words) == 0
        or len(words) > MAX_KEYWORD_WORDS
        or "@" in term
        or re.search(r"https?://|www\.", term, flags=re.IGNORECASE)
        or re.search(r"\w+-\s+\w+", term)
        or any(mark in term for mark in (".", "?", "!"))
        or "nlp analysis" in lower
        or (len(words) > 2 and first_word in {"a", "an", "the", "this", "that"})
        or last_word in {"is", "are", "was", "were", "has", "have", "ensures", "includes", "shows"}
    ):
        return ""

    return term.title()


def _clean_keyword_summary(value: str) -> str:
    summary = _clean_string(value)
    lower = summary.lower()
    if "nlp analysis" in lower or "key concept surfaced" in lower:
        return ""
    return summary


def _keyword_items_from_subcategories(subcategories: list, excluded_terms: Optional[set[str]] = None) -> list[dict]:
    keywords = []
    seen = set()
    excluded_terms = excluded_terms or set()

    important_subcategories = sorted(
        subcategories,
        key=lambda sub: sub.importance,
        reverse=True,
    )

    for sub in important_subcategories:
        term = _clean_keyword_term(getattr(sub, "name", ""))
        summary = _clean_keyword_summary(
            getattr(sub.content, "intermediate", "")
            or getattr(sub.content, "beginner", "")
            or getattr(sub.content, "advanced", "")
        )
        key = _term_key(term)

        if term and summary and key not in seen and key not in excluded_terms:
            keywords.append(_summary_item(term, summary, "term"))
            seen.add(key)

        if len(keywords) >= MAX_KEY_TERMS:
            break

    return keywords


def _subcategory_names(subcategories: list) -> set[str]:
    return {
        _term_key(sub.name)
        for sub in subcategories
        if _clean_string(getattr(sub, "name", ""))
    }


def _exclude_terms(items: list[str], excluded_terms: set[str]) -> list[str]:
    return [
        term
        for item in items
        if (term := _clean_keyword_term(item)) and _term_key(term) not in excluded_terms
    ]


def _summary_item(title: str, summary: str, title_key: str) -> dict:
    if title_key == "term":
        title = _clean_keyword_term(title)

    return {
        title_key: title.strip(),
        "summary": _clean_keyword_summary(summary).strip(),
    }


def _image_title(image: dict, index: int) -> str:
    return (
        _clean_string(image.get("file_name"))
        or _clean_string(image.get("storage_path"))
        or f"Image {index + 1}"
    )


def _image_context(images: list[dict]) -> list[dict]:
    return [
        {
            "file_name": image.get("file_name"),
            "storage_path": image.get("storage_path"),
            "page_number": image.get("page_number"),
            "image_type": image.get("image_type"),
        }
        for image in (images or [])[:MAX_IMAGE_ITEMS]
        if isinstance(image, dict)
    ]


def _image_summary_item(image: dict, summary: str, index: int) -> dict:
    return {
        "file_name": image.get("file_name"),
        "storage_path": image.get("storage_path"),
        "page_number": image.get("page_number"),
        "image_type": image.get("image_type"),
        "summary": summary.strip()
        or (
            f"{_image_title(image, index)} is an extracted visual from this paper. "
            "Use its page and file metadata to review the figure alongside the text."
        ),
    }


def _clean_string(value) -> str:
    return value.strip() if isinstance(value, str) else ""


def _prerequisite_terms(subcategories: list) -> list[str]:
    terms = []
    for sub in subcategories:
        terms.extend(sub.relatedTerms)
        terms.extend(sub.prerequisites.beginner)
        terms.extend(sub.prerequisites.intermediate)
    return _dedupe(terms)


def _fallback_background(
    file_name: str,
    subcategories: list,
    nlp_data: dict,
    images: Optional[list[dict]] = None,
) -> dict:
    important_subcategories = sorted(
        subcategories,
        key=lambda sub: sub.importance,
        reverse=True,
    )[:5]

    content = {
        "title": (
            file_name.replace(".pdf", "").replace("-", " ").replace("_", " ").title()
        ),
        "keywords": _keyword_items_from_subcategories(
            subcategories,
            {_term_key(file_name.replace(".pdf", "").replace("-", " ").replace("_", " "))},
        ),
        "related_info": [
            _summary_item(sub.name, sub.content.intermediate, "title")
            for sub in important_subcategories
        ],
        "images": [
            _image_summary_item(image, "", index)
            for index, image in enumerate(_image_context(images or []))
        ],
        "source_pages": sorted(
            {sub.sourcePage for sub in important_subcategories if sub.sourcePage is not None}
        ),
    }
    return BackgroundContent(**content).model_dump()


def _normalize_summary_items(items, title_key: str) -> list[dict]:
    normalized = []
    seen = set()

    for item in items or []:
        if isinstance(item, str):
            title = item.strip()
            summary = ""
        elif isinstance(item, dict):
            title = _clean_string(
                item.get(title_key)
                or item.get("term")
                or item.get("title")
                or item.get("name")
                or ""
            )
            summary = _clean_string(
                item.get("summary") or item.get("description") or ""
            )
        else:
            continue

        if title_key == "term":
            title = _clean_keyword_term(title)

        key = title.lower()
        if title and key not in seen:
            normalized.append(_summary_item(title, summary, title_key))
            seen.add(key)

    return normalized


def _normalize_image_items(items, source_images: list[dict]) -> list[dict]:
    source_lookup = {}
    for index, image in enumerate(_image_context(source_images)):
        for key in (
            _clean_string(image.get("storage_path")),
            _clean_string(image.get("file_name")),
            str(image.get("page_number") or ""),
        ):
            if key:
                source_lookup[key.lower()] = (index, image)

    normalized = []
    seen = set()

    for index, item in enumerate(items or []):
        if isinstance(item, str):
            candidate = {"summary": item}
        elif isinstance(item, dict):
            candidate = item
        else:
            continue

        summary = _clean_string(candidate.get("summary") or candidate.get("description"))
        match_keys = [
            _clean_string(candidate.get("storage_path")),
            _clean_string(candidate.get("file_name")),
            str(candidate.get("page_number") or ""),
        ]
        source_index = index
        source_image = {
            "file_name": candidate.get("file_name"),
            "storage_path": candidate.get("storage_path"),
            "page_number": candidate.get("page_number"),
            "image_type": candidate.get("image_type"),
        }

        for key in match_keys:
            match = source_lookup.get(key.lower()) if key else None
            if match is not None:
                source_index, source_image = match
                break

        identifier = (
            _clean_string(source_image.get("storage_path"))
            or _clean_string(source_image.get("file_name"))
            or str(source_image.get("page_number") or source_index)
        ).lower()
        if identifier in seen:
            continue

        normalized.append(_image_summary_item(source_image, summary, source_index))
        seen.add(identifier)

    if normalized:
        return normalized[:MAX_IMAGE_ITEMS]

    return [
        _image_summary_item(image, "", index)
        for index, image in enumerate(_image_context(source_images))
    ]


def _normalize_background_content(
    content: dict,
    file_name: str,
    source_images: Optional[list[dict]] = None,
    excluded_keyword_terms: Optional[set[str]] = None,
) -> dict:
    if not isinstance(content, dict):
        return _fallback_background(file_name, [], {}, source_images)

    excluded_keyword_terms = excluded_keyword_terms or set()
    keywords = [
        keyword
        for keyword in _normalize_summary_items(content.get("keywords"), "term")
        if _term_key(keyword["term"]) not in excluded_keyword_terms
    ][:MAX_KEY_TERMS]
    related_info = _normalize_summary_items(
        content.get("related_info") or content.get("related_information"),
        "title",
    )[:MAX_BACKGROUND_ITEMS]

    normalized = {
        "title": content.get("title")
        or file_name.replace(".pdf", "").replace("-", " ").replace("_", " ").title(),
        "keywords": keywords,
        "related_info": related_info,
        "images": _normalize_image_items(content.get("images"), source_images or []),
        "source_pages": content.get("source_pages") or [],
    }
    return BackgroundContent(**normalized).model_dump()


def _groq_models_to_try() -> list[str]:
    model_names = [
        os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL),
        *os.getenv("GROQ_FALLBACK_MODELS", DEFAULT_GROQ_FALLBACK_MODELS).split(","),
    ]

    models = []
    seen = set()
    for model_name in model_names:
        normalized = model_name.strip()
        if normalized and normalized not in seen:
            models.append(normalized)
            seen.add(normalized)
    return models


def generate_background_content(
    file_name: str,
    pages: list[dict],
    subcategories: list,
    nlp_data: dict,
    images: Optional[list[dict]] = None,
) -> dict:
    if not os.getenv("GROQ_API_KEY"):
        return _fallback_background(file_name, subcategories, nlp_data, images)

    try:
        from groq import Groq

        excluded_keyword_terms = set()
        client = Groq(api_key=os.getenv("GROQ_API_KEY"))
        messages = [
            {
                "role": "system",
                "content": (
                    "Generate reader-prep background content for a research paper. "
                    "Use only the supplied paper text, NLP terms, and limited mind-map context. "
                    "The keywords list must be a separate vocabulary analysis, not a copy "
                    "of the mind map. Choose important technical terms, methods, variables, "
                    "datasets, named entities, metrics, or domain jargon that appear in the "
                    "paper text and help a reader understand the paper. "
                    "Each keyword term must be 1-5 words with each word capitalized, and look "
                    "like a true key term, not a sentence or long phrase. "
                    "Prefer specific mind-map concept names and related technical terms. "
                    "Do not include emails, URLs, author/contact text, or "
                    "internal labels such as NLP analysis. "
                    "Never mention NLP analysis in keyword summaries. "
                    "Do not use any excluded keyword terms, and do not use broad section or "
                    "topic titles as keywords. Use mind_map_topics only to avoid repetition "
                    "and to inform related_info. "
                    "Do not summarize the whole paper or add unsupported outside facts. "
                    "Return valid JSON with exactly these keys: title, keywords, "
                    "related_info, images, source_pages. "
                    "keywords must be an array of objects with exactly: "
                    "term and summary. related_info must be an array of objects "
                    "with exactly: title and summary. images must be an array "
                    "of objects with exactly: file_name, storage_path, "
                    "page_number, image_type, and summary. Every summary must be brief, "
                    f"no more than {SUMMARY_SENTENCE_LIMIT} sentences. "
                    "Return ONLY valid JSON, no markdown fences or commentary."
                ),
            },
            {
                "role": "user",
                "content": json.dumps(
                    {
                        "file_name": file_name,
                        "paper_text": _page_context(pages),
                        "mind_map_topics": _subcategory_context(subcategories),
                        "excluded_keyword_terms": sorted(excluded_keyword_terms),
                        "candidate_keywords_from_nlp": _exclude_terms(
                            nlp_data.get("all_key_terms", [])[:40],
                            excluded_keyword_terms,
                        )[:20],
                        "images": _image_context(images or []),
                        "domain": nlp_data.get("domain"),
                    }
                ),
            },
        ]

        last_error = None
        for model_name in _groq_models_to_try():
            try:
                response = client.chat.completions.create(
                    model=model_name,
                    messages=messages,
                    response_format={"type": "json_object"},
                    temperature=0.2,
                    max_tokens=1200,
                )
                break
            except Exception as error:
                last_error = error
        else:
            raise last_error or RuntimeError("No Groq models configured.")

        raw_text = response.choices[0].message.content.strip()
        if raw_text.startswith("```"):
            parts = raw_text.split("```")
            raw_text = parts[1]
            if raw_text.startswith("json"):
                raw_text = raw_text[4:]
            raw_text = raw_text.strip()

        normalized = _normalize_background_content(
            json.loads(raw_text),
            file_name,
            images,
            excluded_keyword_terms,
        )
        normalized["keywords"] = _keyword_items_from_subcategories(
            subcategories,
            {_term_key(file_name.replace(".pdf", "").replace("-", " ").replace("_", " "))},
        )
        if not normalized.get("keywords"):
            return _fallback_background(file_name, subcategories, nlp_data, images)
        return normalized
    except Exception:
        return _fallback_background(file_name, subcategories, nlp_data, images)
