"""
builds edges between nodes.
"""

from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

_embedder = SentenceTransformer("all-MiniLM-L6-v2")

SEQUENTIAL_ROLES = {"step", "method"}

SUPPORT_MAP = {
    "evidence":     "claim",
    "example":      "concept",
    "finding":      "method",
    "counterpoint": "claim",
}

SIMILARITY_THRESHOLD = 0.72


def build_edges(nodes: list[dict]) -> list[dict]:
    edges = []
    edge_id = 0

    for node in nodes:
        if node["parent"] != "root":
            edges.append({
                "id":     f"e{edge_id}",
                "source": node["parent"],
                "target": node["id"],
                "type":   "has_child",
            })
            edge_id += 1

    sequential = [n for n in nodes if n["type"] in SEQUENTIAL_ROLES]
    for i in range(len(sequential) - 1):
        a, b = sequential[i], sequential[i + 1]
        if a["parent"] == b["parent"]:
            edges.append({
                "id":     f"e{edge_id}",
                "source": a["id"],
                "target": b["id"],
                "type":   "next_step",
            })
            edge_id += 1

    if len(nodes) > 1:
        texts      = [n["content"] for n in nodes]
        embeddings = _embedder.encode(texts)
        sim_matrix = cosine_similarity(embeddings)

        for i in range(len(nodes)):
            for j in range(i + 1, len(nodes)):
                sim = sim_matrix[i][j]
                if (
                    sim > SIMILARITY_THRESHOLD
                    and nodes[i]["parent"] != nodes[j]["parent"]
                    and nodes[i]["type"] != "background"
                    and nodes[j]["type"] != "background"
                ):
                    edges.append({
                        "id":     f"e{edge_id}",
                        "source": nodes[i]["id"],
                        "target": nodes[j]["id"],
                        "type":   "related_concept",
                        "weight": round(float(sim), 3),
                    })
                    edge_id += 1

    for node in nodes:
        target_role = SUPPORT_MAP.get(node["type"])
        if not target_role:
            continue
        for other in nodes:
            if other["type"] == target_role and other["id"] != node["id"]:
                edges.append({
                    "id":     f"e{edge_id}",
                    "source": node["id"],
                    "target": other["id"],
                    "type":   "supports",
                })
                edge_id += 1
                break

    return edges