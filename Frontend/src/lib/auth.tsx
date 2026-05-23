import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { didServiceRestart } from "@/lib/service-session";

export type AppRole = "carrier" | "shipper";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRole: (preferredRole?: AppRole, userId?: string) => Promise<void>;
  switchRole: (nextRole: AppRole) => boolean;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const clearAuthState = useCallback(() => {
    setSession(null);
    setUser(null);
    setRole(null);
    setRoles([]);
  }, []);

  const fetchRoles = useCallback(async (uid: string, preferredRole?: AppRole) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .order("role", { ascending: true });

    const nextRoles = ((data ?? []).map((row) => row.role).filter(Boolean) as AppRole[]);
    const storedRole = window.localStorage.getItem(activeRoleKey(uid)) as AppRole | null;
    const nextRole =
      (preferredRole && nextRoles.includes(preferredRole) && preferredRole) ||
      (storedRole && nextRoles.includes(storedRole) && storedRole) ||
      nextRoles[0] ||
      null;

    setRoles(nextRoles);
    setRole(nextRole);
    if (nextRole) window.localStorage.setItem(activeRoleKey(uid), nextRole);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const requireFreshLoginAfterServiceRestart = async () => {
      const restarted = await didServiceRestart();
      if (!restarted) return false;

      await supabase.auth.signOut({ scope: "local" });
      if (!cancelled) clearAuthState();
      return true;
    };

    // Listener first, then session check (per Supabase guidance).
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (cancelled) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        // defer to avoid deadlock
        setTimeout(() => fetchRoles(s.user.id), 0);
      } else {
        setRole(null);
        setRoles([]);
      }
    });

    const bootstrapSession = async () => {
      const restarted = await requireFreshLoginAfterServiceRestart();
      if (cancelled) return;
      if (restarted) {
        setLoading(false);
        return;
      }

      const { data: { session: s } } = await supabase.auth.getSession();
      if (cancelled) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchRoles(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    };

    const serviceCheckInterval = window.setInterval(() => {
      requireFreshLoginAfterServiceRestart().catch(() => {
        // Keep the existing session if the restart check itself fails.
      });
    }, 30000);

    bootstrapSession().catch(() => {
      if (!cancelled) setLoading(false);
    });

    return () => {
      cancelled = true;
      window.clearInterval(serviceCheckInterval);
      sub.subscription.unsubscribe();
    };
  }, [clearAuthState, fetchRoles]);

  const signOut = async () => {
    await supabase.auth.signOut();
    clearAuthState();
  };

  const refreshRole = async (preferredRole?: AppRole, userId?: string) => {
    const uid = userId ?? user?.id;
    if (uid) await fetchRoles(uid, preferredRole);
  };

  const switchRole = (nextRole: AppRole) => {
    if (!user || !roles.includes(nextRole)) return false;
    setRole(nextRole);
    window.localStorage.setItem(activeRoleKey(user.id), nextRole);
    return true;
  };

  return (
    <Ctx.Provider value={{ user, session, role, roles, loading, signOut, refreshRole, switchRole }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

function activeRoleKey(uid: string) {
  return `loadmind.activeRole.${uid}`;
}
