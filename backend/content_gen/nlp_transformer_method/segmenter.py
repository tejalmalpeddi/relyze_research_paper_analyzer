"""
splits raw text into labeled chunks.
"""

import re
import nltk

_nltk_ready = False


def _ensure_nltk_tokenizers() -> None:
    global _nltk_ready
    if _nltk_ready:
        return

    try:
        nltk.data.find("tokenizers/punkt_tab")
    except LookupError:
        nltk.download("punkt_tab", quiet=True)

    try:
        nltk.data.find("tokenizers/punkt")
    except LookupError:
        nltk.download("punkt", quiet=True)

    _nltk_ready = True

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


# A fixed, broad taxonomy of subject-matter topics. Deliberately spans
# STEM, health, social science, business/law, and humanities/arts fields
# rather than skewing STEM-heavy -- detect_topics() (below) is a
# multi-label match against whatever's in here, and a field that isn't
# represented at all can never surface as a filter, regardless of how
# many papers on it get uploaded.
TOPIC_SIGNALS: dict[str, list[str]] = {
    # --- Computing & engineering ---
    "Machine Learning": [
        "machine learning", "neural network", "training data", "supervised learning",
        "unsupervised learning", "gradient descent", "classifier", "deep learning",
    ],
    "Natural Language Processing": [
        "natural language", "language model", "transformer", "tokenization",
        "text classification", "sentiment analysis", "named entity",
    ],
    "Computer Vision": [
        "image classification", "object detection", "convolutional",
        "image recognition", "computer vision", "segmentation",
    ],
    "Robotics": [
        "robot", "robotic", "actuator", "sensor fusion", "autonomous vehicle",
        "manipulator", "motion planning",
    ],
    "Cybersecurity": [
        "encryption", "cyberattack", "vulnerability", "malware", "firewall",
        "authentication", "intrusion detection", "security breach",
    ],
    "Software Engineering": [
        "software architecture", "codebase", "version control", "unit test",
        "continuous integration", "microservice", "api design",
    ],
    "Data Science": [
        "data analysis", "data pipeline", "statistical model", "regression",
        "data visualization", "big data",
    ],
    "Statistics": [
        "statistical significance", "regression analysis", "hypothesis testing",
        "probability distribution", "sample size", "confidence interval",
    ],
    "Engineering": [
        "structural design", "mechanical system", "civil engineering",
        "load bearing", "engineering design", "fluid dynamics",
    ],
    "Materials Science": [
        "nanomaterial", "polymer", "alloy", "crystal structure",
        "material properties", "composite material",
    ],

    # --- Natural & physical sciences ---
    "Biology": [
        "organism", "species", "ecosystem", "cell biology", "biological",
        "evolution", "biodiversity",
    ],
    "Genetics": [
        "gene expression", "dna", "genome", "mutation", "genetic",
        "chromosome", "crispr",
    ],
    "Neuroscience": [
        "neuron", "brain", "cognitive", "synaptic", "neural activity",
        "cortex", "neuroscience",
    ],
    "Chemistry": [
        "chemical reaction", "molecule", "compound", "catalyst",
        "chemical bond", "synthesis",
    ],
    "Physics": [
        "quantum", "particle", "electromagnetic", "thermodynamic",
        "relativity", "physics",
    ],
    "Astronomy": [
        "astrophysics", "exoplanet", "telescope", "galaxy", "cosmology",
        "stellar", "black hole",
    ],
    "Earth Science": [
        "geology", "seismic", "tectonic", "mineral", "sedimentary",
        "volcanic", "geological survey",
    ],
    "Environmental Science": [
        "climate change", "carbon emission", "renewable energy",
        "sustainability", "environmental impact",
    ],
    "Mathematics": [
        "theorem", "proof", "equation", "algebraic", "mathematical model",
        "differential",
    ],
    "Agriculture": [
        "crop yield", "agricultural", "soil fertility", "irrigation",
        "livestock", "farming practice",
    ],

    # --- Health & medicine ---
    "Medicine": [
        "patient", "clinical trial", "diagnosis", "treatment", "disease",
        "therapy", "medical",
    ],
    "Public Health": [
        "public health", "epidemiology", "vaccination", "healthcare policy",
        "disease outbreak", "population health",
    ],
    "Nursing": [
        "nursing care", "patient care", "clinical nursing",
        "nurse practitioner", "nursing practice",
    ],
    "Pharmacology": [
        "pharmacokinetics", "drug interaction", "dosage", "pharmaceutical",
        "pharmacological", "drug efficacy",
    ],
    "Nutrition": [
        "dietary intake", "nutritional", "micronutrient", "caloric",
        "diet quality", "nutrient",
    ],
    "Sports Science": [
        "athletic performance", "exercise physiology", "sports medicine",
        "kinesiology", "muscle strength", "physical fitness",
    ],
    "Veterinary Science": [
        "veterinary", "animal health", "livestock disease",
        "companion animal", "zoonotic",
    ],

    # --- Social sciences ---
    "Psychology": [
        "behavioral", "cognitive bias", "psychological", "mental health",
        "emotion regulation", "personality",
    ],
    "Sociology": [
        "social structure", "social inequality", "sociological",
        "social norm", "social capital", "demographic",
    ],
    "Political Science": [
        "political system", "governance", "democracy", "election",
        "policy analysis", "political institution",
    ],
    "Anthropology": [
        "ethnography", "cultural practice", "anthropological", "fieldwork",
        "indigenous", "kinship",
    ],
    "International Relations": [
        "foreign policy", "diplomacy", "geopolitical",
        "international relations", "bilateral", "sovereignty",
    ],
    "Criminology": [
        "crime rate", "criminal justice", "recidivism", "criminology",
        "law enforcement", "incarceration",
    ],
    "Linguistics": [
        "phonetics", "syntax", "morphology", "linguistic",
        "language acquisition", "semantics",
    ],
    "Geography": [
        "spatial analysis", "geographic information", "urbanization",
        "land use", "cartography",
    ],
    "Communication Studies": [
        "mass media", "communication theory", "media effects", "audience",
        "journalism", "public relations",
    ],
    "Public Policy": [
        "policy implementation", "regulatory", "public administration",
        "policymaker", "legislation",
    ],
    "Education": [
        "curriculum", "pedagogy", "student learning", "classroom",
        "educational outcomes",
    ],

    # --- Humanities & arts ---
    "History": [
        "historical record", "historiography", "archival", "colonial",
        "medieval", "historical context",
    ],
    "Philosophy": [
        "epistemology", "metaphysics", "ethical theory", "philosophical",
        "moral philosophy", "ontology",
    ],
    "Art History": [
        "iconography", "art historical", "renaissance", "artistic movement",
        "painting", "sculpture",
    ],
    "Literature": [
        "literary criticism", "narrative structure", "poetics", "novel",
        "literary theory", "protagonist",
    ],
    "Religious Studies": [
        "theology", "religious tradition", "scripture", "spirituality",
        "doctrine", "religious practice",
    ],
    "Music": [
        "musical composition", "harmony", "musicology", "orchestration",
        "musical performance", "rhythm",
    ],
    "Performing Arts": [
        "theatrical", "stage performance", "choreography", "dramaturgy",
        "playwright", "performance art",
    ],
    "Film Studies": [
        "cinematography", "film theory", "mise-en-scene", "screenplay",
        "film narrative", "documentary film",
    ],

    # --- Business & law ---
    "Economics": [
        "market equilibrium", "supply and demand", "gdp", "inflation",
        "economic growth", "monetary policy",
    ],
    "Finance": [
        "investment", "portfolio", "stock market", "interest rate",
        "financial risk", "asset",
    ],
    "Business Strategy": [
        "business model", "competitive advantage", "stakeholder",
        "market share", "corporate strategy",
    ],
    "Marketing": [
        "consumer behavior", "brand", "advertising", "marketing strategy",
        "market segmentation", "promotional",
    ],
    "Accounting": [
        "financial statement", "auditing", "accounting standard",
        "balance sheet", "bookkeeping",
    ],
    "Management": [
        "organizational behavior", "leadership", "human resources",
        "workplace", "employee performance", "management practice",
    ],
    "Law": [
        "plaintiff", "defendant", "statute", "jurisdiction", "court ruling",
        "legal precedent", "contract",
    ],
}


def detect_topics(text: str, top_n: int = 3) -> list[str]:
    """
    Scores the whole document against TOPIC_SIGNALS and returns the
    top_n topics with the strongest signal, most-relevant first. Unlike
    detect_domain(), this is multi-label -- a paper can (and often will)
    match more than one topic -- and only returns topics that actually
    matched at least one signal word, so it can return fewer than top_n
    (or none) for an off-taxonomy document.
    """
    text_lower = text.lower()
    scores: dict[str, int] = {}
    for topic, signals in TOPIC_SIGNALS.items():
        score = sum(text_lower.count(w) for w in signals)
        if score > 0:
            scores[topic] = score

    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    return [topic for topic, _ in ranked[:top_n]]


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

    _ensure_nltk_tokenizers()

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
