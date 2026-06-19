import { useMemo, useState } from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppSidebar } from "@/components/app-sidebar"
import { DagViewer } from "@/components/dag-viewer"
import { IngestionWizard } from "@/components/ingestion-wizard"
import { ToolsetManager } from "@/components/toolset-manager"
import { AgentPlayground } from "@/components/agent-playground"

const pageMeta = {
  ingest: {
    title: "OpenAPI Ingestion",
    description: "Upload a schema and convert routes into executable MCP tools.",
  },
  tools: {
    title: "Toolset Manager",
    description: "Curate focused tool groups and tune metadata before agent use.",
  },
  playground: {
    title: "Agent Playground",
    description: "Test prompts against a live execution trace workspace.",
  },
  dag: {
    title: "DAG Viewer",
    description: "Endpoint dependency graph.",
  },
}

export default function App() {
  const [activePage, setActivePage] = useState("ingest")
  const [tools, setTools] = useState([])

  const currentPage = pageMeta[activePage]
  const pageContent = useMemo(() => {
    if (activePage === "ingest") {
      return <IngestionWizard onIngestionComplete={setTools} />
    }

    if (activePage === "tools") {
      return <ToolsetManager tools={tools} onToolsChange={setTools} />
    }

    if (activePage === "playground") {
      return <AgentPlayground tools={tools} />
    }

    return <DagViewer />
  }, [activePage, tools])

  return (
    <div className="dark min-h-screen bg-neutral-950 text-white antialiased">
      <TooltipProvider>
        <SidebarProvider>
          <AppSidebar activePage={activePage} onPageChange={setActivePage} />
          <main className="flex flex-1 flex-col overflow-hidden">
            <header className="flex items-center gap-3 border-b border-neutral-800 bg-neutral-950 px-3 py-2.5">
              <SidebarTrigger className="text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-md" />
              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold text-neutral-100">{currentPage.title}</h1>
                <p className="truncate text-xs text-neutral-500">{currentPage.description}</p>
              </div>
            </header>
            <div className="flex-1 overflow-hidden bg-neutral-950">
              {pageContent}
            </div>
          </main>
        </SidebarProvider>
      </TooltipProvider>
    </div>
  )
}
