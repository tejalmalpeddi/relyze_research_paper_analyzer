"""
Handles LLM API communication via Groq.
Only called when GROQ_API_KEY is set. Requires: pip install groq
"""

import json
import os

# Cap text sent to the model: enough to cover abstract through conclusion, avoids slow responses.
MAX_LLM_CHARS = 8000

SYSTEM_PROMPT = """
You are a research paper analysis assistant. Given a text excerpt from a
research paper, extract key concept-map subcategories that capture the
important ideas, methods, datasets, and findings.

Return a JSON array of objects. Each object must have exactly these fields:
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
Return ONLY valid JSON (the array itself), no markdown fences, no commentary.
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


def generate_with_llm(pages: list[dict]) -> list[dict]:
    """Send paper text to Groq, return raw subcategory dicts for the caller to validate."""
    client = _get_groq_client()

    # Label each page so the model can cite sourcePage numbers accurately
    page_context = "\n\n".join(
        f"[Page {p['page_number']}]\n{p['text']}"
        for p in sorted(pages, key=lambda p: p["page_number"])
    )

    page_context = page_context[:MAX_LLM_CHARS]

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Paper text:\n\n{page_context}"},
        ],
        temperature=0.2,  # low = more consistent output
        max_tokens=3000,
    )

    raw_text = response.choices[0].message.content.strip()

    # GPT sometimes wraps JSON in ```code fences``` even when asked not to, so this code strips them.
    if raw_text.startswith("```"):
        parts = raw_text.split("```")
        raw_text = parts[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
        raw_text = raw_text.strip()

    # Parse the JSON string into a Python list of dicts and return it
    return json.loads(raw_text)
