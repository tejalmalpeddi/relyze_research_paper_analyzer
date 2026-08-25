# One-off script: re-applies clean_markdown_artifacts() (see database.py)
# to every already-uploaded document's markdown_content, so papers
# uploaded before that cleanup existed get fixed too.
#
# Usage:
#   python parser/backfill_markdown_cleanup.py --dry-run   # report only
#   python parser/backfill_markdown_cleanup.py              # write changes
#
# Run from the repo root (same convention as parser.py's own __main__
# block) so the same-directory "from database import ..." resolves.

import argparse
from pathlib import Path

from dotenv import load_dotenv

# database.py's own load_dotenv() call walks up from the CALLER's file
# location (python-dotenv's default find_dotenv(usecwd=False) uses stack
# inspection, not the working directory) -- since this script lives in
# parser/, a sibling of backend/ rather than an ancestor, that search
# would never reach backend/.env on its own. Loading it explicitly here,
# before connect_to_supabase() runs, makes this script work regardless
# of which directory it's invoked from.
load_dotenv(Path(__file__).resolve().parent.parent / "backend" / ".env")

from database import connect_to_supabase, clean_markdown_artifacts

PAGE_SIZE = 1000


def fetch_all_documents(supabase):
    documents = []
    start = 0
    while True:
        end = start + PAGE_SIZE - 1
        response = (
            supabase.table("documents")
            .select("id, markdown_content")
            .range(start, end)
            .execute()
        )
        page = response.data
        documents.extend(page)
        if len(page) < PAGE_SIZE:
            break
        start += PAGE_SIZE
    return documents


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Report how many rows would change, without writing anything.",
    )
    args = parser.parse_args()

    supabase = connect_to_supabase()
    documents = fetch_all_documents(supabase)

    total = len(documents)
    updated = 0

    for document in documents:
        markdown_content = document.get("markdown_content")
        if not markdown_content:
            continue

        cleaned = clean_markdown_artifacts(markdown_content)
        if cleaned == markdown_content:
            continue

        updated += 1
        if args.dry_run:
            continue

        (
            supabase.table("documents")
            .update({"markdown_content": cleaned})
            .eq("id", document["id"])
            .execute()
        )

    verb = "Would update" if args.dry_run else "Updated"
    print(f"{verb} {updated}/{total} documents")


if __name__ == "__main__":
    main()
