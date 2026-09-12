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
      <div className="h-screen flex w-full" style={{ background: "hsl(0 0% 4%)" }}>
        <AppSidebar />
        <div
          className="flex-1 flex flex-col min-w-0 sm:rounded-l-[2rem] sm:border-l sm:border-y sm:my-2 sm:mr-2 shadow-2xl relative overflow-hidden transition-all duration-300"
          style={{
            background: "hsl(0 0% 4%)",
            borderColor: "rgba(255,255,255,0.07)",
          }}
        >
          {/* Frosted-glass header — matches SaaS template nav */}
          <header
            className="sticky top-0 z-30 h-16 flex items-center px-4 sm:px-6 gap-2 print:hidden"
            style={{
              background: "rgba(0,0,0,0.75)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderBottom: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <SidebarTrigger className="mr-2 -ml-2 rounded-full hover:bg-white/10 transition-colors text-white/70 hover:text-white" />
            <img src={logo} alt="Lamido Cars logo" className="h-6 w-6 sm:h-8 sm:w-8 object-contain" />
            <span className="text-sm sm:text-lg font-heading font-semibold tracking-widest text-white/90 truncate flex-1 uppercase">
              Lamido
            </span>

            {/* User Profile Badge */}
            <div className="flex items-center gap-2 sm:gap-3 ml-auto shrink-0">
              <div
                className="flex items-center gap-2 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                <div className="h-6 w-6 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-white/10" style={{ border: "1px solid rgba(255,255,255,0.15)" }}>
                  {profile?.avatar_url ? (
                    <img
                      src={`${profile.avatar_url}${profile.avatar_url.includes('?') ? '&' : '?'}t=${new Date(profile.updated_at || Date.now()).getTime()}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-3.5 w-3.5 text-white/70" />
                  )}
                </div>
                <span className="text-[10px] sm:text-xs font-bold text-white/80 truncate">{displayName}</span>
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
