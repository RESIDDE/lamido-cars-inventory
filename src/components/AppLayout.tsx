import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully.");
    navigate("/auth");
  };

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Admin";

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-background transition-colors duration-300">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 bg-background sm:rounded-l-[2rem] sm:border-l sm:border-y sm:my-2 sm:mr-2 shadow-2xl relative overflow-hidden transition-all duration-300">
          <header className="sticky top-0 z-30 h-16 flex items-center border-b border-border/40 bg-background/40 backdrop-blur-xl px-4 sm:px-6 gap-2 print:hidden">
            <SidebarTrigger className="mr-2 -ml-2 rounded-full hover:bg-primary/10 transition-colors" />
            <img src={logo} alt="Lamido Cars logo" className="h-6 w-6 sm:h-8 sm:w-8 object-contain" />
            <span className="text-sm sm:text-lg font-heading font-semibold tracking-tight text-foreground truncate flex-1 uppercase tracking-widest">
              Lamido
            </span>

            {/* User info + Logout */}
            <div className="flex items-center gap-2 sm:gap-3 ml-auto shrink-0">
              <div className="flex items-center gap-2 bg-foreground/5 border border-foreground/10 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full max-w-[120px] sm:max-w-none">
                <div className="h-6 w-6 rounded-full overflow-hidden shrink-0 border border-primary/20">
                  {profile?.avatar_url ? (
                    <img src={`${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}t=${new Date(profile.updated_at || Date.now()).getTime()}`} className="w-full h-full object-cover" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-amber-500 m-auto" />
                  )}
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-foreground truncate">{displayName}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="rounded-full hover:bg-destructive/10 hover:text-destructive transition-all gap-1.5 text-muted-foreground text-xs font-semibold"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 p-3 sm:p-6 md:p-8 overflow-auto animate-fade-up">
            <div className="mx-auto max-w-7xl h-full w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
