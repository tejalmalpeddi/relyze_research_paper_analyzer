"""
NLP pipeline  LLM generator.

"""

import json
import os
from supabase import create_client, Client

from .segmenter   import segment, detect_domain, detect_topics
from .extractor   import extract_all
from .relationship import build_edges

# import the Groq dev's generator
from app.services.subcategory_generator import generate_subcategories

_supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_KEY")
)



def fetch_document(document_id: str) -> dict:
    """
    Reads from documents table.
    raw_text is jsonb shape: {"pages": [{"page_number": 1, "text": "..."}]}
    """
    response = (
        _supabase.table("documents")
        .select("id, file_name, title, raw_text, status, user_id")
        .eq("id", document_id)
        .single()
        .execute()
    )

    if not response.data:
        raise ValueError(f"Document {document_id} not found")

    raw = response.data["raw_text"]

    if isinstance(raw, str):
        raw = json.loads(raw)

    return {
        "id":        response.data["id"],
        "file_name": response.data.get("file_name", "document.pdf"),
        "title":     response.data.get("title"),
        "user_id":   response.data.get("user_id"),
        "pages":     raw.get("pages", []),
    }



def save_results(
    document_id: str,
    user_id: str,
    title: str,
    map_json: dict,
    structured_data: dict,
    filters: list[str],
) -> dict:
    """
    Writes generated map data back to the documents table.
    """
    response = _supabase.table("documents").update({
        "title":           title,
        "map_json":        map_json,
        "filters":         filters,
        "structured_data": structured_data,
        "status":          "completed",
    }).eq("id", document_id).execute()

    if not response.data:
        raise ValueError(f"Document {document_id} could not be updated")

    return response.data[0]


def update_status(document_id: str, status: str) -> None:
    _supabase.table("documents")\
             .update({"status": status})\
             .eq("id", document_id)\
             .execute()



def enrich_pages_with_nlp(pages: list[dict]) -> dict:
    """
    Runs NLP on all pages and returns a lookup of enrichment data.
    This feeds into the LLM prompt and into node metadata.
    
    """
    full_text = " ".join(p.get("text", "") for p in pages)
    domain = detect_domain(full_text)

    all_chunks = []
    all_key_terms = []
    all_entities = []
    all_params = {}

    for page in pages:
        page_text = page.get("text", "")
        if not page_text.strip():
            continue

        chunks = segment(page_text)
        chunks = extract_all(chunks)

        for chunk in chunks:
            chunk["page_number"] = page.get("page_number", 1)

        all_chunks.extend(chunks)
        for chunk in chunks:
            all_key_terms.extend(chunk.get("key_terms", []))
            all_entities.extend(
                e["text"] for e in chunk.get("entities", [])
            )
            all_params.update(chunk.get("params", {}))

    seen = set()
    unique_terms = []
    for t in all_key_terms:
        if t.lower() not in seen:
            seen.add(t.lower())
            unique_terms.append(t)

    return {
        "domain":        domain,
        "full_text":     full_text,
        "all_key_terms": unique_terms[:20],
        "all_entities":  list(set(all_entities))[:15],
        "all_params":    all_params,
        "chunks":        all_chunks,
    }



# fallback tag when a document doesn't match any TOPIC_SIGNALS at all.
_DOMAIN_TAG_LABELS = {
    "science":  "Science",
    "tech":     "Technology",
    "legal":    "Legal",
    "business": "Business",
    "general":  "General",
}


def generate_paper_tags(nlp_data: dict) -> list[str]:
    """
    Builds the short tags saved to documents.filters and shown as the
    small color-coded chips under each paper card on the homepage.

    These come from detect_topics(), a fixed taxonomy of broad subject
    areas (e.g. "Machine Learning", "Neuroscience") -- deliberately generic
    rather than pulled from this one paper's specific vocabulary, so that
    unrelated papers on the same subject end up sharing tags and the
    homepage filter is actually useful across a whole library. Falls back
    to the coarse domain bucket if nothing in the taxonomy matched.
    """
    tags = detect_topics(nlp_data["full_text"], top_n=3)
    if not tags:
        tags = [_DOMAIN_TAG_LABELS.get(nlp_data["domain"], "General")]
    return tags


