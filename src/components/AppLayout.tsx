import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
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
      <div className="h-screen flex w-full bg-background text-foreground">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 sm:rounded-l-[2rem] sm:border-l sm:border-y sm:my-2 sm:mr-2 shadow-2xl relative overflow-hidden transition-all duration-300 bg-background/95 border-border/80">
          {/* Frosted-glass header */}
          <header className="sticky top-0 z-30 h-16 flex items-center px-4 sm:px-6 gap-2 print:hidden bg-background/80 backdrop-blur-xl border-b border-border/80">
            <SidebarTrigger className="mr-2 -ml-2 rounded-full hover:bg-muted transition-colors text-foreground/70 hover:text-foreground" />
            <img src={logo} alt="Lamido Cars logo" className="h-6 w-6 sm:h-8 sm:w-8 object-contain" />
            <span className="text-sm sm:text-lg font-heading font-semibold tracking-widest text-foreground truncate flex-1 uppercase">
              Lamido
            </span>

            {/* Actions: Theme Toggle + User Profile Badge */}
            <div className="flex items-center gap-2 sm:gap-3 ml-auto shrink-0">
              <ThemeToggle />

              <div className="flex items-center gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-muted/70 border border-border/80">
                <div className="h-6 w-6 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-background border border-border">
                  {profile?.avatar_url ? (
                    <img
                      src={`${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}t=${new Date(profile.updated_at || Date.now()).getTime()}`}
                      className="w-full h-full object-cover"
                      alt={displayName}
                    />
                  ) : (
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-foreground/90 truncate">{displayName}</span>
              </div>
            </div>
          </header>

          <main className="flex-1 p-3 sm:p-6 md:p-8 overflow-auto animate-fade-up custom-scrollbar">
            <div className="mx-auto max-w-7xl h-full w-full">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
