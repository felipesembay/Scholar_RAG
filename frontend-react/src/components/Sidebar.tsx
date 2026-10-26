import React from "react";
import {
  BarChart4,
  BookOpen,
  PenLine,
  FileText,
  FolderOpen,
  GraduationCap,
  HelpCircle,
  Home,
  MessageSquareQuote,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
} from "lucide-react";
import { useTheme } from "../hooks/useTheme";

interface SidebarProps {
  isCollapsed: boolean;
  activeSection: string;
  onToggle: () => void;
  onSectionChange: (section: string) => void;
  isMobile?: boolean;
}

interface NavItem {
  icon: React.ReactNode;
  label: string;
  key: string;
}

const ICON = "w-[18px] h-[18px]";
const GROUPS: { title?: string; items: NavItem[] }[] = [
  { items: [{ icon: <Home className={ICON} />, label: "Início", key: "Home" }] },
  {
    title: "Pesquisa",
    items: [
      { icon: <FolderOpen className={ICON} />, label: "Projetos", key: "Projetos" },
      { icon: <MessageSquareQuote className={ICON} />, label: "Chat com citações", key: "Chatbot" },
      { icon: <BookOpen className={ICON} />, label: "Biblioteca", key: "Biblioteca" },
      { icon: <PenLine className={ICON} />, label: "Escrita do artigo", key: "Artigo" },
    ],
  },
  {
    title: "Ferramentas",
    items: [
      { icon: <FileText className={ICON} />, label: "Sumarizador", key: "Sumarizador" },
      { icon: <BarChart4 className={ICON} />, label: "Dashboard", key: "Dashboard" },
    ],
  },
];

function NavButton({ item, active, collapsed, onClick }: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : `Navegar para ${item.label}`}
      aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-3 rounded-lg text-[14px] font-medium transition-colors
        ${collapsed ? "justify-center w-10 h-10 mx-auto" : "w-full px-3 py-2"}
        ${active
          ? "bg-primary-soft text-primary"
          : "text-ink-soft hover:bg-surface-muted hover:text-ink"}`}
    >
      <span className={active ? "text-primary" : "text-muted-foreground group-hover:text-ink"} aria-hidden="true">
        {item.icon}
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </button>
  );
}

export default function Sidebar({ isCollapsed, activeSection, onToggle, onSectionChange, isMobile = false }: SidebarProps) {
  const { theme, toggle } = useTheme();
  const collapsed = isCollapsed && !isMobile;

  return (
    <aside
      className={`sidebar-container flex flex-col h-full shrink-0 bg-surface border-r border-line transition-[width] duration-200
        ${collapsed ? "w-16" : "w-64"}`}
      aria-label="Menu principal"
    >
      <div className={`flex items-center h-16 border-b border-line ${collapsed ? "justify-center" : "justify-between px-4"}`}>
        {!collapsed && (
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
              <GraduationCap className="w-[18px] h-[18px]" />
            </span>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-ink leading-tight">ScholarRAG</div>
              <div className="text-[11px] text-muted-foreground leading-tight">Assistente de pesquisa</div>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="p-2 rounded-lg text-muted-foreground hover:bg-surface-muted hover:text-ink"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          aria-expanded={!collapsed}
        >
          {collapsed ? <PanelLeftOpen className="w-[18px] h-[18px]" /> : <PanelLeftClose className="w-[18px] h-[18px]" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 space-y-4" aria-label="Seções">
        {GROUPS.map((group, i) => (
          <div key={i} className={collapsed ? "space-y-1" : "px-3 space-y-0.5"}>
            {group.title && !collapsed && (
              <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </div>
            )}
            {group.items.map((item) => (
              <NavButton
                key={item.key}
                item={item}
                active={activeSection === item.key}
                collapsed={collapsed}
                onClick={() => onSectionChange(item.key)}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className={`border-t border-line py-3 space-y-0.5 ${collapsed ? "" : "px-3"}`}>
        <NavButton
          item={{ icon: <HelpCircle className={ICON} />, label: "Ajuda", key: "FAQ" }}
          active={activeSection === "FAQ"}
          collapsed={collapsed}
          onClick={() => onSectionChange("FAQ")}
        />
        <NavButton
          item={{
            icon: theme === "dark" ? <Sun className={ICON} /> : <Moon className={ICON} />,
            label: theme === "dark" ? "Tema claro" : "Tema escuro",
            key: "theme",
          }}
          active={false}
          collapsed={collapsed}
          onClick={toggle}
        />
        {!collapsed && <div className="px-3 pt-2 text-[11px] text-muted-foreground">v0.4 · mestrado</div>}
      </div>
    </aside>
  );
}
