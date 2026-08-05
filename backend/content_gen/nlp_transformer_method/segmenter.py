"""
splits raw text into labeled chunks.
"""

import re
import nltk

try:
    nltk.data.find("tokenizers/punkt_tab")
except LookupError:
    nltk.download("punkt_tab", quiet=True)

try:
    nltk.data.find("tokenizers/punkt")
except LookupError:
    nltk.download("punkt", quiet=True)

DISCOURSE_MARKERS = re.compile(
    r"^(however|furthermore|in contrast|additionally|on the other hand|"
    r"as a result|therefore|in summary|to summarize|finally|"
    r"in conclusion|notably|importantly|consequently|meanwhile|"
    r"nevertheless|in addition|by contrast|for example|for instance)",
    re.IGNORECASE,
)

HEADER_PATTERN = re.compile(
    r"^(\d+\.?\d*\s+)?[A-Z][^\n.!?]{2,60}$"
)

DOMAIN_SIGNALS: dict[str, list[str]] = {
    "science": [
        "hypothesis", "experiment", "specimen", "protein", "cell",
        "gene", "molecule", "clinical", "trial", "dataset", "methodology",
        "equation", "thermodynamic", "plasma", "laser", "quantum",
    ],
    "tech": [
        "algorithm", "function", "api", "model", "framework",
        "database", "deploy", "architecture", "latency", "endpoint",
        "neural", "training", "inference", "pipeline", "transformer",
    ],
    "legal": [
        "plaintiff", "defendant", "statute", "court", "ruling",
        "amendment", "jurisdiction", "hereby", "clause", "counsel",
    ],
    "business": [
        "revenue", "market", "customer", "strategy", "stakeholder",
        "roi", "kpi", "quarter", "forecast", "pipeline",
    ],
}


def detect_domain(text: str) -> str:
    text_lower = text.lower()
    scores: dict[str, int] = {"general": 1}
    for domain, signals in DOMAIN_SIGNALS.items():
        scores[domain] = sum(text_lower.count(w) for w in signals)
    return max(scores, key=scores.get)


def _is_header(text: str) -> bool:
    t = text.strip()
    return (
        2 < len(t) < 80
        and not t.endswith(",")
        and not t.endswith(".")
        and len(t.split()) < 12
        and bool(HEADER_PATTERN.match(t))
    )


def segment(text: str) -> list[dict]:
    if not text or not text.strip():
        return []

    text = re.sub(r"\r\n|\r", "\n", text)
    text = re.sub(r"\t", " ", text)
    text = re.sub(r" {3,}", " ", text)

    paragraphs = re.split(r"\n{2,}", text)
    chunks: list[dict] = []
    position = 0
    current_sentences: list[str] = []

    def flush(reason: str) -> None:
        nonlocal position
        joined = " ".join(current_sentences).strip()
        if joined:
            chunks.append({
                "id":              f"chunk-{position}",
                "text":            joined,
                "position":        position,
                "is_header":       False,
                "word_count":      len(joined.split()),
                "boundary_reason": reason,
            })
            position += 1
        current_sentences.clear()

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        try:
            sentences = nltk.sent_tokenize(para)
        except Exception:
            sentences = [para]

        for sent in sentences:
            sent = sent.strip()
            if not sent:
                continue

            header    = _is_header(sent)
            discourse = bool(DISCOURSE_MARKERS.match(sent))

            if (header or discourse) and current_sentences:
                flush("discourse_marker" if discourse else "paragraph_break")

            if header:
                flush("paragraph_break")
                chunks.append({
                    "id":              f"chunk-{position}",
                    "text":            sent,
                    "position":        position,
                    "is_header":       True,
                    "word_count":      len(sent.split()),
                    "boundary_reason": "header_detected",
                })
                position += 1
            else:
                current_sentences.append(sent)
                if len(current_sentences) >= 6:
                    flush("max_sentences")

        if current_sentences:
            flush("paragraph_break")

    if current_sentences:
        flush("flush")

    return chunks