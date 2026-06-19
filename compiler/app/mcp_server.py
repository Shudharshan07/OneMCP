"""
FastMCP server — bridges agent clients (Cursor, Claude Desktop) to the Gram proxy layer.
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

mcp = FastMCP("Local API Proxy")


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
# Dynamically register all ingested OpenAPI tools
# ---------------------------------------------------------------------------
import re

def make_dynamic_tool(sid: str, oid: str):
    async def dynamic_tool(
        path_params: dict = {},
        query_params: dict = {},
        body: dict = {}
    ) -> str:
        """Dynamically executes this specific OpenAPI tool."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    "http://127.0.0.1:8000/api/v1/proxy/call",
                    json={
                        "source_id": sid,
                        "operation_id": oid,
                        "path_params": path_params,
                        "query_params": query_params,
                        "body": body
                    },
                )
                return json.dumps(response.json(), indent=2)
            except Exception as e:
                return f"❌ Tool execution failed: {str(e)}"
    return dynamic_tool

try:
    storage = load_storage()
    for source_id, source_data in storage.get("sources", {}).items():
        for op_id, tool_data in source_data.get("tools", {}).items():
            # FastMCP tool names must match ^[a-zA-Z0-9_-]+$
            clean_name = re.sub(r'[^a-zA-Z0-9_-]', '_', op_id)
            description = tool_data.get("description", f"Execute {op_id} on {source_id}")
            
            # Register the dynamic tool on the FastMCP instance
            mcp.tool(name=clean_name, description=description)(
                make_dynamic_tool(source_id, op_id)
            )
except Exception as e:
    print(f"⚠️ Failed to dynamically register tools: {e}")

