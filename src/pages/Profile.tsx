import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecipeCard, RecipeCardData } from "@/components/recipe/RecipeCard";
import { LogOut, Settings, ChefHat, Camera, UserPlus, UserCheck } from "lucide-react";
import { fetchRecipeFeed } from "@/lib/recipe-feed";
import { getChefBadge } from "@/lib/chef-badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Profile = { id: string; display_name: string | null; avatar_url: string | null; bio: string | null };

export default function ProfilePage() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const profileId = routeId || user?.id;
  const isOwn = !routeId || routeId === user?.id;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [uploaded, setUploaded] = useState<RecipeCardData[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<RecipeCardData[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loading) return;
    if (!profileId) return;
    (async () => {
      const [{ data: p }, u, followers, following] = await Promise.all([
        supabase.from("profiles").select("id,display_name,avatar_url,bio").eq("id", profileId).maybeSingle(),
        fetchRecipeFeed({ user_id: profileId, sort: "recent", viewerId: user?.id ?? null }),
        supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", profileId),
        supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", profileId),
      ]);
      setProfile(p);
      setUploaded(u);
      setFollowerCount(followers.count ?? 0);
      setFollowingCount(following.count ?? 0);

      if (user && !isOwn) {
        const { data: existing } = await supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("following_id", profileId)
          .maybeSingle();
        setIsFollowing(!!existing);
      }

      if (isOwn && user) {
        const { data: saved } = await supabase
          .from("saved_recipes")
          .select("recipes(id,title,cover_image_url,calories,spice_level,cuisine,cooking_style,time_minutes)")
          .eq("user_id", user.id);
        setSavedRecipes((saved ?? []).map((s: any) => s.recipes).filter(Boolean));
      }
    })();
  }, [profileId, isOwn, user, loading]);

  const toggleFollow = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!profileId || isOwn || followBusy) return;
    setFollowBusy(true);
    const next = !isFollowing;
    setIsFollowing(next);
    setFollowerCount((c) => c + (next ? 1 : -1));
    if (next) {
      const { error } = await supabase.from("follows").insert({ follower_id: user.id, following_id: profileId });
      if (error) { setIsFollowing(false); setFollowerCount((c) => c - 1); toast.error(error.message); }
    } else {
      const { error } = await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profileId);
      if (error) { setIsFollowing(true); setFollowerCount((c) => c + 1); toast.error(error.message); }
    }
    setFollowBusy(false);
  };

  const onAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;
    setAvatarBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = data.publicUrl;
      const { error: updErr } = await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (updErr) throw updErr;
      setProfile((p) => (p ? { ...p, avatar_url: url } : p));
      toast.success("Profile photo updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update photo");
    } finally {
      setAvatarBusy(false);
    }
  };

  if (!loading && !user && isOwn) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md p-6 pt-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full gradient-warm">
            <ChefHat className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mb-3 text-2xl">Welcome to COOKED</h1>
          <p className="mb-6 text-muted-foreground">Sign in to view your profile, save recipes, and share your own.</p>
          <Button onClick={() => navigate("/auth")} size="lg" className="w-full">Sign in</Button>
        </div>
      </AppShell>
    );
  }

  const badge = getChefBadge(uploaded.length);

  return (
    <AppShell>
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-3">
          <h1 className="text-xl">Profile</h1>
          {isOwn && (
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => navigate("/onboarding")}><Settings className="h-5 w-5" /></Button>
              <Button variant="ghost" size="icon" onClick={signOut}><LogOut className="h-5 w-5" /></Button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl p-5">
        <div className="mb-6 flex items-start gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt={profile.display_name ?? ""} className="h-20 w-20 rounded-full object-cover shadow-card" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full gradient-warm text-2xl font-bold text-primary-foreground shadow-card">
                {profile?.display_name?.[0]?.toUpperCase() || "?"}
              </div>
            )}
            {isOwn && (
              <>
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={avatarBusy}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background shadow-card transition-transform hover:scale-105 disabled:opacity-60"
                  aria-label="Change profile photo"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={onAvatarPick} />
              </>
            )}
          </div>

          {/* Name + bio + badge + follow */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold leading-tight">{profile?.display_name || "Cook"}</h2>
              {badge && (
                <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold", badge.className)}>
                  <span aria-hidden>{badge.emoji}</span>{badge.label}
                </span>
              )}
            </div>
            {profile?.bio && <p className="mt-0.5 text-sm text-muted-foreground">{profile.bio}</p>}

            {/* Stats — Instagram style */}
            <div className="mt-3 flex items-center gap-5 text-sm">
              <span><strong className="font-semibold">{uploaded.length}</strong> <span className="text-muted-foreground">recipe{uploaded.length === 1 ? "" : "s"}</span></span>
              <span><strong className="font-semibold">{followerCount}</strong> <span className="text-muted-foreground">followers</span></span>
              <span><strong className="font-semibold">{followingCount}</strong> <span className="text-muted-foreground">following</span></span>
            </div>

            {!isOwn && user && (
              <Button
                onClick={toggleFollow}
                disabled={followBusy}
                size="sm"
                variant={isFollowing ? "outline" : "default"}
                className="mt-3"
              >
                {isFollowing ? <><UserCheck className="mr-1.5 h-4 w-4" />Following</> : <><UserPlus className="mr-1.5 h-4 w-4" />Follow</>}
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="uploaded">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="uploaded">Uploaded</TabsTrigger>
            {isOwn && <TabsTrigger value="saved">Saved</TabsTrigger>}
          </TabsList>

          <TabsContent value="uploaded" className="mt-4">
            {uploaded.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                <p className="mb-3 text-sm text-muted-foreground">{isOwn ? "You haven't shared any recipes yet." : "No recipes shared yet."}</p>
                {isOwn && <Link to="/upload"><Button>Share your first recipe</Button></Link>}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {uploaded.map(r => <RecipeCard key={r.id} r={r} />)}
              </div>
            )}
          </TabsContent>

          {isOwn && (
            <TabsContent value="saved" className="mt-4">
              {savedRecipes.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No saved recipes yet. Tap the heart on any recipe to save it.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {savedRecipes.map(r => <RecipeCard key={r.id} r={r} />)}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </main>
    </AppShell>
  );
}
