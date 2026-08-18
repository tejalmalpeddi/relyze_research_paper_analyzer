"""
Handles LLM API communication via Groq.
Only called when GROQ_API_KEY is set. Requires: pip install groq
"""

import json
import os
import re

# Cap text sent to the model: enough to cover abstract through conclusion, avoids slow responses.
MAX_LLM_CHARS = 8000
DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b"
DEFAULT_GROQ_FALLBACK_MODELS = "qwen/qwen3.6-27b"

SYSTEM_PROMPT = """
You are a research paper analysis assistant. Given a text excerpt from a
research paper, extract key concept-map subcategories that capture the
important ideas, methods, datasets, and findings.

Return a JSON object with exactly one key, "subcategories".
"subcategories" must be a JSON array of objects. Each object must have exactly these fields:
- name           : string, concise concept name (2–6 words)
- category       : one of exactly: "Problem", "Background", "Method",
                   "Architecture", "Dataset", "Experiment", "Result",
                   "Limitation", "Future Work", "Key Term"
- content           : object with exactly three keys:
    - beginner      : 1-2 sentence explanation using simple language, 
                      no jargon, analogies welcome
    - intermediate  : 2-3 sentence explanation assuming general literacy
                      but not domain expertise  
    - advanced      : 2-3 sentence precise technical explanation using
                      domain terminology and specifics
- sourcePage     : integer, page number where this concept appears
- sourceSnippet  : string, brief verbatim or near-verbatim excerpt (≤150 chars)
- relatedTerms   : array of 2–4 related technical term strings
- prerequisites     : object with exactly three keys:
    - beginner      : array of 0-2 basic prerequisite concepts
    - intermediate  : array of 0-3 prerequisite concepts
    - advanced      : array of 0-4 prerequisite concepts
- importance     : integer 1–5 (5 = most central to the paper)

Return 8–15 subcategories that best represent the paper's concept map.
Return ONLY valid JSON, no markdown fences, no commentary.
""".strip()


def _get_groq_client():
    """
    Returns a Groq client using the groq package (already in requirements.txt).
    Imported lazily so the server starts even if the package isn't installed.
    """
    try:
        from groq import Groq
    except ImportError:
        raise RuntimeError(
            "The 'groq' package is not installed. "
            "Run: pip install groq"
        )

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise RuntimeError("GROQ_API_KEY environment variable is not set.")

    return Groq(api_key=api_key)


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


def _strip_code_fences(raw_text: str) -> str:
    text = raw_text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1]
        if text.startswith("json"):
            text = text[4:]
    return text.strip()


def _extract_json(raw_text: str) -> str:
    text = _strip_code_fences(raw_text)
    object_start = text.find("{")
    object_end = text.rfind("}")
    array_start = text.find("[")
    array_end = text.rfind("]")

    if object_start != -1 and object_end != -1 and object_end > object_start:
        return text[object_start : object_end + 1]

    start = array_start
    end = array_end
    if start == -1 or end == -1 or end <= start:
        return text
    return text[start : end + 1]


def _remove_trailing_commas(json_text: str) -> str:
    return re.sub(r",\s*([}\]])", r"\1", json_text)


def _parse_json_array(raw_text: str) -> list[dict]:
    json_text = _extract_json(raw_text)
    try:
        parsed = json.loads(json_text)
    except json.JSONDecodeError:
        parsed = json.loads(_remove_trailing_commas(json_text))

    if isinstance(parsed, dict):
        parsed = parsed.get("subcategories")

    if not isinstance(parsed, list):
        raise ValueError("LLM response JSON must include a subcategories array.")
    return parsed


def generate_with_llm(pages: list[dict]) -> list[dict]:
    """Send paper text to Groq, return raw subcategory dicts for the caller to validate."""
    client = _get_groq_client()

    # Label each page so the model can cite sourcePage numbers accurately
    page_context = "\n\n".join(
        f"[Page {p['page_number']}]\n{p['text']}"
        for p in sorted(pages, key=lambda p: p["page_number"])
    )

    page_context = page_context[:MAX_LLM_CHARS]

    last_error = None
    for model_name in _groq_models_to_try():
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": f"Paper text:\n\n{page_context}"},
                ],
                response_format={"type": "json_object"},
                temperature=0.2,  # low = more consistent output
                max_tokens=3000,
            )
            break
        except Exception as error:
            last_error = error
    else:
        raise last_error or RuntimeError("No Groq models configured.")

    raw_text = response.choices[0].message.content.strip()
    return _parse_json_array(raw_text)
