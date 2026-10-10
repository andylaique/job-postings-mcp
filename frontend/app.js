/**
 * Gemini-powered chat frontend for the Job Postings MCP tools.
 * The tool implementations mirror the MCP server so the UI works standalone.
 */

const JOBS = [
  { id: "job-001", title: "Senior Python Backend Engineer", company: "Stripe", location: "San Francisco, CA", remote: true, skills: ["Python", "Django", "PostgreSQL", "AWS", "Redis"], salary_min: 180000, salary_max: 250000, posted_date: "2026-09-15", description: "Build scalable payment systems using Python and Django." },
  { id: "job-002", title: "Full Stack Engineer", company: "Notion", location: "New York, NY", remote: true, skills: ["TypeScript", "React", "Node.js", "PostgreSQL"], salary_min: 160000, salary_max: 220000, posted_date: "2026-09-20", description: "Work on collaborative productivity tools with React and Node." },
  { id: "job-003", title: "Machine Learning Engineer", company: "OpenAI", location: "San Francisco, CA", remote: false, skills: ["Python", "PyTorch", "Transformers", "CUDA", "MLOps"], salary_min: 200000, salary_max: 350000, posted_date: "2026-09-10", description: "Train and deploy large language models at scale." },
  { id: "job-004", title: "DevOps Engineer", company: "GitHub", location: "Remote", remote: true, skills: ["Kubernetes", "Terraform", "AWS", "Python", "Go"], salary_min: 150000, salary_max: 210000, posted_date: "2026-09-25", description: "Manage infrastructure for millions of developers." },
  { id: "job-005", title: "Frontend Engineer", company: "Vercel", location: "Remote", remote: true, skills: ["React", "TypeScript", "Next.js", "Tailwind CSS"], salary_min: 140000, salary_max: 200000, posted_date: "2026-09-18", description: "Build the future of web deployment experiences." },
  { id: "job-006", title: "Data Engineer", company: "Databricks", location: "Seattle, WA", remote: true, skills: ["Python", "Spark", "SQL", "Airflow", "Kafka"], salary_min: 170000, salary_max: 240000, posted_date: "2026-09-12", description: "Design data pipelines for lakehouse architecture." },
  { id: "job-007", title: "Security Engineer", company: "Cloudflare", location: "Austin, TX", remote: true, skills: ["Python", "Go", "Cryptography", "Network Security"], salary_min: 160000, salary_max: 230000, posted_date: "2026-09-22", description: "Protect the edge of the internet." },
  { id: "job-008", title: "Product Engineer", company: "Linear", location: "Remote", remote: true, skills: ["TypeScript", "React", "GraphQL", "PostgreSQL"], salary_min: 150000, salary_max: 210000, posted_date: "2026-09-28", description: "Ship beautiful issue tracking experiences." },
  { id: "job-009", title: "Backend Engineer", company: "Stripe", location: "Dublin, Ireland", remote: false, skills: ["Ruby", "Go", "PostgreSQL", "Kafka"], salary_min: 120000, salary_max: 180000, posted_date: "2026-09-05", description: "Build financial infrastructure for the internet." },
  { id: "job-010", title: "AI Research Engineer", company: "Anthropic", location: "San Francisco, CA", remote: false, skills: ["Python", "PyTorch", "Research", "LLMs", "RLHF"], salary_min: 220000, salary_max: 400000, posted_date: "2026-09-08", description: "Advance the science of AI safety and alignment." },
  { id: "job-011", title: "Platform Engineer", company: "Notion", location: "San Francisco, CA", remote: true, skills: ["Go", "Kubernetes", "PostgreSQL", "Redis"], salary_min: 170000, salary_max: 240000, posted_date: "2026-09-30", description: "Scale the infrastructure behind collaborative workspaces." },
  { id: "job-012", title: "Junior Software Engineer", company: "GitHub", location: "Remote", remote: true, skills: ["JavaScript", "Python", "Git", "React"], salary_min: 100000, salary_max: 140000, posted_date: "2026-10-01", description: "Start your career building tools developers love." },
];

