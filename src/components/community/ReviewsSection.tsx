import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Star, Loader2, Pencil, Trash2 } from 'lucide-react';

interface Props {
  communityId: string;
  isCreator: boolean;
  hasMembership: boolean;
}

type Review = {
  id: string;
  user_id: string;
  rating: number;
  body: string | null;
  created_at: string;
};

type Author = { id: string; name: string | null; username: string | null; avatar_url: string | null };

const StarRow = ({ value, onChange, size = 18 }: { value: number; onChange?: (n: number) => void; size?: number }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map(n => (
      <button
        key={n}
        type="button"
        onClick={onChange ? () => onChange(n) : undefined}
        disabled={!onChange}
        className={onChange ? 'cursor-pointer' : 'cursor-default'}
      >
        <Star
          width={size}
          height={size}
          className={n <= value ? 'fill-yellow-500 text-yellow-500' : 'text-muted-foreground'}
        />
      </button>
    ))}
  </div>
);

const ReviewsSection = ({ communityId, isCreator, hasMembership }: Props) => {
  const { userId } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [authors, setAuthors] = useState<Record<string, Author>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const myReview = reviews.find(r => r.user_id === userId);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('community_reviews' as any)
      .select('*')
      .eq('community_id', communityId)
      .order('created_at', { ascending: false });
    const list = ((data as any[]) || []) as Review[];
    setReviews(list);
    const ids = Array.from(new Set(list.map(r => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase.rpc('get_chat_author_names' as any, { _user_ids: ids });
      const map: Record<string, Author> = {};
      ((profs as any[]) || []).forEach(p => { map[p.id] = p; });
      setAuthors(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [communityId]);

  useEffect(() => {
    if (myReview && !editing) {
      setRating(myReview.rating);
      setBody(myReview.body || '');
    }
  }, [myReview, editing]);

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const submit = async () => {
    if (!userId) return;
    if (rating < 1 || rating > 5) return;
    if (body.trim().length > 1000) {
      toast({ title: 'Review too long', description: 'Keep it under 1000 characters.', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      if (myReview) {
        const { error } = await supabase
          .from('community_reviews' as any)
          .update({ rating, body: body.trim() || null, updated_at: new Date().toISOString() })
          .eq('id', myReview.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('community_reviews' as any)
          .insert({ community_id: communityId, user_id: userId, rating, body: body.trim() || null });
        if (error) throw error;
      }
      toast({ title: 'Thanks for your review!' });
      setEditing(false);
      await load();
    } catch (e: any) {
      toast({ title: 'Could not save review', description: e?.message || 'Try again', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!myReview) return;
    if (!confirm('Delete your review?')) return;
    const { error } = await supabase.from('community_reviews' as any).delete().eq('id', myReview.id);
    if (error) {
      toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
      return;
    }
    setRating(5); setBody(''); setEditing(false);
    await load();
  };

  return (
    <div className="mb-8">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm font-bold text-foreground uppercase tracking-wide">Reviews & testimonials</h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-1 text-sm">
            <Star className="w-4 h-4 fill-yellow-500 text-yellow-500" />
            <span className="font-bold text-foreground">{avg.toFixed(1)}</span>
            <span className="text-muted-foreground">({reviews.length})</span>
          </div>
        )}
      </div>

      {!isCreator && hasMembership && (
        <div className="p-4 rounded-2xl bg-card border border-border mb-3">
          {myReview && !editing ? (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Your review</p>
              <StarRow value={myReview.rating} />
              {myReview.body && <p className="text-sm text-foreground mt-2 whitespace-pre-line">{myReview.body}</p>}
              <div className="flex gap-2 mt-3">
                <button onClick={() => setEditing(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-xs font-semibold">
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button onClick={remove}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-secondary text-xs font-semibold text-destructive">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                {myReview ? 'Edit your review' : 'Leave a review'}
              </p>
              <StarRow value={rating} onChange={setRating} size={24} />
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Share what you got out of this community…"
                maxLength={1000}
                rows={3}
                className="mt-3 w-full px-3 py-2 rounded-xl bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground resize-none"
              />
              <div className="flex gap-2 mt-3">
                <button onClick={submit} disabled={submitting}
                  className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50">
                  {submitting ? 'Saving…' : myReview ? 'Save review' : 'Post review'}
                </button>
                {editing && (
                  <button onClick={() => setEditing(false)}
                    className="px-3 py-2 rounded-xl bg-secondary text-foreground text-sm font-semibold">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!isCreator && !hasMembership && (
        <p className="text-xs text-muted-foreground mb-3">Join the community to leave a review.</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet. Be the first to share your experience.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => {
            const a = authors[r.user_id];
            return (
              <div key={r.id} className="p-3 rounded-2xl bg-card border border-border">
                <div className="flex items-center gap-2 mb-1.5">
                  {a?.avatar_url ? (
                    <img src={a.avatar_url} className="w-7 h-7 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                      {(a?.name || a?.username || '?')[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{a?.name || a?.username || 'Member'}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <StarRow value={r.rating} size={14} />
                </div>
                {r.body && <p className="text-sm text-foreground whitespace-pre-line">{r.body}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReviewsSection;
