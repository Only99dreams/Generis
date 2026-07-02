import { useEffect, useState } from "react";
import { supabase } from "../services/supabase";
import { getUnreadCount } from "../services/notifications";

let channelCounter = 0;

export function useUnreadCount() {
  const [count, setCount] = useState(0);
  const [channelName] = useState(() => `unread-count-${++channelCounter}`);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const c = await getUnreadCount();
      if (mounted) setCount(c);
    };

    load();

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