// ---------------------------------------------------------------------------
// Tool implementations (mirror of MCP server)
// ---------------------------------------------------------------------------

function search_postings_by_skill({ skill, remote_only = false, limit = 10 }) {
  const skillClean = (skill || "").trim();
  if (!skillClean) {
    return { error: "Parameter 'skill' must be a non-empty string. Example: skill='Python'" };
  }
  const skillLower = skillClean.toLowerCase();
  let matches = JOBS.filter((j) => {
    const skills = (j.skills || []).map((s) => s.toLowerCase());
    const hit = skills.includes(skillLower) || skills.some((s) => s.includes(skillLower));
    if (!hit) return false;
    if (remote_only && !j.remote) return false;
    return true;
  });
  matches.sort((a, b) => (b.posted_date || "").localeCompare(a.posted_date || ""));
  const limited = matches.slice(0, Math.min(Math.max(limit, 1), 50));
  return {
    query: skillClean,
    total_matches: matches.length,
    jobs: limited.map(({ description, ...rest }) => rest),
  };
}

function count_postings_by_company({ min_count = 1 } = {}) {
  if (min_count < 1) {
    return { error: `Parameter 'min_count' must be an integer >= 1. Received: ${min_count}` };
  }
  const counts = {};
  for (const j of JOBS) {
    counts[j.company] = (counts[j.company] || 0) + 1;
  }
  const filtered = Object.entries(counts)
    .filter(([, n]) => n >= min_count)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([company, count]) => ({ company, count }));
  return { total_companies: filtered.length, counts: filtered };
}

function get_job_details({ job_id }) {
  const id = (job_id || "").trim();
  if (!id) {
    return { error: "Parameter 'job_id' must be a non-empty string. Example: job_id='job-001'" };
  }
  const job = JOBS.find((j) => j.id === id);
  if (!job) {
    return { error: `No job found with id '${id}'. Available IDs: ${JOBS.map((j) => j.id).join(", ")}` };
  }
  return job;
}

function list_all_skills() {
  const set = new Set();
  for (const j of JOBS) for (const s of j.skills || []) set.add(s);
  return Array.from(set).sort();
}

const TOOL_IMPL = {
  search_postings_by_skill,
  count_postings_by_company,
  get_job_details,
  list_all_skills,
};

// Gemini function declarations
const FUNCTION_DECLARATIONS = [
  {
    name: "search_postings_by_skill",
    description: "Search job postings that list a given skill. Matching is case-insensitive. Returns matching postings sorted by posted_date (newest first).",
    parameters: {
      type: "object",
      properties: {
        skill: { type: "string", description: "Skill or technology to search for (case-insensitive). Examples: 'Python', 'React', 'Kubernetes'." },
        remote_only: { type: "boolean", description: "If true, return only remote-friendly roles." },
        limit: { type: "integer", description: "Maximum number of results (1-50).", minimum: 1, maximum: 50 },
      },
      required: ["skill"],
    },
  },
  {
    name: "count_postings_by_company",
    description: "Count how many job postings exist for each company. Returns companies ordered by descending posting count.",
    parameters: {
      type: "object",
      properties: {
        min_count: { type: "integer", description: "Only include companies with at least this many postings.", minimum: 1 },
      },
    },
  },
  {
    name: "get_job_details",
    description: "Retrieve the full details of a single job posting by its ID (e.g. 'job-001').",
    parameters: {
      type: "object",
      properties: {
        job_id: { type: "string", description: "The unique job ID returned by search." },
      },
      required: ["job_id"],
    },
  },
  {
    name: "list_all_skills",
    description: "Return a sorted list of every unique skill that appears across all job postings.",
    parameters: { type: "object", properties: {} },
  },
];

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const apiKeyEl = document.getElementById("apiKey");
const statusEl = document.getElementById("status");

