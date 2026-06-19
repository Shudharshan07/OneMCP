import { useMemo, useState } from "react"
import { Check, Search, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const sampleTools = [
  {
    id: "get_orders",
    method: "GET",
    path: "/orders",
    description: "Retrieve orders filtered by status, date range, or customer.",
    parameters: ["status", "from", "to", "customer_id"],
    selected: true,
  },
  {
    id: "refund_payment",
    method: "POST",
    path: "/payments/{id}/refund",
    description: "Refund a captured payment in cents with an audit reason.",
    parameters: ["id", "amount_cents", "reason"],
    selected: true,
  },
  {
    id: "list_inventory",
    method: "GET",
    path: "/inventory",
    description: "List SKU inventory counts by warehouse and reorder state.",
    parameters: ["warehouse_id", "sku", "low_stock"],
    selected: false,
  },
]

export function ToolsetManager({ tools, onToolsChange }) {
  const visibleTools = tools.length ? tools : sampleTools
  const [query, setQuery] = useState("")

  const filteredTools = useMemo(() => {
    const needle = query.toLowerCase()
    return visibleTools.filter((tool) =>
      [tool.id, tool.path, tool.method, tool.description].join(" ").toLowerCase().includes(needle)
    )
  }, [query, visibleTools])

  const selectedTools = visibleTools.filter((tool) => tool.selected)

  const updateTool = (id, patch) => {
    const source = tools.length ? tools : visibleTools
    onToolsChange(source.map((tool) => (tool.id === id ? { ...tool, ...patch } : tool)))
  }

  return (
    <section className="grid h-full min-h-0 grid-rows-[auto_1fr] overflow-hidden">
      <div className="border-b border-neutral-800 bg-neutral-900/50 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-neutral-100">Dynamic Toolset Manager</h2>
            <p className="text-xs text-neutral-500">Keep curated groups focused: 5-30 tools is the recommended operating window.</p>
          </div>
          <div className="rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-neutral-300">
            {selectedTools.length} selected
          </div>
        </div>
      </div>

      <div className="grid min-h-0 gap-4 p-4 lg:grid-cols-[minmax(19rem,0.9fr)_minmax(0,1.1fr)]">
        <div className="flex min-h-0 flex-col rounded-lg border border-neutral-800 bg-neutral-900">
          <div className="border-b border-neutral-800 p-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 size-4 text-neutral-500" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search parsed routes"
                className="border-neutral-800 bg-neutral-950 pl-8 text-sm"
              />
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {filteredTools.map((tool) => (
              <label key={tool.id} className="mb-2 flex cursor-pointer gap-3 rounded-md border border-neutral-800 bg-neutral-950 p-3 hover:border-neutral-700">
                <input
                  type="checkbox"
                  checked={Boolean(tool.selected)}
                  onChange={(event) => updateTool(tool.id, { selected: event.target.checked })}
                  className="mt-1 size-4 accent-cyan-400"
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300">{tool.method}</span>
                    <span className="truncate font-mono text-xs text-neutral-100">{tool.path}</span>
                  </span>
                  <span className="mt-1 block line-clamp-2 text-xs text-neutral-500">{tool.description}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-col rounded-lg border border-neutral-800 bg-neutral-900">
          <div className="flex items-center gap-2 border-b border-neutral-800 px-4 py-3">
            <Settings2 className="size-4 text-cyan-300" />
            <h3 className="text-sm font-semibold text-neutral-100">Curated Tool Configuration</h3>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {selectedTools.length === 0 && (
              <div className="flex h-full items-center justify-center rounded-md border border-dashed border-neutral-800 text-sm text-neutral-500">
                Select routes from the left pane to configure tool metadata.
              </div>
            )}

            <div className="space-y-3">
              {selectedTools.map((tool) => (
                <details key={tool.id} open className="rounded-lg border border-neutral-800 bg-neutral-950">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-xs text-neutral-100">{tool.id}</span>
                      <span className="text-xs text-neutral-500">{tool.method} {tool.path}</span>
                    </span>
                    <Check className="size-4 shrink-0 text-emerald-300" />
                  </summary>
                  <div className="space-y-3 border-t border-neutral-800 p-4">
                    <label className="block">
                      <span className="mb-1 block text-xs text-neutral-500">Description override</span>
                      <textarea
                        value={tool.description}
                        onChange={(event) => updateTool(tool.id, { description: event.target.value })}
                        className="min-h-20 w-full resize-none rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-cyan-400"
                      />
                    </label>
                    <div>
                      <p className="mb-2 text-xs text-neutral-500">Parameters</p>
                      <div className="flex flex-wrap gap-2">
                        {(tool.parameters ?? []).map((parameter) => (
                          <span key={parameter} className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 font-mono text-xs text-neutral-300">
                            {parameter}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>

          <div className="border-t border-neutral-800 p-3">
            <Button className="w-full bg-cyan-400 text-neutral-950 hover:bg-cyan-300" disabled={selectedTools.length === 0}>
              Save Toolset
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
