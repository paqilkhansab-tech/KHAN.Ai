'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export interface KhanUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  createdAt: string;
  lastLoginAt?: string;
}

export interface WatchItem {
  id: string;
  symbol: string;
  name: string;
  kind: string;
}

interface AuthCtx {
  user: KhanUser | null;
  watchlist: WatchItem[];
  chatCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  saveToWatchlist: (symbol: string, name: string, kind: string) => Promise<boolean>;
  removeFromWatchlist: (symbol: string) => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  watchlist: [],
  chatCount: 0,
  loading: true,
  refresh: async () => {},
  signOut: async () => {},
  saveToWatchlist: async () => false,
  removeFromWatchlist: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<KhanUser | null>(null);
  const [watchlist, setWatchlist] = useState<WatchItem[]>([]);
  const [chatCount, setChatCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' });
      const data = await res.json();
      setUser(data.user || null);
      setWatchlist(data.watchlist || []);
      setChatCount(data.chatCount || 0);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    await fetch('/api/auth/signout', { method: 'POST' });
    setUser(null);
    setWatchlist([]);
    setChatCount(0);
  }, []);

  const saveToWatchlist = useCallback(
    async (symbol: string, name: string, kind: string) => {
      if (!user) return false;
      const res = await fetch('/api/user/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, name, kind }),
      });
      if (res.ok) {
        await refresh();
        return true;
      }
      return false;
    },
    [user, refresh]
  );

  const removeFromWatchlist = useCallback(
    async (symbol: string) => {
      if (!user) return;
      await fetch(`/api/user/watchlist?symbol=${encodeURIComponent(symbol)}`, { method: 'DELETE' });
      await refresh();
    },
    [user, refresh]
  );

  return (
    <Ctx.Provider value={{ user, watchlist, chatCount, loading, refresh, signOut, saveToWatchlist, removeFromWatchlist }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
