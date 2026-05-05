import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "carrier" | "shipper";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRole: (preferredRole?: AppRole, userId?: string) => Promise<void>;
}

const Ctx = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoles = async (uid: string, preferredRole?: AppRole) => {
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
  };

  useEffect(() => {
    // Listener first, then session check (per Supabase guidance).
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
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
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) fetchRoles(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setRoles([]);
  };

  const refreshRole = async (preferredRole?: AppRole, userId?: string) => {
    const uid = userId ?? user?.id;
    if (uid) await fetchRoles(uid, preferredRole);
  };

  return (
    <Ctx.Provider value={{ user, session, role, roles, loading, signOut, refreshRole }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

function activeRoleKey(uid: string) {
  return `loadmind.activeRole.${uid}`;
}
