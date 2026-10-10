"""
Job Postings MCP Server
Exposes tools over a sample dataset of tech job postings.
Uses the official MCP Python SDK (MCPServer).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Annotated, Literal

from pydantic import BaseModel, Field, field_validator

from mcp.server import MCPServer

# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------

DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "job_postings.json"


def load_jobs() -> list[dict]:
    with open(DATA_PATH, encoding="utf-8") as f:
        return json.load(f)


JOBS: list[dict] = load_jobs()

# ---------------------------------------------------------------------------
# Response models (structured output)
# ---------------------------------------------------------------------------


class JobSummary(BaseModel):
    id: str
    title: str
    company: str
    location: str
    remote: bool
    skills: list[str]
    salary_min: int | None = None
    salary_max: int | None = None
    posted_date: str


class SearchResult(BaseModel):
    query: str
    total_matches: int
    jobs: list[JobSummary]


class CompanyCount(BaseModel):
    company: str
    count: int


class CountByCompanyResult(BaseModel):
    total_companies: int
    counts: list[CompanyCount]


class JobDetail(BaseModel):
    id: str
    title: str
    company: str
    location: str
    remote: bool
    skills: list[str]
    salary_min: int | None = None
    salary_max: int | None = None
    posted_date: str
    description: str


# ---------------------------------------------------------------------------
# Server
# ---------------------------------------------------------------------------

mcp = MCPServer(
    "job-postings",
    instructions=(
        "You have access to a sample dataset of tech job postings. "
        "Use the tools to search by skill, count openings by company, "
        "or retrieve full details for a specific job ID."
    ),
)


@mcp.tool()
def search_postings_by_skill(
    skill: Annotated[
        str,
        Field(
            description="Skill or technology to search for (case-insensitive). "
            "Examples: 'Python', 'React', 'Kubernetes', 'AWS'."
        ),
    ],
    remote_only: Annotated[
        bool,
        Field(description="If true, return only remote-friendly roles."),
    ] = False,
    limit: Annotated[
        int,
        Field(
            description="Maximum number of results to return (1-50).",
            ge=1,
            le=50,
        ),
    ] = 10,
) -> SearchResult:
    """
    Search job postings that list a given skill.

    Matching is case-insensitive and looks for the skill string inside
    each job's skills list. Returns a structured list of matching postings
    sorted by posted_date (newest first).
    """
    skill_clean = skill.strip()
    if not skill_clean:
        raise ValueError(
            "Parameter 'skill' must be a non-empty string. "
            "Example: skill='Python'"
        )

    skill_lower = skill_clean.lower()
    matches: list[dict] = []
    for job in JOBS:
        job_skills = [s.lower() for s in job.get("skills", [])]
        if skill_lower in job_skills or any(skill_lower in s for s in job_skills):
            if remote_only and not job.get("remote", False):
                continue
            matches.append(job)

    # Newest first
    matches.sort(key=lambda j: j.get("posted_date", ""), reverse=True)
    limited = matches[:limit]

    return SearchResult(
        query=skill_clean,
        total_matches=len(matches),
        jobs=[JobSummary(**j) for j in limited],
    )


@mcp.tool()
def count_postings_by_company(
    min_count: Annotated[
        int,
        Field(
            description="Only include companies that have at least this many postings.",
            ge=1,
        ),
    ] = 1,
) -> CountByCompanyResult:
    """
    Count how many job postings exist for each company in the dataset.

    Returns companies ordered by descending posting count. Use min_count
    to filter out companies with few openings.
    """
    if min_count < 1:
        raise ValueError(
            "Parameter 'min_count' must be an integer >= 1. "
            f"Received: {min_count}"
        )

    counts: dict[str, int] = {}
    for job in JOBS:
        company = job.get("company", "Unknown")
        counts[company] = counts.get(company, 0) + 1

    filtered = [
        CompanyCount(company=c, count=n)
        for c, n in sorted(counts.items(), key=lambda x: (-x[1], x[0]))
        if n >= min_count
    ]

    return CountByCompanyResult(
        total_companies=len(filtered),
        counts=filtered,
    )


@mcp.tool()
def get_job_details(
    job_id: Annotated[
        str,
        Field(
            description="The unique job ID, e.g. 'job-001'. "
            "IDs are returned by search_postings_by_skill."
        ),
    ],
) -> JobDetail:
    """
    Retrieve the full details of a single job posting by its ID.

    Raises a clear error if the ID does not exist in the dataset.
    """
    job_id_clean = job_id.strip()
    if not job_id_clean:
        raise ValueError(
            "Parameter 'job_id' must be a non-empty string. "
            "Example: job_id='job-001'"
        )

    for job in JOBS:
        if job.get("id") == job_id_clean:
            return JobDetail(**job)

    available = [j["id"] for j in JOBS]
    raise ValueError(
        f"No job found with id '{job_id_clean}'. "
        f"Available IDs: {', '.join(available)}"
    )


@mcp.tool()
def list_all_skills() -> list[str]:
    """
    Return a sorted list of every unique skill that appears across all
    job postings. Useful for discovering which skills are in demand.
    """
    skills: set[str] = set()
    for job in JOBS:
        for s in job.get("skills", []):
            skills.add(s)
    return sorted(skills)


# Entry point for stdio / HTTP transports
if __name__ == "__main__":
    mcp.run()