def build_map_json(
    title: str,
    domain: str,
    subcategories: list,
    nlp_data: dict,
) -> dict:
    """
    Assembles the final map.json from LLM subcategories + NLP enrichment.

    """
    nodes = [{
        "id": "root",
        "type": "root",
        "data": {
            "title": title,
            "bullets": [domain],
        },
    }]
    node_id = 0

    root = {
        "id":     "root",
        "label":  title,
        "type":   "root",
        "domain": domain,
    }

    categories_seen = {}

    for sub in subcategories:
        cat = sub.category
        if cat not in categories_seen:
            cat_id = f"cat-{node_id}"
            node_id += 1
            categories_seen[cat] = cat_id
            nodes.append({
                "id":      cat_id,
                "label":   cat,
                "type":    _category_to_type(cat),
                "data": {
                    "title": cat,
                    "bullets": [],
                },
                "content": {
                    "beginner":     cat,
                    "intermediate": cat,
                    "advanced":     cat,
                },
                "parent":  "root",
                "depth":   1,
                "metadata": {
                    "source_text":   "",
                    "source_page":   None,
                    "importance":    3,
                    "prerequisites": {
                        "beginner":     [],
                        "intermediate": [],
                        "advanced":     [],
                    },
                    "related_terms": [],
                    "params":        {},
                    "tags":          [],
                    "confidence":    1.0,
                }
            })

        sub_node_id = f"sub-{node_id}"
        node_id += 1

        matching_terms = [
            t for t in nlp_data["all_key_terms"]
            if t.lower() in sub.name.lower()
            or sub.name.lower() in t.lower()
        ]

        content_dict = {
            "beginner":     sub.content.beginner,
            "intermediate": sub.content.intermediate,
            "advanced":     sub.content.advanced,
        }

        prereq_dict = {
            "beginner":     sub.prerequisites.beginner,
            "intermediate": sub.prerequisites.intermediate,
            "advanced":     sub.prerequisites.advanced,
        }

        nodes.append({
            "id":      sub_node_id,
            "label":   sub.name,
            "type":    _category_to_type(sub.category),
            "data": {
                "title": sub.name,
                "bullets": [content_dict["intermediate"]],
            },
            "content": content_dict,
            "parent":  categories_seen[cat],
            "depth":   2,
            "metadata": {
                "source_text":   sub.sourceSnippet,
                "source_page":   sub.sourcePage,
                "importance":    sub.importance,
                "prerequisites": prereq_dict,
                "related_terms": sub.relatedTerms + matching_terms[:2],
                "params":        nlp_data["all_params"],
                "tags":          matching_terms[:3],
                "confidence":    sub.importance / 5.0,
            }
        })

    node_dicts = [
        {"id": n["id"], "type": n["type"],
         "content": n["content"]["intermediate"], "parent": n["parent"]}
        for n in nodes
        if n["id"] != "root"
    ]
    edges = build_edges(node_dicts)
    edge_id = len(edges)
    for node in nodes:
        if node.get("parent") == "root":
            edges.append({
                "id": f"e-root-{edge_id}",
                "source": "root",
                "target": node["id"],
                "type": "has_child",
            })
            edge_id += 1

    return {"root": root, "nodes": nodes, "edges": edges}


def _category_to_type(category: str) -> str:
    """Maps Groq dev's category labels to your node type system."""
    mapping = {
        "Problem":       "claim",
        "Background":    "background",
        "Method":        "method",
        "Architecture":  "method",
        "Dataset":       "evidence",
        "Experiment":    "step",
        "Result":        "finding",
        "Limitation":    "gap",
        "Future Work":   "gap",
        "Key Term":      "concept",
    }
    return mapping.get(category, "concept")


def run_pipeline(document_id: str) -> dict:
    """
    Full pipeline entry point.
    Called from the FastAPI endpoint.
    
    Args:
        document_id: UUID from documents table

    Returns:
        Completed map.json dict
    """
    print(f"[pipeline] Starting for document {document_id}")
    update_status(document_id, "processing")

    try:
        doc   = fetch_document(document_id)
        pages = doc["pages"]

        if not pages:
            raise ValueError("Document has no pages — PDF parser may not have run yet")

        print("[pipeline] Running NLP enrichment")
        nlp_data = enrich_pages_with_nlp(pages)

        print("[pipeline] Running LLM subcategory generation")
        parser_output = {
            "file_name": doc["file_name"],
            "pages":     pages,
        }
        subcategory_response = generate_subcategories(parser_output)
        subcategories = subcategory_response.subcategories

        title = doc["title"] or doc["file_name"].replace(".pdf", "").replace("-", " ").title()

        print(f"[pipeline] Assembling map from {len(subcategories)} subcategories")
        map_json = build_map_json(
            title         = title,
            domain        = nlp_data["domain"],
            subcategories = subcategories,
            nlp_data      = nlp_data,
        )

        structured_data = {
            "domain":     nlp_data["domain"],
            "key_terms":  nlp_data["all_key_terms"],
            "entities":   nlp_data["all_entities"],
            "params":     nlp_data["all_params"],
            "page_count": len(pages),
        }

        filters = generate_paper_tags(nlp_data)

        print("[pipeline] Saving to Supabase")
        history_row = save_results(
            document_id     = document_id,
            user_id         = doc["user_id"],
            title           = title,
            map_json        = map_json,
            structured_data = structured_data,
            filters         = filters,
        )

        print("[pipeline] Done")
        return {"map_json": map_json, "history": history_row}

    except Exception as e:
        print(f"[pipeline] ERROR: {e}")
        update_status(document_id, "failed")
        raise e
