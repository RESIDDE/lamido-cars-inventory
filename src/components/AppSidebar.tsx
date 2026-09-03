import {
  LayoutDashboard, Car, Users, MessageSquare,
  FileText, FileSignature, Crown,
} from "lucide-react";
import { NairaIcon } from "@/components/NairaIcon";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { getAccessiblePages, type AppRole, type PageKey } from "@/lib/permissions";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuItem,
  SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import logo from "@/assets/logo.png";

type NavItem = {
  title: string;
  url: string;
  pageKey: PageKey | "settings";
  icon: React.ComponentType<{ className?: string }>;
};

const ALL_NAV_ITEMS: NavItem[] = [
  { title: "Dashboard",       url: "/dashboard",          pageKey: "dashboard",          icon: LayoutDashboard },
  { title: "Lamido Vehicles", url: "/vehicles",           pageKey: "vehicles",           icon: Car },
  { title: "Customers",       url: "/customers",          pageKey: "customers",          icon: Users },
  { title: "Sales",           url: "/sales",              pageKey: "sales",              icon: (props) => <NairaIcon {...props} /> },
  { title: "Proforma Quotes", url: "/performance-quotes", pageKey: "performance-quotes", icon: FileSignature },
  { title: "Invoices",        url: "/invoices",           pageKey: "invoices",           icon: FileText },
  { title: "Inquiries",       url: "/inquiries",          pageKey: "inquiries",          icon: MessageSquare },
  { title: "Auth. Form",      url: "/authority-to-sell",  pageKey: "authority-to-sell",  icon: FileSignature },
];

export function AppSidebar() {
  const { state, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const { role, user, profile } = useAuth();
  const { permissions } = usePermissions();

  const isSuperAdmin = role === "admin";

  // Get accessible pages using live Supabase-backed permissions
  const accessiblePages = getAccessiblePages(role as AppRole | null, permissions);

  const visibleItems = ALL_NAV_ITEMS.filter((item) =>
    accessiblePages.includes(item.pageKey as PageKey)
  );

  const handleNavClick = () => {
    setOpenMobile(false);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border/10">
        <div className="flex items-center gap-3 mb-4">
          <img src={logo} alt="Lamido Cars logo" className="h-8 w-8 object-contain shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="text-sm font-black text-sidebar-primary uppercase tracking-[0.2em] leading-tight truncate">
                Lamido CarsMOBILE
              </h1>
            </div>
          )}
        </div>

        {/* User Profile Summary */}
        <NavLink to="/profile" onClick={handleNavClick} className="flex items-center gap-3 p-2 rounded-2xl hover:bg-sidebar-accent/50 transition-all duration-300 group">
          <Avatar className="h-10 w-10 border-2 border-primary/20 group-hover:border-primary transition-colors shrink-0 shadow-lg">
            <AvatarImage src={profile?.avatar_url ? `${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}t=${new Date(profile.updated_at || Date.now()).getTime()}` : ""} className="object-cover" />
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
              {profile?.display_name?.substring(0, 2).toUpperCase() || user?.email?.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-sidebar-foreground truncate leading-none">
                {profile?.display_name || "Set Name"}
              </p>
              <p className="text-[10px] text-sidebar-foreground/50 uppercase font-black tracking-widest mt-1.5 truncate">
                {role?.replace("_", " ") || "Member"}
              </p>
            </div>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <div className="py-1">
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      onClick={handleNavClick}
                      className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-300 hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground w-full"
                      activeClassName="bg-primary/10 text-primary font-semibold shadow-sm"
                    >
                      {(() => { const Icon = item.icon; return <Icon className="h-5 w-5 shrink-0" />; })()}
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </div>
                </SidebarMenuItem>
              ))}

              {/* Settings — only for admin */}
              {isSuperAdmin && (
                <SidebarMenuItem>
                  <div className="py-1">
                    <NavLink
                      to="/settings"
                      onClick={handleNavClick}
                      className="flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-300 hover:bg-amber-500/10 text-amber-500/70 hover:text-amber-500 w-full"
                      activeClassName="bg-amber-500/10 text-amber-500 font-semibold"
                    >
                      <Crown className="h-5 w-5 shrink-0" />
                      {!collapsed && <span>Settings</span>}
                    </NavLink>
                  </div>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
