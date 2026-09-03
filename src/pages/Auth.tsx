import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Mail, Lock, User, Loader2, Phone, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { logAction } from "@/lib/logger";

type Mode = "login" | "register";

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await logAction("LOGIN", "Auth", null, { method: "email" });
      toast.success("Welcome back!");
      // GuestGuard automatically redirects to /dashboard once user state updates
    } catch (error: any) {
      toast.error(error.message || "Failed to sign in. Check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, phone },
        },
      });
      if (error) throw error;
      await logAction("SIGNUP", "Auth", null, { name: fullName });
      toast.success("Account created! You can now log in.");
      setMode("login");
    } catch (error: any) {
      toast.error(error.message || "Failed to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      {/* ─── Decorative left panel (hidden on mobile) ─── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col items-center justify-center p-12 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black">
        {/* Glow blobs */}
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-amber-500/20 rounded-full blur-[140px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-primary/15 rounded-full blur-[120px] pointer-events-none" />

        {/* Grid texture overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

        <div className="relative z-10 max-w-md text-center">
          <div className="inline-flex p-4 rounded-3xl bg-amber-500/10 border border-amber-500/20 mb-8 shadow-2xl shadow-amber-500/20">
            <img src={logo} alt="Lamido Cars" className="w-20 h-20 rounded-2xl object-cover shadow-lg" />
          </div>
          <h1 className="text-5xl font-extrabold text-white tracking-tight mb-4 leading-tight">
            Lamido<br />
            <span className="text-amber-400">Autos</span> CRM
          </h1>
          <p className="text-white/50 text-lg leading-relaxed">
            Complete dealership management platform. Track vehicles, customers, sales, repairs, and revenue — all in one place.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-4">
            {[
              { label: "Vehicles", icon: "🚗" },
              { label: "Customers", icon: "👥" },
              { label: "Revenue", icon: "₦" },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl bg-white/5 border border-white/10 p-4 text-center backdrop-blur-sm">
                <div className="text-2xl mb-1">{item.icon}</div>
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wider">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Right panel — Auth form ─── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10 relative">
        {/* Mobile glow */}
        <div className="lg:hidden absolute top-[-15%] right-[-15%] w-[60%] h-[60%] bg-amber-500/15 rounded-full blur-[100px] pointer-events-none" />
        <div className="lg:hidden absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

        <div className="w-full max-w-md relative z-10 animate-fade-up">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <img src={logo} alt="Lamido Cars" className="w-10 h-10 rounded-xl object-cover border border-border/50 shadow" />
            <div>
              <h1 className="text-xl font-extrabold text-foreground">Lamido Cars</h1>
              <p className="text-xs text-muted-foreground">Dealership Management</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-foreground tracking-tight">
              {mode === "login" ? "Welcome back" : "Create account"}
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              {mode === "login"
                ? "Sign in to access the admin dashboard."
                : "Register to get started with Lamido Cars."}
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex p-1.5 bg-foreground/5 rounded-2xl mb-8 gap-1">
            {(["login", "register"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  mode === m
                    ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {/* ── Login Form ── */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    required type="email"
                    placeholder="admin@Lamidoautos.com"
                    className="pl-10 h-12 rounded-xl bg-foreground/5 border-foreground/10 focus-visible:ring-amber-500 font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-12 rounded-xl bg-foreground/5 border-foreground/10 focus-visible:ring-amber-500 font-medium"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                disabled={loading} type="submit"
                className="w-full h-12 mt-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/30 transition-all"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In to Dashboard"}
              </Button>
            </form>
          )}

          {/* ── Register Form ── */}
          {mode === "register" && (
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    required placeholder="John Doe"
                    className="pl-10 h-12 rounded-xl bg-foreground/5 border-foreground/10 focus-visible:ring-amber-500 font-medium"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    required type="tel" placeholder="+234 800 000 0000"
                    className="pl-10 h-12 rounded-xl bg-foreground/5 border-foreground/10 focus-visible:ring-amber-500 font-medium"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    required type="email" placeholder="john@Lamidoautos.com"
                    className="pl-10 h-12 rounded-xl bg-foreground/5 border-foreground/10 focus-visible:ring-amber-500 font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 characters"
                    className="pl-10 pr-10 h-12 rounded-xl bg-foreground/5 border-foreground/10 focus-visible:ring-amber-500 font-medium"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                disabled={loading} type="submit"
                className="w-full h-12 mt-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/30 transition-all"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Admin Account"}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                🔒 Access is managed by your administrator. <br />
                Contact Lamido Cars IT if you're having trouble.
              </p>
            </form>
          )}

          <div className="mt-10 pt-6 border-t border-foreground/5 flex items-center gap-3">
            <ShieldCheck className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-xs text-muted-foreground">
              This is a secure, admin-only portal. Unauthorized access is prohibited.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
