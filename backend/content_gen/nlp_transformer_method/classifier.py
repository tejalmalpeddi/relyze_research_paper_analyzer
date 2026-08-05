"""
assigns semantic role to each chunk.

"""

from transformers import pipeline as hf_pipeline

_classifier = hf_pipeline(
    "zero-shot-classification",
    model="cross-encoder/nli-MiniLM2-L6-H768",
)

SEMANTIC_ROLES = [
    "claim or assertion",
    "evidence or support",
    "method or process",
    "finding or result",
    "gap or limitation",
    "concept or definition",
    "step or instruction",
    "example or illustration",
    "counterpoint or objection",
    "background or context",
]

LABEL_MAP = {
    "claim or assertion":        "claim",
    "evidence or support":       "evidence",
    "method or process":         "method",
    "finding or result":         "finding",
    "gap or limitation":         "gap",
    "concept or definition":     "concept",
    "step or instruction":       "step",
    "example or illustration":   "example",
    "counterpoint or objection": "counterpoint",
    "background or context":     "background",
}

# raised from 0.35 — forces more confident classifications
CONFIDENCE_THRESHOLD = 0.45


def classify_chunk(text: str) -> tuple[str, float]:
    if not text or len(text.strip()) < 20:
        return "background", 0.5

    result = _classifier(text[:512], SEMANTIC_ROLES, multi_label=False)
    top_label = result["labels"][0]
    top_score = result["scores"][0]
    role = LABEL_MAP.get(top_label, "background")

    if top_score < CONFIDENCE_THRESHOLD:
        return "background", round(top_score, 3)

    return role, round(top_score, 3)


def classify_all(chunks: list[dict]) -> list[dict]:
    for chunk in chunks:
        if chunk["is_header"]:
            chunk["role"] = "background"
            chunk["confidence"] = 1.0
        else:
            role, confidence = classify_chunk(chunk["text"])
            chunk["role"] = role
            chunk["confidence"] = confidence
    return chunks