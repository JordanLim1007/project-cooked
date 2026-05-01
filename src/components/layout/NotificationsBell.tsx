import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { unreadCount } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export function NotificationsBell({ className }: { className?: string }) {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) { setCount(0); return; }
    let cancelled = false;
    (async () => {
      const c = await unreadCount(user.id);
      if (!cancelled) setCount(c);
    })();

    const channel = supabase
      .channel(`notif-bell-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        async () => {
          const c = await unreadCount(user.id);
          if (!cancelled) setCount(c);
        },
      )
      .subscribe();
    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [user?.id]);

  if (!user) return null;

  return (
    <Link
      to="/notifications"
      aria-label={count > 0 ? `${count} new notifications` : "Notifications"}
      className={cn("relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted", className)}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute right-1 top-1 flex min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-none text-primary-foreground" style={{ height: 16 }}>
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}