function addMsg(role, text) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = text;
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
  return div;
}

function getApiKey() {
  return localStorage.getItem("gemini_api_key") || apiKeyEl.value.trim();
}

document.getElementById("saveKey").addEventListener("click", () => {
  const key = apiKeyEl.value.trim();
  if (!key) {
    statusEl.textContent = "Enter a key first";
    statusEl.className = "err";
    return;
  }
  localStorage.setItem("gemini_api_key", key);
  statusEl.textContent = "Key saved";
  statusEl.className = "ok";
  apiKeyEl.value = "";
  apiKeyEl.placeholder = "•••••••• (saved)";
});

// Load saved key indicator
if (localStorage.getItem("gemini_api_key")) {
  statusEl.textContent = "Key loaded";
  statusEl.className = "ok";
  apiKeyEl.placeholder = "•••••••• (saved)";
}

document.querySelectorAll(".examples button").forEach((btn) => {
  btn.addEventListener("click", () => {
    inputEl.value = btn.dataset.q;
    send();
  });
});

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  }
});
sendBtn.addEventListener("click", send);

// ---------------------------------------------------------------------------
// Gemini chat with function calling
// ---------------------------------------------------------------------------

const history = []; // { role, parts }

async function callGemini(contents) {
  const key = getApiKey();
  if (!key) throw new Error("Please enter and save a Gemini API key first.");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
  const body = {
    contents,
    tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
    systemInstruction: {
      parts: [
        {
          text: "You are a helpful assistant with access to a job postings dataset via tools. "
            + "When the user asks about jobs, skills, or companies, call the appropriate tool. "
            + "Summarize results clearly. If a tool returns an error field, explain it politely.",
        },
      ],
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

async function send() {
  const text = inputEl.value.trim();
  if (!text) return;
  inputEl.value = "";
  addMsg("user", text);

  history.push({ role: "user", parts: [{ text }] });

  sendBtn.disabled = true;
  try {
    let data = await callGemini(history);
    let candidate = data.candidates?.[0];
    if (!candidate) throw new Error("No response from model");

    // Function-calling loop (max 5 rounds)
    for (let round = 0; round < 5; round++) {
      const parts = candidate.content?.parts || [];
      const fnCalls = parts.filter((p) => p.functionCall);
      if (fnCalls.length === 0) break;

      // Show tool calls
      for (const p of fnCalls) {
        addMsg("tool", `→ ${p.functionCall.name}(${JSON.stringify(p.functionCall.args || {})})`);
      }

      // Append model turn with function calls
      history.push({ role: "model", parts });

      // Execute tools and build function responses
      const responseParts = [];
      for (const p of fnCalls) {
        const name = p.functionCall.name;
        const args = p.functionCall.args || {};
        const impl = TOOL_IMPL[name];
        let result;
        if (!impl) {
          result = { error: `Unknown tool: ${name}` };
        } else {
          try {
            result = impl(args);
          } catch (e) {
            result = { error: e.message };
          }
        }
        responseParts.push({
          functionResponse: { name, response: result },
        });
        addMsg("tool", `← ${name}: ${JSON.stringify(result).slice(0, 300)}${JSON.stringify(result).length > 300 ? "…" : ""}`);
      }

      history.push({ role: "user", parts: responseParts });

      data = await callGemini(history);
      candidate = data.candidates?.[0];
      if (!candidate) break;
    }

    // Final text
    const textParts = (candidate.content?.parts || []).filter((p) => p.text);
    const reply = textParts.map((p) => p.text).join("") || "(no text response)";
    addMsg("assistant", reply);
    history.push({ role: "model", parts: [{ text: reply }] });
  } catch (err) {
    addMsg("system", `Error: ${err.message}`);
  } finally {
    sendBtn.disabled = false;
  }
}
