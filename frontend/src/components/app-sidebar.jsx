import {
  SlidersHorizontal,
  FolderOpen,
  Wrench,
  FileCode,
  Globe,
  Bot,
  Layers,
  Code,
  Network,
  GitBranch,
  ChevronsUpDown,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"

const createItems = [
  { id: "tools", title: "Toolsets", icon: SlidersHorizontal },
  { id: "ingest", title: "Your APIs", icon: FolderOpen },
  { id: "custom-tools", title: "Custom Tools", icon: Wrench },
  { id: "prompts", title: "Prompts", icon: FileCode },
  { id: "environments", title: "Environments", icon: Globe },
]

const consumeItems = [
  { id: "workflows", title: "Workflow Proxy", icon: GitBranch },
  { id: "playground", title: "Playground", icon: Bot },
  { id: "dag", title: "DAG Viewer", icon: Network },
  { id: "mcp", title: "MCP", icon: Layers },
  { id: "sdks", title: "SDKs", icon: Code },
]

export function AppSidebar({ activePage, onPageChange }) {
  return (
    <Sidebar collapsible="icon" className="border-r border-[#D0CECA] bg-[#E3E1DC]">
      <SidebarHeader className="px-5 pb-2 pt-6 group-data-[collapsible=icon]:px-0">
        <div className="flex items-center justify-between gap-2">
          {/* full wordmark (expanded) */}
          <span className="wordmark-dell text-[22px] leading-none text-[#111827] group-data-[collapsible=icon]:hidden">
            OneMCP
          </span>
          {/* compact mark (collapsed rail) */}
          <span className="wordmark-dell mx-auto hidden text-[22px] leading-none text-[#111827] group-data-[collapsible=icon]:block">
            O
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent className="gap-5 px-3 py-4">
        {/* CREATE SECTION */}
        <div className="space-y-1">
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#787670] group-data-[collapsible=icon]:hidden">Create</span>
          <SidebarMenu className="mt-1">
            {createItems.map((item) => {
              const isActive = activePage === item.id || (item.id === "tools" && activePage === "tools")
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.title}
                    onClick={() => !item.disabled && onPageChange(item.id)}
                    className={`rounded-lg text-[#55534E] font-medium transition-all duration-150 hover:bg-[#D4D2CD] hover:text-[#111827] data-active:bg-[#D4D2CD] data-active:text-[#111827] data-active:shadow-none ${item.disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                      }`}
                  >
                    <item.icon className="size-4" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </div>

        {/* CONSUME SECTION */}
        <div className="space-y-1">
          <span className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#787670] group-data-[collapsible=icon]:hidden">Consume</span>
          <SidebarMenu className="mt-1">
            {consumeItems.map((item) => {
              const isActive = activePage === item.id
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    isActive={isActive}
                    tooltip={item.title}
                    onClick={() => !item.disabled && onPageChange(item.id)}
                    className={`rounded-lg text-[#55534E] font-medium transition-all duration-150 hover:bg-[#D4D2CD] hover:text-[#111827] data-active:bg-[#D4D2CD] data-active:text-[#111827] data-active:shadow-none ${item.disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
                      }`}
                  >
                    <item.icon className="size-4" />
                    <span className="group-data-[collapsible=icon]:hidden">{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </div>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}

