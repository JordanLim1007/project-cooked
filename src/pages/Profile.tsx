import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RecipeCard, RecipeCardData } from "@/components/recipe/RecipeCard";
import { LogOut, Settings, ChefHat } from "lucide-react";

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

  useEffect(() => {
    if (loading) return;
    if (!profileId) return;
    (async () => {
      const [{ data: p }, { data: u }] = await Promise.all([
        supabase.from("profiles").select("id,display_name,avatar_url,bio").eq("id", profileId).maybeSingle(),
        supabase.from("recipes").select("id,title,cover_image_url,calories,spice_level,cuisine,cooking_style,time_minutes").eq("user_id", profileId).order("created_at", { ascending: false }),
      ]);
      setProfile(p);
      setUploaded(u ?? []);

      if (isOwn && user) {
        const { data: saved } = await supabase
          .from("saved_recipes")
          .select("recipes(id,title,cover_image_url,calories,spice_level,cuisine,cooking_style,time_minutes)")
          .eq("user_id", user.id);
        setSavedRecipes((saved ?? []).map((s: any) => s.recipes).filter(Boolean));
      }
    })();
  }, [profileId, isOwn, user, loading]);

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
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full gradient-warm text-2xl font-bold text-primary-foreground">
            {profile?.display_name?.[0]?.toUpperCase() || "?"}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{profile?.display_name || "Cook"}</h2>
            {profile?.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}
            <p className="mt-1 text-xs text-muted-foreground">{uploaded.length} recipe{uploaded.length === 1 ? "" : "s"} shared</p>
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
