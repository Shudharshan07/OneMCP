"""
FastMCP server — bridges agent clients (Cursor, Claude Desktop, Windsurf, VS Code, …) to the OneMCP proxy layer.
Run independently with: fastmcp run app/mcp_server.py
"""
import json
import sys
import os

# Make storage importable when run directly via fastmcp CLI
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

import httpx
from fastmcp import FastMCP
from pydantic import BaseModel, Field
from app.storage import load_storage

mcp = FastMCP("OneMCP")


# ---------------------------------------------------------------------------
# Generic dynamic tool executor — works for any ingested source
# ---------------------------------------------------------------------------

class ToolCallArgs(BaseModel):
    source_id: str = Field(..., description="The ingested source ID (e.g. 'stripe', 'hubspot').")
    operation_id: str = Field(..., description="The operationId of the endpoint to call.")
    path_params: dict = Field(default_factory=dict, description="Path parameter substitutions, e.g. {id: '123'}.")
    query_params: dict = Field(default_factory=dict, description="Query string parameters.")
    body: dict = Field(default_factory=dict, description="Request body for POST/PUT/PATCH calls.")


@mcp.tool()
async def call_api_tool(args: ToolCallArgs) -> str:
    """
    Dynamically executes any ingested API operation by source_id + operation_id.
    Resolves base URL and credentials automatically from local storage.
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                "http://127.0.0.1:8000/api/v1/proxy/call",
                json=args.model_dump(),
            )
            return json.dumps(response.json(), indent=2)
        except Exception as e:
            return f"❌ Proxy request failed: {str(e)}"


# ---------------------------------------------------------------------------
# Convenience tools
# ---------------------------------------------------------------------------

@mcp.tool()
async def list_sources() -> str:
    """Lists all ingested API sources available in local storage."""
    storage = load_storage()
    sources = {
        sid: {"base_url": s.get("base_url"), "total_tools": len(s.get("tools", {}))}
        for sid, s in storage["sources"].items()
    }
    return json.dumps(sources, indent=2) if sources else "No sources ingested yet."


@mcp.tool()
async def list_tools_for_source(source_id: str) -> str:
    """Returns all available operation IDs and descriptions for a given source."""
    storage = load_storage()
    source = storage["sources"].get(source_id)
    if not source:
        return f"Source '{source_id}' not found."
    tools = [
        {"operation_id": t["operation_id"], "method": t["method"], "path": t["path"], "name": t["name"]}
        for t in source["tools"].values()
    ]
    return json.dumps(tools, indent=2)


@mcp.tool()
async def run_workflow(workflow_id: str) -> str:
    """Executes a saved multi-step workflow by its workflow_id."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(
                f"http://127.0.0.1:8000/api/v1/proxy/workflow/{workflow_id}"
            )
            return json.dumps(response.json(), indent=2)
        except Exception as e:
            return f"❌ Workflow execution failed: {str(e)}"


# ---------------------------------------------------------------------------
# Workflow management
# ---------------------------------------------------------------------------

class WorkflowStep(BaseModel):
    source_id: str
    operation_id: str
    path_params: dict = Field(default_factory=dict)
    query_params: dict = Field(default_factory=dict)
    body: dict = Field(default_factory=dict)


class SaveWorkflowArgs(BaseModel):
    workflow_id: str = Field(..., description="Unique name/slug for this workflow.")
    description: str = Field("", description="Human-readable description of what this workflow does.")
    steps: list[WorkflowStep] = Field(..., description="Ordered list of API calls to execute.")


@mcp.tool()
async def save_workflow(args: SaveWorkflowArgs) -> str:
    """Saves a multi-step workflow to local storage for later execution."""
    storage = load_storage()
    storage["workflows"][args.workflow_id] = {
        "description": args.description,
        "steps": [s.model_dump() for s in args.steps],
    }
    from app.storage import save_storage
    save_storage(storage)
    return f"✅ Workflow '{args.workflow_id}' saved with {len(args.steps)} steps."


# ---------------------------------------------------------------------------
# Register WORKFLOW-LEVEL tools (the Workflow Proxy output)
#
# Instead of one MCP tool per endpoint (100-500+ tools, 50k+ tokens), we expose
# one coarse tool per workflow cluster (~10-30 tools). Each takes an `operation`
# selector + generic params and dispatches through the workflow execute endpoint.
# ---------------------------------------------------------------------------
import re
from app.workflows import cluster_source, workflow_tool_schema, namespaced_tool_name

BACKEND = "http://127.0.0.1:8000"


