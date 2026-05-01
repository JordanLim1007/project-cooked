import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Star, Edit2, Trash2, ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

type ReviewImage = { id: string; image_url: string; position: number };
type Review = {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  profiles?: { display_name: string | null; avatar_url: string | null } | null;
  review_images?: ReviewImage[];
};

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
  /** Photos: existing (already uploaded URLs) + new (File objects pending upload). */
  const [existingPhotos, setExistingPhotos] = useState<ReviewImage[]>([]);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("id,user_id,rating,comment,created_at,profiles!reviews_author_profile_fkey(display_name,avatar_url),review_images(id,image_url,position)")
      .eq("recipe_id", recipeId)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as any as Review[];
    list.forEach((r) => r.review_images?.sort((a, b) => a.position - b.position));
    setReviews(list);
    const mine = user ? list.find(r => r.user_id === user.id) ?? null : null;
    setMy(mine);
    if (mine) {
      setRating(mine.rating);
      setComment(mine.comment ?? "");
      setExistingPhotos(mine.review_images ?? []);
    } else {
      setExistingPhotos([]);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [recipeId, user?.id]);

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = Array.from(e.target.files ?? []);
    const total = existingPhotos.length + newPhotos.length + list.length;
    if (total > 6) {
      toast.error("Up to 6 photos per review");
    }
    setNewPhotos((prev) => [...prev, ...list].slice(0, Math.max(0, 6 - existingPhotos.length)));
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeExisting = (id: string) => {
    setExistingPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const removeNew = (idx: number) => {
    setNewPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const resetForm = () => {
    setEditing(false);
    setNewPhotos([]);
    load();
  };

  const submit = async () => {
    if (!user) return toast.error("Sign in to leave a review");
    setBusy(true);
    try {
    const payload = { recipe_id: recipeId, user_id: user.id, rating, comment: comment.trim() || null };
    let reviewId = my?.id ?? null;
    if (my) {
      const { error } = await supabase.from("reviews").update(payload).eq("id", my.id);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from("reviews").insert(payload).select("id").single();
      if (error) throw error;
      reviewId = data.id;
    }

    // Delete photos the user removed
    if (my) {
      const keepIds = new Set(existingPhotos.map((p) => p.id));
      const toDelete = (my.review_images ?? []).filter((p) => !keepIds.has(p.id)).map((p) => p.id);
      if (toDelete.length > 0) {
        await supabase.from("review_images").delete().in("id", toDelete);
      }
    }

    // Upload new photos to recipe-images bucket (reuses existing public bucket policies)
    if (newPhotos.length > 0 && reviewId) {
      const startPos = existingPhotos.length;
      const uploaded: { image_url: string; position: number }[] = [];
      for (let i = 0; i < newPhotos.length; i++) {
        const file = newPhotos[i];
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user.id}/reviews/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("recipe-images").upload(path, file, { upsert: false });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("recipe-images").getPublicUrl(path);
        uploaded.push({ image_url: data.publicUrl, position: startPos + i });
      }
      const { error: insErr } = await supabase.from("review_images").insert(
        uploaded.map((u) => ({ review_id: reviewId!, image_url: u.image_url, position: u.position })),
      );
      if (insErr) throw insErr;
    }

    toast.success(my ? "Review updated" : "Review added");
    resetForm();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save review");
    } finally {
      setBusy(false);
    }
  };

  const del = async () => {
    if (!my) return;
    const { error } = await supabase.from("reviews").delete().eq("id", my.id);
    if (error) return toast.error(error.message);
    toast.success("Review deleted");
    setMy(null); setComment(""); setRating(5); setExistingPhotos([]); setNewPhotos([]);
    load();
  };

  const newPreviewUrls = newPhotos.map((f) => URL.createObjectURL(f));
  useEffect(() => () => newPreviewUrls.forEach((u) => URL.revokeObjectURL(u)), [newPhotos.length]); // eslint-disable-line

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Reviews</h2>

      {user && (!my || editing) && (
        <Card className="space-y-3 p-4 shadow-card">
          <div className="flex items-center gap-2"><span className="text-sm font-medium">Your rating:</span><Stars value={rating} onChange={setRating} /></div>
          <Textarea rows={3} placeholder="Optional comment..." value={comment} onChange={(e) => setComment(e.target.value)} />

          {/* Photo strip */}
          {(existingPhotos.length > 0 || newPhotos.length > 0) && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {existingPhotos.map((p) => (
                <div key={p.id} className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
                  <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removeExisting(p.id)} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 shadow-card">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {newPhotos.map((_, i) => (
                <div key={`new-${i}`} className="group relative aspect-square overflow-hidden rounded-lg bg-muted">
                  <img src={newPreviewUrls[i]} alt="" className="h-full w-full object-cover" />
                  <button type="button" onClick={() => removeNew(i)} className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 shadow-card">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={onPickFiles} />
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy || existingPhotos.length + newPhotos.length >= 6}>
              <ImagePlus className="mr-2 h-4 w-4" /> Add photos
            </Button>
            <span className="text-xs text-muted-foreground">{existingPhotos.length + newPhotos.length}/6</span>
          </div>

          <div className="flex gap-2">
            <Button onClick={submit} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {my ? "Save changes" : "Post review"}
            </Button>
            {editing && <Button variant="ghost" onClick={resetForm} disabled={busy}>Cancel</Button>}
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
              <Link to={`/profile/${r.user_id}`} className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
                {r.profiles?.avatar_url ? (
                  <img src={r.profiles.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                    {r.profiles?.display_name?.[0]?.toUpperCase() || "?"}
                  </span>
                )}
                <div>
                  <p className="text-sm font-semibold">{r.profiles?.display_name || "Anonymous"}</p>
                  <Stars value={r.rating} size={14} />
                </div>
              </Link>
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
            {r.comment && <p className="text-sm leading-relaxed text-foreground/80">{r.comment}</p>}
            {r.review_images && r.review_images.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                {r.review_images.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setLightbox(p.image_url)}
                    className="aspect-square overflow-hidden rounded-lg bg-muted transition-transform hover:scale-[1.02]"
                  >
                    <img src={p.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          role="dialog"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        >
          <img src={lightbox} alt="" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
};
