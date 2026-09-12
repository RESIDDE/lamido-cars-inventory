import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera, Save, User, Phone, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { logAction } from "@/lib/logger";

export default function Profile() {
  const { user, profile, isLoading: authLoading, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setPhone(profile.phone || "");
      setAvatarUrl(profile.avatar_url || null);
    }
  }, [profile]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      const file = e.target.files[0];
      const fileExt = file.name.split(".").pop();
      const filePath = `avatars/${user?.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      const avatarUrlWithCacheBuster = `${publicUrl}?t=${Date.now()}`;
      setAvatarUrl(avatarUrlWithCacheBuster);
      
      // Auto-save the avatar URL to the database immediately
      // profiles.user_id = auth.uid() — use user_id for upsert matching
      const { error: saveError } = await supabase
        .from("profiles")
        .upsert(
          { user_id: user?.id, avatar_url: publicUrl, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' }
        );

      if (saveError) throw saveError;
      
      await refreshProfile();
      toast.success("Avatar updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // profiles.user_id = auth.uid() — upsert on 'user_id' covers both insert & update
      const { error: saveError } = await supabase
        .from("profiles")
        .upsert(
          {
            user_id: user.id,
            display_name: displayName,
            phone: phone,
            avatar_url: avatarUrl ? avatarUrl.split('?')[0] : null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (saveError) throw saveError;

      await refreshProfile();
      await logAction("UPDATE", "Profile", user.id, { display_name: displayName });
      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20 animate-fade-up">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-white/90">Account Profile</h1>
        <p className="text-xs text-white/40 mt-0.5">Manage your personal information and how you appear to the team.</p>
      </div>

      <div className="grid gap-8">
        {/* Avatar Section */}
        <Card className="bento-card border-none shadow-xl overflow-hidden">
          <CardHeader className="bg-primary/5 pb-8">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary/70">Public Identity</CardTitle>
          </CardHeader>
          <CardContent className="-mt-6 flex flex-col items-center">
            <div className="relative group">
              <Avatar className="h-32 w-32 border-4 border-background shadow-2xl transition-transform duration-500 group-hover:scale-105">
                <AvatarImage 
                  src={avatarUrl ? `${avatarUrl.split('?')[0]}${avatarUrl.includes('?') ? '&' : '?'}t=${new Date(profile?.updated_at || Date.now()).getTime()}` : ""} 
                  className="object-cover"
                  onLoadingStatusChange={(status) => console.log("Avatar Load Status:", status, "URL:", avatarUrl)}
                />
                <AvatarFallback className="bg-primary/10 text-primary text-3xl font-bold">
                  {displayName?.substring(0, 2).toUpperCase() || user?.email?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <label className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full cursor-pointer shadow-lg hover:bg-primary/90 transition-colors">
                {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
              </label>
            </div>
            <div className="text-center mt-6">
               <h2 className="text-2xl font-bold">{displayName || "Set your name"}</h2>
               <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </CardContent>
        </Card>

        {/* Details Form */}
        <Card className="bento-card border-none shadow-xl">
          <CardHeader>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Personal Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="displayName" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <User className="h-3.5 w-3.5" /> Full Name
              </Label>
              <Input
                id="displayName"
                placeholder="Enter your full name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-12 rounded-xl bg-muted/50 border-white/10 focus-visible:ring-primary/50"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="phone" className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" /> Phone Number
              </Label>
              <Input
                id="phone"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-12 rounded-xl bg-muted/50 border-white/10 focus-visible:ring-primary/50"
              />
            </div>

            <div className="pt-4 border-t border-white/5 flex justify-end">
              <Button 
                onClick={handleSave} 
                disabled={loading} 
                className="h-12 px-8 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all gap-2 font-bold"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Profile Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
