import { useMemo, useState } from "react"
import { Bot, Clock3, Play, Send, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const cannedTrace = [
  { id: 1, label: "Intent parsed", detail: "Mapped request to curated toolset", duration: "82ms" },
  { id: 2, label: "Tool selected", detail: "refund_payment with amount_cents argument", duration: "141ms" },
  { id: 3, label: "Response synthesized", detail: "Validated payload and generated final answer", duration: "64ms" },
]

export function AgentPlayground({ tools }) {
  const selectedTools = useMemo(() => tools.filter((tool) => tool.selected), [tools])
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Ready to test the current MCP toolset." },
  ])
  const [trace, setTrace] = useState(cannedTrace.slice(0, 1))

  const sendMessage = (event) => {
    event.preventDefault()
    const trimmed = message.trim()
    if (!trimmed) return

    setMessages((current) => [
      ...current,
      { role: "user", content: trimmed },
      { role: "assistant", content: "Simulated run complete. The trace drawer has the execution chain." },
    ])
    setTrace(cannedTrace)
    setMessage("")
  }

  return (
    <section className="grid h-full min-h-0 overflow-hidden lg:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="flex min-h-0 flex-col border-r border-neutral-800">
        <div className="border-b border-neutral-800 bg-neutral-900/50 px-4 py-3">
          <h2 className="text-sm font-semibold text-neutral-100">Agent Playground</h2>
          <p className="text-xs text-neutral-500">Send prompts and inspect the execution chain as it develops.</p>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            {messages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={`max-w-[82%] rounded-lg border px-4 py-3 text-sm ${
                  item.role === "user"
                    ? "ml-auto border-cyan-500/30 bg-cyan-500/10 text-cyan-50"
                    : "border-neutral-800 bg-neutral-900 text-neutral-200"
                }`}
              >
                {item.content}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={sendMessage} className="border-t border-neutral-800 bg-neutral-900 p-3">
          <div className="mx-auto flex max-w-3xl gap-2">
            <Input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask the agent to perform a workflow"
              className="border-neutral-800 bg-neutral-950"
            />
            <Button type="submit" className="bg-cyan-400 text-neutral-950 hover:bg-cyan-300">
              <Send />
              Send
            </Button>
          </div>
        </form>
      </div>

      <aside className="flex min-h-0 flex-col bg-neutral-900">
        <div className="border-b border-neutral-800 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-neutral-100">Live Execution Trace</h3>
              <p className="text-xs text-neutral-500">{selectedTools.length || 0} curated tools available</p>
            </div>
            <Play className="size-4 text-cyan-300" />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mb-4 rounded-lg border border-neutral-800 bg-neutral-950 p-3">
            <div className="flex items-center gap-2 text-sm text-neutral-100">
              <Bot className="size-4 text-cyan-300" />
              Active Toolset
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(selectedTools.length ? selectedTools : tools.slice(0, 3)).map((tool) => (
                <span key={tool.id} className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 font-mono text-xs text-neutral-300">
                  {tool.id}
                </span>
              ))}
              {tools.length === 0 && <span className="text-xs text-neutral-500">No ingested tools yet.</span>}
            </div>
          </div>

          <div className="space-y-3">
            {trace.map((step) => (
              <div key={step.id} className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Wrench className="size-4 text-cyan-300" />
                    <span className="text-sm font-medium text-neutral-100">{step.label}</span>
                  </div>
                  <span className="flex items-center gap-1 text-xs text-neutral-500">
                    <Clock3 className="size-3" />
                    {step.duration}
                  </span>
                </div>
                <p className="mt-2 text-xs text-neutral-500">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </section>
  )
}
