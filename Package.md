# Bundle, Serve Frontend & Package as `.mcpb`

## Background

The project has two running pieces:
- **FastAPI backend** (`compiler/main.py`) on port **8000** — already serves the built frontend from `compiler/static/` via a catch-all route
- **MCP server** (`compiler/app/mcp_server.py`) on port **8002** via SSE

The frontend (Vite/React) already has `outDir: "../compiler/static"` set in `vite.config.js`, so one build deposits the SPA into the right place.

The `.mcpb` format is a **custom bundle format** (not an industry standard) — the simplest sane definition is a **ZIP archive** (renamed `.mcpb`) containing everything the MCP server needs to run, with a `manifest.json` that describes how to launch it. This is consistent with how tools like Cursor/Windsurf define "MCP bundles".

---

## Proposed Changes

### 1. Build & Serve Frontend

#### [MODIFY] [run.bat](file:///c:/All%20Files/Dell/run.bat)
Update the bat script to:
- Build the frontend (`npm run build`) — outputs to `compiler/static/`
- Copy the built dist into `compiler/static/` (already handled by `vite.config.js`)
- Start the FastAPI server which serves `compiler/static/index.html` for every non-API route
- Start the MCP SSE server
- Open the browser automatically to `http://localhost:8000`

#### [MODIFY] [main.py](file:///c:/All%20Files/Dell/compiler/main.py)
Verify that `StaticFiles` + catch-all route are solid. Minor fix: also mount the root `static/` dir to serve `index.html` and ensure assets are resolved correctly.

---

### 2. Package as `.mcpb`

A `.mcpb` file is a **ZIP archive** containing:

```
gram.mcpb  (ZIP inside)
├── manifest.json          ← describes name, entrypoint, transport, port
├── requirements.txt       ← Python deps for the MCP server
├── app/
│   ├── __init__.py
│   ├── mcp_server.py      ← fastmcp MCP server
│   ├── agent.py
│   ├── ingest.py
│   ├── proxy.py
│   ├── resources.py
│   ├── storage.py
│   └── workflows.py
├── static/                ← pre-built frontend (from npm run build)
│   ├── index.html
│   └── assets/
├── test_specs/            ← bundled sample specs
│   └── V3/
│       └── *.yaml
└── main.py                ← FastAPI entry point (serves frontend + API)
```

**`manifest.json`** will look like:
```json
{
  "name": "gram-api-proxy",
  "version": "1.0.0",
  "description": "Gram – API Proxy MCP Server with built-in UI",
  "entrypoint": "app/mcp_server.py",
  "transport": "sse",
  "port": 8002,
  "ui_server": "main.py",
  "ui_port": 8000,
  "runtime": "python",
  "install": "pip install -r requirements.txt"
}
```

#### [NEW] `package.bat` (root)
A one-shot script that:
1. Runs `npm run build` in `frontend/` → deposits dist into `compiler/static/`
2. Calls a Python packaging script to zip everything into `gram.mcpb`

#### [NEW] `package_mcpb.py` (root)
Python script that creates the ZIP archive as `gram.mcpb`.

---

## Verification Plan

### Automated
```bat
REM After running package.bat:
python -c "import zipfile; z=zipfile.ZipFile('gram.mcpb'); print(z.namelist())"
```

### Manual Verification
1. Run `package.bat` — confirm `gram.mcpb` is created in project root
2. Run `run.bat` — confirm browser opens at `http://localhost:8000` showing the full UI
3. Confirm MCP server is reachable at `http://localhost:8002/sse`

---

## Open Questions

> [!IMPORTANT]
> **What should go in the `.mcpb`?** Two options:
> - **Lean bundle** — only `app/`, `main.py`, `requirements.txt`, pre-built `static/`, and `manifest.json`. User installs Python deps themselves via `pip install -r requirements.txt`.
> - **Fat bundle** — same as above but also includes the `venv/` folder (large, ~100MB+, Windows-only paths).
>
> **Recommendation:** Lean bundle (no venv). Approved by default unless you say otherwise.

> [!NOTE]
> The `.mcpb` format is not a published standard. The manifest schema above is designed to be compatible with how Cursor/Windsurf expect MCP server configs. If you need compatibility with a specific MCP host, let me know and I'll adjust the manifest.
