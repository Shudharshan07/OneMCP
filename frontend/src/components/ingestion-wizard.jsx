import { useRef, useState } from "react"
import { CheckCircle2, FileCode2, Loader2, Terminal, UploadCloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const API_BASE = ""

const fallbackTools = [
  {
    id: "get_customers",
    method: "GET",
    path: "/customers",
    description: "List customer records with pagination and status filters.",
    parameters: ["page", "limit", "status"],
    selected: true,
  },
  {
    id: "create_ticket",
    method: "POST",
    path: "/tickets",
    description: "Create a support ticket and assign it to the correct team.",
    parameters: ["customer_id", "priority", "summary"],
    selected: true,
  },
  {
    id: "update_subscription",
    method: "PATCH",
    path: "/subscriptions/{id}",
    description: "Modify billing terms, renewal dates, or subscription status.",
    parameters: ["id", "plan", "renewal_date"],
    selected: false,
  },
]

function normalizeTools(rawTools = []) {
  return rawTools.map((tool, index) => ({
    id: tool.id ?? tool.name ?? `${tool.method ?? "TOOL"}_${tool.path ?? index}`,
    method: tool.method ?? "POST",
    path: tool.path ?? tool.name ?? `tool_${index + 1}`,
    description: tool.description ?? tool.summary ?? "Generated MCP tool route.",
    parameters: tool.parameters ?? tool.args ?? [],
    selected: index < 8,
  }))
}

export function IngestionWizard({ onIngestionComplete }) {
  const fileRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState([
    "Workspace ready.",
    "Drop an OpenAPI JSON/YAML file to start route normalization.",
  ])
  const [lastFile, setLastFile] = useState("")
  const [toolCount, setToolCount] = useState(0)

  const appendLog = (line) => setLogs((current) => [...current, line])

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    setLastFile(file.name)
    setLogs([
      `Selected ${file.name}.`,
      "Initializing OpenAPI file validation...",
      "Reading schema endpoints...",
    ])

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch(`${API_BASE}/api/v1/ingest`, {
        method: "POST",
        body: formData,
      })

      if (!response.ok) throw new Error(`HTTP ${response.status}`)

      const data = await response.json()
      const nextTools = normalizeTools(data.tools ?? [])
      setToolCount(data.total_tools ?? nextTools.length)
      appendLog(`Found ${data.total_tools ?? nextTools.length} distinct operational routes.`)
      appendLog("Syncing tool mappings to state matrix...")
      onIngestionComplete(nextTools)
    } catch {
      appendLog("Backend ingestion unavailable. Loaded a local sample tool matrix for UI work.")
      setToolCount(fallbackTools.length)
      onIngestionComplete(fallbackTools)
    } finally {
      setLoading(false)
      event.target.value = ""
    }
  }

  return (
    <section className="h-full overflow-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 p-4 lg:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-neutral-100">Ingest OpenAPI Definition</h2>
                <p className="mt-1 max-w-2xl text-sm text-neutral-400">
                  Transform raw API documentation routes into unified executable MCP tool objects.
                </p>
              </div>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-cyan-500/15 text-cyan-300">
                <FileCode2 className="size-5" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex min-h-56 w-full flex-col items-center justify-center rounded-lg border border-dashed border-neutral-700 bg-neutral-950 px-4 text-center transition hover:border-cyan-400 hover:bg-neutral-900"
            >
              <UploadCloud className="mb-3 size-9 text-cyan-300" />
              <span className="text-sm font-medium text-neutral-100">Choose OpenAPI JSON or YAML</span>
              <span className="mt-1 text-xs text-neutral-500">Parser logs and route counts stream below after upload.</span>
            </button>

            <Input
              ref={fileRef}
              type="file"
              accept=".json,.yaml,.yml"
              onChange={handleFileUpload}
              disabled={loading}
              className="hidden"
            />

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button onClick={() => fileRef.current?.click()} disabled={loading} className="bg-cyan-400 text-neutral-950 hover:bg-cyan-300">
                {loading ? <Loader2 className="animate-spin" /> : <UploadCloud />}
                Upload Spec
              </Button>
              {lastFile && <span className="text-xs text-neutral-500">{lastFile}</span>}
            </div>
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
            <h3 className="text-sm font-semibold text-neutral-100">Ingestion Status</h3>
            <div className="mt-4 grid gap-3">
              <div className="rounded-md border border-neutral-800 bg-neutral-950 p-3">
                <p className="text-xs text-neutral-500">Generated tools</p>
                <p className="mt-1 text-2xl font-semibold text-neutral-100">{toolCount}</p>
              </div>
              <div className="rounded-md border border-neutral-800 bg-neutral-950 p-3">
                <p className="text-xs text-neutral-500">State</p>
                <p className="mt-1 flex items-center gap-2 text-sm text-emerald-300">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                  {loading ? "Parsing" : "Ready"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900">
          <div className="flex items-center gap-2 border-b border-neutral-800 px-4 py-3">
            <Terminal className="size-4 text-emerald-300" />
            <h3 className="text-sm font-semibold text-neutral-100">Parser Terminal</h3>
          </div>
          <div className="max-h-64 overflow-y-auto bg-neutral-950 p-4 font-mono text-xs text-emerald-300">
            {logs.map((log, index) => (
              <div key={`${log}-${index}`}>&gt; {log}</div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
