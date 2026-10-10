#!/usr/bin/env python3
"""Quick smoke test of the MCP tool functions (no transport needed)."""

from src.server import (
    search_postings_by_skill,
    count_postings_by_company,
    get_job_details,
    list_all_skills,
)

def main():
    print("=== search_postings_by_skill('Python', remote_only=True) ===")
    r = search_postings_by_skill("Python", remote_only=True, limit=5)
    print(f"  total_matches={r.total_matches}")
    for j in r.jobs:
        print(f"  - {j.id}: {j.title} @ {j.company}")

    print("\n=== count_postings_by_company() ===")
    c = count_postings_by_company()
    for item in c.counts:
        print(f"  {item.company}: {item.count}")

    print("\n=== get_job_details('job-003') ===")
    d = get_job_details("job-003")
    print(f"  {d.title} @ {d.company} — {d.description[:60]}...")

    print("\n=== list_all_skills() (first 8) ===")
    print(" ", list_all_skills()[:8])

    print("\n=== Validation: empty skill ===")
    try:
        search_postings_by_skill("  ")
    except ValueError as e:
        print(f"  OK → {e}")

    print("\n=== Validation: unknown job_id ===")
    try:
        get_job_details("job-999")
    except ValueError as e:
        print(f"  OK → {e}")

    print("\nAll checks passed.")

if __name__ == "__main__":
    main()
