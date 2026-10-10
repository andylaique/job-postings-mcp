# Job Postings MCP Server

A small [Model Context Protocol](https://modelcontextprotocol.io) server built with the **official MCP Python SDK** (`mcp` ≥ 2.3). It exposes typed tools over a sample dataset of 12 tech job postings.

## Features

| Tool | Description |
|------|-------------|
| `search_postings_by_skill` | Find jobs that list a given skill (case-insensitive). Optional `remote_only` filter and `limit`. |
| `count_postings_by_company` | Count openings per company, with optional `min_count` threshold. |
| `get_job_details` | Return the full posting for a job ID. |
| `list_all_skills` | List every unique skill that appears in the dataset. |

- Clear tool descriptions and typed inputs (Pydantic / type hints → JSON Schema)
- Input validation with helpful error messages (empty skill, unknown job ID, out-of-range limit, etc.)
- Structured return types

## Quick start

```bash
# Clone
git clone https://github.com/andylaique/job-postings-mcp.git
cd job-postings-mcp

# Install
pip install -r requirements.txt
# or: uv add "mcp[cli]"

# Run with the MCP Inspector (interactive UI)
uv run mcp dev src/server.py
# or: python -m mcp.cli dev src/server.py
```

The Inspector opens a browser UI where you can call every tool and inspect request/response payloads.

### Claude Desktop / other hosts (stdio)

Add to your MCP client config:

```json
{
  "mcpServers": {
    "job-postings": {
      "command": "python",
      "args": ["/absolute/path/to/job-postings-mcp/src/server.py"]
    }
  }
}
```

### HTTP transport (stretch)

```bash
uv run mcp run src/server.py --transport streamable-http --port 8000
# Server available at http://localhost:8000/mcp
```

## Frontend (Gemini chat UI)

A lightweight browser UI that talks to **Google Gemini** with the same four tools via function calling. No MCP runtime required for the demo.

1. Open `frontend/index.html` in a browser (or serve it with any static server).
2. Paste a [Gemini API key](https://aistudio.google.com/apikey) and click **Save**.
3. Ask natural-language questions, e.g. “Find remote Python jobs” or “How many postings does each company have?”

The tools are implemented client-side so the UI works offline from the MCP server; the logic is identical to the Python tools.

## Dataset

`data/job_postings.json` — 12 sample postings from Stripe, Notion, OpenAI, GitHub, Vercel, Databricks, Cloudflare, Linear, and Anthropic. Each record has `id`, `title`, `company`, `location`, `remote`, `skills`, salary range, `posted_date`, and `description`.

## Proof of work

Run the tools directly:

```bash
python -c "
from src.server import search_postings_by_skill, count_postings_by_company, get_job_details
print(search_postings_by_skill('Python', remote_only=True))
print(count_postings_by_company())
print(get_job_details('job-003'))
"
```

Or use the MCP Inspector / the Gemini frontend.

---

## Protecting the server with OAuth 2.0

When the server is exposed over the network (Streamable HTTP / SSE) rather than local stdio, it must be protected. MCP’s authorization model is built on **OAuth 2.1**.

### Recommended flow

**Authorization Code Grant with PKCE** (OAuth 2.1 mandatory for public clients).

1. The MCP client discovers the authorization server via the server’s **Protected Resource Metadata** document (RFC 9728) at  
   `/.well-known/oauth-protected-resource`.
2. The client obtains Authorization Server Metadata (RFC 8414) and starts the Authorization Code + PKCE flow.
3. The user authenticates at the authorization server and consents to the requested scopes.
4. The client exchanges the authorization code for an access token (and optionally a refresh token).
5. Every subsequent request to the MCP server carries  
   `Authorization: Bearer <access_token>`.

For machine-to-machine scenarios the **Client Credentials** grant can be used, but the user-delegated Authorization Code + PKCE flow is the primary path for interactive AI assistants.

### Where tokens are checked

On every HTTP request the MCP server (acting as a **resource server**) must:

1. Extract the Bearer token from the `Authorization` header.
2. Validate signature / MAC (using the AS’s JWKS).
3. Check `exp` (and optionally `nbf`).
4. Verify the **audience** (`aud`) claim equals this server’s canonical resource identifier (Resource Indicators, RFC 8707). A token issued for another MCP server must be rejected.
5. Verify the required **scopes** are present.
6. If validation fails → respond with `401 Unauthorized` and a `WWW-Authenticate` header pointing at the Protected Resource Metadata.

Token introspection or local JWT verification both work; JWT is preferred for latency.

### Suggested scopes

| Scope | Meaning |
|-------|--------|
| `jobs:read` | Call read-only tools (`search_postings_by_skill`, `count_postings_by_company`, `get_job_details`, `list_all_skills`) |
| `jobs:write` | Reserved for future write tools (create/update postings) |
| `offline_access` | Allow refresh tokens |

Start with a single `jobs:read` scope. Fine-grained scopes become useful once the server grows write operations or multi-tenant data.

### Implementation sketch

```python
# Pseudocode — not part of the current stdio demo
from mcp.server import MCPServer
# + your AS JWT verification helper

mcp = MCPServer("job-postings")

@mcp.tool()
def search_postings_by_skill(...):
    # The transport layer has already validated the token
    # and attached identity/scopes to the request context.
    ...
```

For a production deployment you would:

- Publish Protected Resource Metadata.
- Run the server behind HTTPS.
- Validate tokens on every request (middleware or transport hook).
- Prefer short-lived access tokens + refresh tokens.
- Register MCP clients as public clients (`token_endpoint_auth_method: "none"`) and enforce PKCE S256.

See the [MCP Authorization specification](https://modelcontextprotocol.io/specification/2025-06-18/basic/authorization) and [Security Best Practices](https://modelcontextprotocol.io/docs/tutorials/security/security-best-practices) for the normative requirements.

---

## Project layout

```
job-postings-mcp/
├── data/
│   └── job_postings.json      # Sample dataset
├── src/
│   └── server.py              # MCP server (official SDK)
├── frontend/
│   ├── index.html             # Gemini chat UI
│   └── app.js                 # Function-calling client
├── requirements.txt
└── README.md
```

## License

MIT
