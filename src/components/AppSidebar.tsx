import {
  LayoutDashboard, Car, Users, MessageSquare,
  FileText, FileSignature, Crown, Receipt, BarChart3, LogOut,
} from "lucide-react";
import { NairaIcon } from "@/components/NairaIcon";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { getAccessiblePages, type AppRole, type PageKey } from "@/lib/permissions";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

type NavItem = {
  title: string;
  url: string;
  pageKey: PageKey | "settings";
  icon: React.ComponentType<{ className?: string }>;
};

const ALL_NAV_ITEMS: NavItem[] = [
  { title: "Dashboard",        url: "/dashboard",          pageKey: "dashboard",          icon: LayoutDashboard },
  { title: "Lamido Vehicles",  url: "/vehicles",           pageKey: "vehicles",           icon: Car },
  { title: "Customers",        url: "/customers",          pageKey: "customers",          icon: Users },
  { title: "Sales",            url: "/sales",              pageKey: "sales",              icon: (props) => <NairaIcon {...props} /> },
  { title: "Proforma Quotes",  url: "/performance-quotes", pageKey: "performance-quotes", icon: FileSignature },
  { title: "Company Expenses", url: "/expenses",           pageKey: "expenses",           icon: Receipt },
  { title: "Inquiries",        url: "/inquiries",          pageKey: "inquiries",          icon: MessageSquare },
  { title: "Auth. Form",       url: "/authority-to-sell",  pageKey: "authority-to-sell",  icon: FileSignature },
  { title: "Adv. Report",      url: "/report",             pageKey: "dashboard",          icon: BarChart3 },
];

const PREFETCH_MAP: Record<string, () => Promise<any>> = {
  "/dashboard":          () => import("@/pages/Index"),
  "/vehicles":           () => import("@/pages/VehiclesList"),
  "/customers":          () => import("@/pages/Customers"),
  "/sales":              () => import("@/pages/Sales"),
  "/performance-quotes": () => import("@/pages/PerformanceQuotes"),
  "/expenses":           () => import("@/pages/Expenses"),
  "/inquiries":          () => import("@/pages/Inquiries"),
  "/authority-to-sell":  () => import("@/pages/AuthorityToSell"),
  "/report":             () => import("@/pages/AdvancedReport"),
  "/settings":           () => import("@/pages/Settings"),
};

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { role } = useAuth();
  const { permissions } = usePermissions();
  const navigate = useNavigate();

  const isSuperAdmin = role === "admin";

  const accessiblePages = getAccessiblePages(role as AppRole | null, permissions);
  const visibleItems = ALL_NAV_ITEMS.filter((item) =>
    accessiblePages.includes(item.pageKey as PageKey)
  );

  const handleNavClick = () => setOpenMobile(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully.");
    navigate("/auth");
  };

  const handlePrefetch = (url: string) => {
    try {
      PREFETCH_MAP[url]?.();
    } catch (e) {}
  };

  return (
    <Sidebar
      collapsible="icon"
      className="bg-sidebar border-r border-sidebar-border"
    >
      {/* ── Nav ──────────────────────────────────────────── */}
      <SidebarContent className="flex flex-col justify-between h-full">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] uppercase tracking-widest font-black px-4 pt-4 pb-2">
            Menu
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <div className="px-2 py-0.5">
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      onClick={handleNavClick}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 w-full"
                      activeClassName="text-sidebar-foreground font-semibold bg-sidebar-accent shadow-sm"
                      onMouseEnter={() => handlePrefetch(item.url)}
                    >
                      {(() => { const Icon = item.icon; return <Icon className="h-[18px] w-[18px] shrink-0 opacity-80" />; })()}
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </div>
                </SidebarMenuItem>
              ))}

              {/* Settings — only for admin */}
              {isSuperAdmin && (
                <SidebarMenuItem>
                  <div className="px-2 py-0.5">
                    <NavLink
                      to="/settings"
                      onClick={handleNavClick}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 w-full"
                      activeClassName="text-sidebar-foreground font-semibold bg-sidebar-accent shadow-sm"
                      onMouseEnter={() => handlePrefetch("/settings")}
                    >
                      <Crown className="h-[18px] w-[18px] shrink-0 opacity-80" />
                      {!collapsed && <span>Settings</span>}
                    </NavLink>
                  </div>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ── Sign Out Button at Bottom ──────────────────── */}
        <div className="p-3 mt-auto border-t border-sidebar-border/60">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
            title="Sign Out"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0 text-destructive/80" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
