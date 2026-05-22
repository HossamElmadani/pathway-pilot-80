import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";

export type Role = "director" | "worker" | "student";

export interface Profile {
  id: string;
  name: string;
  email: string;
  current_step: number;
  must_change_password: boolean;
  avatar_url: string | null;
  preferred_language: string;
  assigned_worker_id: string | null;
}

interface AuthCtx {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  roles: Role[];
  isAuthenticated: boolean;
  isDirector: boolean;
  isWorker: boolean;
  isStaff: boolean;
  isStudent: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();
  const router = useRouter();

  const loadProfile = async (uid: string) => {
    const [{ data: prof }, { data: roleRows }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
    ]);
    setProfile((prof as unknown as Profile) ?? null);
    setRoles(((roleRows ?? []) as { role: Role }[]).map((r) => r.role));
  };

  const refresh = async () => {
    if (session?.user) await loadProfile(session.user.id);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => {
          loadProfile(s.user.id).finally(() => setLoading(false));
          queryClient.invalidateQueries();
          router.invalidate();
        }, 0);
      } else {
        setProfile(null);
        setRoles([]);
        setLoading(false);
        queryClient.clear();
      }
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) {
        loadProfile(s.user.id).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = useMemo<AuthCtx>(() => {
    const isDirector = roles.includes("director");
    const isWorker = roles.includes("worker");
    return {
      session,
      user: session?.user ?? null,
      profile,
      roles,
      isAuthenticated: !!session,
      isDirector,
      isWorker,
      isStaff: isDirector || isWorker,
      isStudent: roles.includes("student"),
      loading,
      refresh,
      signOut,
    };
  }, [session, profile, roles, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
