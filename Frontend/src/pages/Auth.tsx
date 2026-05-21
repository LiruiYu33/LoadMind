import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Package, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";

const REMEMBERED_CREDENTIALS_KEY = "loadmind.rememberedCredentials.v1";

type RememberedCredentials = {
  email: string;
  password: string;
  role: AppRole;
};

const Auth = () => {
  const nav = useNavigate();
  const { refreshRole } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<AppRole>("carrier");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberPassword, setRememberPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const remembered = readRememberedCredentials();
    if (!remembered) return;

    setEmail(remembered.email);
    setPassword(remembered.password);
    setRole(remembered.role);
    setRememberPassword(true);
  }, []);

  const authErrorMessage = (err: unknown) => {
    const message = getErrorField(err, "message");
    const raw = message.toLowerCase();
    const code = getErrorField(err, "code").toLowerCase();

    if (raw.includes("email not confirmed") || code.includes("email_not_confirmed")) {
      return "Your account is not confirmed yet. Please check your email and confirm your account.";
    }

    if (raw.includes("user not found") || code.includes("user_not_found")) {
      return "User not registered. Please create a workspace first.";
    }

    if (raw.includes("invalid password") || code.includes("invalid_password")) {
      return "Incorrect password. Please try again.";
    }

    // Supabase commonly returns this for both wrong email and wrong password.
    if (raw.includes("invalid login credentials") || code.includes("invalid_credentials")) {
      return "Incorrect email or password, or the user is not registered.";
    }

    return message || "Authentication failed. Please try again.";
  };

  const finishRoleSetup = async (uid: string, selectedRole: AppRole) => {
    const { data: existingRole, error: roleFetchError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", selectedRole)
      .maybeSingle();

    if (roleFetchError) throw roleFetchError;

    if (!existingRole) {
      const { error: roleInsertError } = await supabase
        .from("user_roles")
        .insert({ user_id: uid, role: selectedRole });

      if (roleInsertError) throw roleInsertError;
    }

    window.localStorage.setItem(`loadmind.activeRole.${uid}`, selectedRole);
    await refreshRole(selectedRole, uid);
    return selectedRole;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });

        if (error) throw error;

        const uid = data.user?.id;

        if (uid && data.session) {
          const resolvedRole = await finishRoleSetup(uid, role);
          toast({
            title: "Welcome aboard",
            description: `${resolvedRole === "carrier" ? "Carrier" : "Shipper"} workspace ready.`,
          });
          nav(resolvedRole === "carrier" ? "/carrier" : "/shipper");
          return;
        }

        setMode("signin");
        setPassword("");
        toast({
          title: "Check your email",
          description: `Confirm your email, then sign in as ${role === "carrier" ? "Carrier" : "Shipper"} to finish setup.`,
        });
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) throw error;

        const uid = data.user?.id;
        if (!uid) throw new Error("No account session was created.");

        const resolvedRole = await finishRoleSetup(uid, role);
        if (rememberPassword) {
          writeRememberedCredentials({ email, password, role });
        } else {
          clearRememberedCredentials();
        }
        nav(resolvedRole === "carrier" ? "/carrier" : "/shipper");
      }
    } catch (err: unknown) {
      const message = authErrorMessage(err);

      toast({ title: "Authentication error", description: message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr,1fr]">
      {/* Left: editorial brand panel */}
      <div className="surface-deep relative overflow-hidden p-10 lg:p-16 flex flex-col justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-md bg-action grid place-items-center">
            <Truck className="h-4 w-4 text-action-foreground" />
          </div>
          <div className="font-display text-xl font-bold tracking-tight">LoadMind</div>
        </div>
        <div className="relative z-10 max-w-lg">
          <div className="label-eyebrow text-action mb-4">AUSTRALIAN FREIGHT INTELLIGENCE</div>
          <h1 className="font-display text-4xl lg:text-5xl font-extrabold leading-[1.05] mb-6">
            The kinetic command center for moving Australia.
          </h1>
          <p className="text-primary-glow text-base leading-relaxed">
            AI load matching, live fleet telemetry, and a transparent shipper marketplace — built for carriers and shippers
            from Perth to Brisbane.
          </p>
        </div>
        <div className="relative z-10 grid grid-cols-3 gap-6 max-w-md">
          {[
            { k: "94%", l: "ON-TIME RATE" },
            { k: "$42K", l: "AVG SAVINGS" },
            { k: "1.2K", l: "DAILY LOADS" },
          ].map((x) => (
            <div key={x.l}>
              <div className="font-display text-2xl font-bold font-mono-data">{x.k}</div>
              <div className="label-eyebrow text-primary-glow mt-1">{x.l}</div>
            </div>
          ))}
        </div>
        <div
          aria-hidden
          className="absolute -right-32 -top-32 h-[480px] w-[480px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, hsl(var(--action)) 0%, transparent 70%)" }}
        />
      </div>

      {/* Right: form */}
      <div className="bg-surface flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md">
          <div className="label-eyebrow mb-2">{mode === "signin" ? "RETURNING OPERATOR" : "NEW WORKSPACE"}</div>
          <h2 className="font-display text-3xl font-bold mb-8">
            {mode === "signin" ? "Sign in to LoadMind" : "Create your workspace"}
          </h2>

          {/* Role selector */}
          <div className="label-eyebrow mb-3">SELECT ROLE</div>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {([
              { v: "carrier", icon: Truck, t: "Carrier", d: "Operate trucks" },
              { v: "shipper", icon: Package, t: "Shipper", d: "Move freight" },
            ] as const).map((opt) => {
              const Icon = opt.icon;
              const active = role === opt.v;
              return (
                <button
                  key={opt.v}
                  type="button"
                  onClick={() => setRole(opt.v)}
                  className={`text-left p-4 rounded-md transition-all ${
                    active
                      ? "surface-2 ring-2 ring-primary lift-shadow"
                      : "surface-1 hover:surface-2"
                  }`}
                >
                  <Icon className={`h-5 w-5 mb-3 ${active ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="font-display font-semibold text-sm">{opt.t}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{opt.d}</div>
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label-eyebrow block mb-2">EMAIL</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
                className="w-full h-11 px-3 rounded-md surface-2 ring-1 ring-transparent focus:ring-primary outline-none transition"
                placeholder="ops@yourcompany.com.au"
              />
            </div>
            <div>
              <label className="label-eyebrow block mb-2">PASSWORD</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="w-full h-11 px-3 rounded-md surface-2 ring-1 ring-transparent focus:ring-primary outline-none transition"
                placeholder="••••••••"
              />
            </div>
            {mode === "signin" && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={rememberPassword}
                  onCheckedChange={(checked) => {
                    const next = checked === true;
                    setRememberPassword(next);
                    if (!next) clearRememberedCredentials();
                  }}
                  aria-label="Remember password"
                />
                Remember password
              </label>
            )}

            <button
              type="submit"
              disabled={busy}
              className="btn-primary-gradient w-full h-11 rounded-md font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                <>
                  {mode === "signin" ? "Sign in" : "Create workspace"} <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-sm text-muted-foreground text-center">
            {mode === "signin" ? "First time on LoadMind?" : "Already operating?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-primary font-medium underline-offset-4 hover:underline"
            >
              {mode === "signin" ? "Create a workspace" : "Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;

function getErrorField(err: unknown, field: "message" | "code") {
  if (typeof err !== "object" || err === null || !(field in err)) return "";
  return String((err as Record<"message" | "code", unknown>)[field] ?? "");
}

function readRememberedCredentials(): RememberedCredentials | null {
  try {
    const raw = window.localStorage.getItem(REMEMBERED_CREDENTIALS_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<RememberedCredentials>;
    if (
      typeof parsed.email !== "string" ||
      typeof parsed.password !== "string" ||
      (parsed.role !== "carrier" && parsed.role !== "shipper")
    ) {
      clearRememberedCredentials();
      return null;
    }

    return {
      email: parsed.email,
      password: parsed.password,
      role: parsed.role,
    };
  } catch {
    clearRememberedCredentials();
    return null;
  }
}

function writeRememberedCredentials(credentials: RememberedCredentials) {
  window.localStorage.setItem(REMEMBERED_CREDENTIALS_KEY, JSON.stringify(credentials));
}

function clearRememberedCredentials() {
  window.localStorage.removeItem(REMEMBERED_CREDENTIALS_KEY);
}
