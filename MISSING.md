# Missing Integration and Implementation Components

While reviewing the codebase and comparing it against the specifications in `Frontend.md` and the FastAPI/FastMCP source files, the following gaps and missing components remain:

## 1. Frontend Gaps

### Missing Credentials Management UI
- **Issue**: The backend exposes `/api/v1/credentials` to store API tokens/credentials for ingested sources, but there is no corresponding input form or management interface anywhere in the React frontend.
- **Impact**: Downstream proxy calls requiring Bearer authorization tokens fail unless tokens are manually injected directly into the `local_storage.json` file.

### Missing Workflow Builder Component (`CustomToolEditor.jsx`)
- **Issue**: `Frontend.md` specifies `CustomToolEditor.jsx` as a "Workflow builder canvas for meta-prompts". This file and its imports/references are completely missing from the codebase.
- **Impact**: Users cannot design composite, multi-step agentic workflows from the frontend, despite the backend supporting workflow execution.

---

## 2. FastMCP Connection Gaps

### Live Agent Playground & Trace Streaming
- **Issue**: The `AgentPlayground` is completely mocked. Sending a message displays a canned simulation response and a static trace.
- **Impact**: There is no live client connection to the FastMCP SSE/HTTP server running on port 8002, and no backend orchestration service to feed prompts to an LLM agent with access to the MCP tools.
- **SSE Client**: The frontend has no SSE/WebSocket connection to consume tool execution events or stream live execution chains as described in `Frontend.md`'s `useMcpStreaming.js` hook.

