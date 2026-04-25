import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Star, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type Review = { id: string; user_id: string; rating: number; comment: string | null; created_at: string; profiles?: { display_name: string | null; avatar_url: string | null } | null };

const Stars = ({ value, onChange, size = 18 }: { value: number; onChange?: (n: number) => void; size?: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map(n => (
      <button key={n} type="button" disabled={!onChange} onClick={() => onChange?.(n)} className={cn(!onChange && "cursor-default")}>
        <Star className={cn("transition-colors", n <= value ? "fill-primary text-primary" : "text-muted-foreground")} style={{ width: size, height: size }} />
      </button>
    ))}
  </div>
);

export const Reviews = ({ recipeId }: { recipeId: string }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [my, setMy] = useState<Review | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [editing, setEditing] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("id,user_id,rating,comment,created_at,profiles!reviews_author_profile_fkey(display_name,avatar_url)")
      .eq("recipe_id", recipeId)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as any as Review[];
    setReviews(list);
    const mine = user ? list.find(r => r.user_id === user.id) ?? null : null;
    setMy(mine);
    if (mine) { setRating(mine.rating); setComment(mine.comment ?? ""); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [recipeId, user?.id]);

  const submit = async () => {
    if (!user) return toast.error("Sign in to leave a review");
    const payload = { recipe_id: recipeId, user_id: user.id, rating, comment: comment.trim() || null };
    const { error } = my
      ? await supabase.from("reviews").update(payload).eq("id", my.id)
      : await supabase.from("reviews").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(my ? "Review updated" : "Review added");
    setEditing(false);
    load();
  };

  const del = async () => {
    if (!my) return;
    const { error } = await supabase.from("reviews").delete().eq("id", my.id);
    if (error) return toast.error(error.message);
    toast.success("Review deleted");
    setMy(null); setComment(""); setRating(5);
    load();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Reviews</h2>

      {user && (!my || editing) && (
        <Card className="space-y-3 p-4 shadow-card">
          <div className="flex items-center gap-2"><span className="text-sm font-medium">Your rating:</span><Stars value={rating} onChange={setRating} /></div>
          <Textarea rows={3} placeholder="Optional comment..." value={comment} onChange={(e) => setComment(e.target.value)} />
          <div className="flex gap-2">
            <Button onClick={submit}>{my ? "Save changes" : "Post review"}</Button>
            {editing && <Button variant="ghost" onClick={() => { setEditing(false); load(); }}>Cancel</Button>}
          </div>
        </Card>
      )}

      {!user && <p className="text-sm text-muted-foreground">Sign in to leave a review.</p>}

      <div className="space-y-3">
        {reviews.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No reviews yet.</p>
        ) : reviews.map(r => (
          <Card key={r.id} className="p-4 shadow-card">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">{r.profiles?.display_name || "Anonymous"}</p>
                <Stars value={r.rating} size={14} />
              </div>
              {user?.id === r.user_id && !editing && (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => setEditing(true)}><Edit2 className="h-4 w-4" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild><Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this review?</AlertDialogTitle>
                        <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={del} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
            {r.comment && <p className="text-sm text-foreground/80">{r.comment}</p>}
          </Card>
        ))}
      </div>
    </div>
  );
};
