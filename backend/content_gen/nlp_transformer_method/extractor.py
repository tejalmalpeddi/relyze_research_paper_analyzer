"""
pulls entities, key terms, and params from each chunk.
"""

import re
import spacy

try:
    _nlp = spacy.load("en_core_web_sm")
except OSError:
    raise OSError("Run: python -m spacy download en_core_web_sm")

PARAM_PATTERNS = [
    r"(\d+(?:\.\d+)?)\s*(°C|°F|ms|sec|min|hours?|days?|weeks?|"
    r"months?|years?|km|m|cm|mm|μm|nm|kg|g|mg|μg|mL|μL|L|"
    r"%|rpm|Hz|MHz|GHz|MB|GB|TB|px|fps|kW|V|A|eV|GPa|atm)",
    r"\$[\d,]+(?:\.\d+)?(?:\s*[MBK])?",
    r"\d+(?:\.\d+)?\s*x\s*\d+(?:\.\d+)?",
    r"\d+(?:\.\d+)?%",
]

# gap/limitation signal phrases — used to flag gap nodes
GAP_SIGNALS = [
    "however", "limitation", "future work", "remains unclear",
    "not yet", "we did not", "further research", "open question",
    "assumption", "caveat", "uncertainty", "unknown"
]


def extract_entities(text: str) -> list[dict]:
    doc = _nlp(text)
    seen = set()
    entities = []
    for ent in doc.ents:
        if ent.text.lower() not in seen and len(ent.text.strip()) > 2:
            seen.add(ent.text.lower())
            entities.append({
                "text":        ent.text,
                "label":       ent.label_,
                "description": spacy.explain(ent.label_) or ent.label_,
            })
    return entities


def extract_key_terms(text: str, top_n: int = 5) -> list[str]:
    doc = _nlp(text)
    candidates = []
    for chunk in doc.noun_chunks:
        if (
            len(chunk.text.strip()) > 3
            and not chunk.root.is_stop
            and chunk.root.pos_ in ["NOUN", "PROPN"]
        ):
            candidates.append(chunk.text.strip())

    seen = set()
    result = []
    for c in sorted(candidates, key=len, reverse=True):
        if c.lower() not in seen:
            seen.add(c.lower())
            result.append(c)
        if len(result) >= top_n:
            break
    return result


def extract_params(text: str) -> dict:
    params = {}
    idx = 0
    for pattern in PARAM_PATTERNS:
        matches = re.findall(pattern, text)
        for match in matches:
            if isinstance(match, tuple) and len(match) == 2:
                value, unit = match
                params[unit] = value
            else:
                params[f"value_{idx}"] = match
                idx += 1
    return params


def is_gap_sentence(text: str) -> bool:
    """Check whether this chunk is a gap or limitation."""
    text_lower = text.lower()
    return any(signal in text_lower for signal in GAP_SIGNALS)


def extract_all(chunks: list[dict]) -> list[dict]:
    for chunk in chunks:
        chunk["entities"]  = extract_entities(chunk["text"])
        chunk["key_terms"] = extract_key_terms(chunk["text"])
        chunk["params"]    = extract_params(chunk["text"])
        chunk["is_gap"]    = is_gap_sentence(chunk["text"])
    return chunks