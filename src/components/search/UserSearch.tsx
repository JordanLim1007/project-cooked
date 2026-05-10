import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search as SearchIcon, UserPlus, UserCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getChefBadge } from "@/lib/chef-badge";
import { cn } from "@/lib/utils";

type UserResult = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  recipe_count: number;
  follower_count: number;
};

export function UserSearch() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id);
      setFollowingSet(new Set((data ?? []).map((r: any) => r.following_id)));
    })();
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    const handle = setTimeout(async () => {
      const term = q.trim();
      setLoading(true);
      let qb = supabase
        .from("profiles")
        .select("id,display_name,username,avatar_url")
        .limit(25);
      if (term) {
        qb = qb.or(`display_name.ilike.%${term}%,username.ilike.%${term}%`);
      } else {
        qb = qb.order("display_name", { ascending: true });
      }
      const { data: profiles } = await qb;
      if (cancelled || !profiles) { setLoading(false); return; }

      const ids = profiles.map((p: any) => p.id);
      if (ids.length === 0) {
        setResults([]); setLoading(false); return;
      }
      // Recipe counts (published) and follower counts in parallel
      const [recipesResp, followsResp] = await Promise.all([
        supabase
          .from("recipes")
          .select("user_id")
          .in("user_id", ids)
          .eq("is_published", true),
        supabase
          .from("follows")
          .select("following_id")
          .in("following_id", ids),
      ]);
      const recipeCounts = new Map<string, number>();
      for (const r of recipesResp.data ?? []) {
        recipeCounts.set((r as any).user_id, (recipeCounts.get((r as any).user_id) ?? 0) + 1);
      }
      const followerCounts = new Map<string, number>();
      for (const f of followsResp.data ?? []) {
        followerCounts.set((f as any).following_id, (followerCounts.get((f as any).following_id) ?? 0) + 1);
      }
      const merged: UserResult[] = profiles.map((p: any) => ({
        id: p.id,
        display_name: p.display_name,
        username: p.username,
        avatar_url: p.avatar_url,
        recipe_count: recipeCounts.get(p.id) ?? 0,
        follower_count: followerCounts.get(p.id) ?? 0,
      }));
      // Sort: most recipes first, then followers
      merged.sort((a, b) => (b.recipe_count - a.recipe_count) || (b.follower_count - a.follower_count));
      if (!cancelled) { setResults(merged); setLoading(false); }
    }, 250);
    return () => { cancelled = true; clearTimeout(handle); };
  }, [q]);

  const toggleFollow = async (targetId: string) => {
    if (!user) { navigate("/auth"); return; }
    if (targetId === user.id || busy) return;
    setBusy(targetId);
    const isFollowing = followingSet.has(targetId);
    const next = new Set(followingSet);
    if (isFollowing) {
      next.delete(targetId);
      setFollowingSet(next);
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", targetId);
      setResults((prev) => prev.map((u) => u.id === targetId ? { ...u, follower_count: Math.max(0, u.follower_count - 1) } : u));
    } else {
      next.add(targetId);
      setFollowingSet(next);
      await supabase.from("follows").insert({ follower_id: user.id, following_id: targetId });
      setResults((prev) => prev.map((u) => u.id === targetId ? { ...u, follower_count: u.follower_count + 1 } : u));
    }
    setBusy(null);
  };

  return (
    <div>
      <div className="relative mb-4">
        <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or username..." className="pl-9" />
      </div>

      {loading ? (
        <ul className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="h-16 animate-pulse rounded-2xl bg-muted" />
          ))}
        </ul>
      ) : results.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {q.trim() ? "No users match your search." : "Type to search for cooks."}
        </p>
      ) : (
        <ul className="space-y-2">
          {results.map((u) => {
            const badge = getChefBadge(u.recipe_count);
            const isMe = user?.id === u.id;
            const isFollowing = followingSet.has(u.id);
            return (
              <li
                key={u.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-card"
              >
                <Link to={`/profile/${u.id}`} className="flex flex-1 items-center gap-3 min-w-0">
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full gradient-warm text-base font-bold text-primary-foreground">
                      {(u.display_name || u.username || "?")[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 truncate text-sm font-semibold">
                      {u.display_name || u.username || "Cook"}
                      {badge && (
                        <span className={cn("inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0 text-[10px] font-semibold", badge.className)}>
                          <span aria-hidden>{badge.emoji}</span>{badge.label}
                        </span>
                      )}
                    </p>
                    {u.username && u.display_name && (
                      <p className="truncate text-xs text-muted-foreground">@{u.username}</p>
                    )}
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {u.recipe_count} recipe{u.recipe_count === 1 ? "" : "s"} · {u.follower_count} follower{u.follower_count === 1 ? "" : "s"}
                    </p>
                  </div>
                </Link>
                {!isMe && (
                  <Button
                    size="sm"
                    variant={isFollowing ? "outline" : "default"}
                    disabled={busy === u.id}
                    onClick={() => toggleFollow(u.id)}
                  >
                    {isFollowing ? <><UserCheck className="mr-1 h-3.5 w-3.5" />Following</> : <><UserPlus className="mr-1 h-3.5 w-3.5" />Follow</>}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}