# ---------------------------------------------------------------------------
# Enhancement 1 — progressive disclosure: search + describe MCP tools.
# Workflow tools are registered with DEFERRED (catalog-free) descriptions; the
# agent uses these two tools to discover specific operations on demand.
# ---------------------------------------------------------------------------
@mcp.tool()
async def search_operations(source_id: str, query: str) -> str:
    """Search a source's workflow operations by keyword (operation_id, summary,
    path). Returns up to 10 matches with their workflow_id, method, path. Use
    this to find the right `operation` before calling a workflow tool."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            r = await client.get(f"{BACKEND}/api/v1/workflows/search",
                                  params={"source_id": source_id, "query": query})
            return json.dumps(r.json(), indent=2)
        except Exception as e:
            return f"❌ search_operations failed: {str(e)}"


@mcp.tool()
async def describe_operation(source_id: str, operation_id: str) -> str:
    """Return the full input schema (path/query/body params) for one operation,
    plus its owning workflow_id. Call after search_operations to learn exactly
    what params an operation needs."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            r = await client.get(f"{BACKEND}/api/v1/workflows/operation",
                                  params={"source_id": source_id, "operation_id": operation_id})
            return json.dumps(r.json(), indent=2)
        except Exception as e:
            return f"❌ describe_operation failed: {str(e)}"


def make_workflow_tool(sid: str, wf_id: str):
    async def workflow_tool(
        operation: str,
        path_params: dict = {},
        query_params: dict = {},
        body: dict = {},
    ) -> str:
        """Executes one operation (or the __report__ orchestration) within this workflow."""
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    "http://127.0.0.1:8000/api/v1/workflows/execute",
                    json={
                        "source_id": sid,
                        "workflow_id": wf_id,
                        "operation": operation,
                        "path_params": path_params,
                        "query_params": query_params,
                        "body": body,
                    },
                )
                return json.dumps(response.json(), indent=2)
            except Exception as e:
                return f"❌ Workflow execution failed: {str(e)}"
    return workflow_tool


@mcp.tool()
async def propose_workflow(
    source_id: str,
    name: str,
    description: str,
    workflow_id: str,
    steps: list[dict],
) -> str:
    """Propose a new multi-step workflow for human review and approval.

    The workflow will appear in the Workflow Proxy UI under 'Pending Approvals'
    where a human operator can inspect, edit, and approve or reject it before
    it becomes a runnable named plan. DO NOT execute any steps directly —
    submit them here and wait for approval.

    Args:
        source_id: The ingested API source this workflow targets.
        name: snake_case name for the workflow (e.g. 'fetch_server_health').
        description: One-line description of what this workflow accomplishes.
        workflow_id: The owning wf_* cluster id to attach this plan to.
        steps: Ordered list of steps, each {operation_id, path_params?, query_params?, body?}.
    """
    from app.storage import save_storage
    storage = load_storage()
    pending = storage.setdefault("pending_workflows", [])
    import re, time
    slug = re.sub(r"[^a-z0-9_]", "_", (name or "workflow").lower()).strip("_") or "workflow"
    pending.append({
        "id": f"{slug}_{int(time.time())}",
        "name": slug,
        "description": description or "",
        "source_id": source_id,
        "workflow_id": workflow_id,
        "steps": steps or [],
        "proposed_at": int(time.time()),
        "status": "pending",
    })
    save_storage(storage)
    return f"✅ Workflow '{slug}' submitted for human review. It will appear in the Workflow Proxy UI under 'Pending Approvals'. Do not execute until approved."


REGISTRATION = {"registered": 0, "sources": 0, "errors": []}
try:
    storage = load_storage()
    _taken: set[str] = set()
    for source_id, source_data in storage.get("sources", {}).items():
        try:
            workflows = (storage.get("workflow_defs") or {}).get(source_id) or cluster_source(source_data)
            for wf in workflows:
                try:
                    schema = workflow_tool_schema(wf, defer_catalog=True)
                    # unified name sanitizer (shared with the agent + workflow layers)
                    clean_name = namespaced_tool_name(source_id, wf["id"], _taken)
                    mcp.tool(name=clean_name, description=schema["description"])(
                        make_workflow_tool(source_id, wf["id"])
                    )
                    REGISTRATION["registered"] += 1
                except Exception as e:  # one bad workflow must not nuke the whole server
                    REGISTRATION["errors"].append(f"{source_id}/{wf.get('id')}: {e}")
            REGISTRATION["sources"] += 1
        except Exception as e:
            REGISTRATION["errors"].append(f"{source_id}: {e}")
    _msg = (f"[OK] Registered {REGISTRATION['registered']} workflow-level MCP tools across "
            f"{REGISTRATION['sources']} source(s).")
    if REGISTRATION["errors"]:
        _msg += f" {len(REGISTRATION['errors'])} registration error(s)."
    print(_msg)
except Exception as e:
    REGISTRATION["errors"].append(f"fatal: {e}")
    print(f"[WARN] Failed to register workflow tools: {e}")

# Persist registration health so the FastAPI /mcp/status dashboard can surface it
# (the MCP server and the REST API are separate processes).
try:
    _regpath = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".mcp_registration.json")
    with open(_regpath, "w", encoding="utf-8") as _f:
        json.dump(REGISTRATION, _f)
except Exception:
    pass


@mcp.tool()
async def registration_status() -> str:
    """Report how many workflow tools this MCP server registered at startup, and any errors."""
    return json.dumps(REGISTRATION, indent=2)

