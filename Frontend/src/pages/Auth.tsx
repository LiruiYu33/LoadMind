import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Package, ArrowRight, ShieldCheck, LockKeyhole, Database, MapPinned, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, AppRole } from "@/lib/auth";
import { toast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { LoadMindLoader } from "@/components/LoadMindLoader";
import { PasswordPolicyChecklist } from "@/components/PasswordPolicyChecklist";
import { getPasswordPolicyChecks, getPasswordPolicyError, PASSWORD_POLICY_TEXT } from "@/lib/password-policy";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const REMEMBERED_LOGIN_KEY = "loadmind.rememberedLogin.v2";
const LEGACY_REMEMBERED_CREDENTIALS_KEY = "loadmind.rememberedCredentials.v1";

type RememberedLogin = {
  email: string;
  role: AppRole;
};

const Auth = () => {
  const nav = useNavigate();
  const { refreshRole } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<AppRole>("carrier");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberLogin, setRememberLogin] = useState(false);
  const [busy, setBusy] = useState(false);
  const passwordChecks = getPasswordPolicyChecks(password);

  useEffect(() => {
    clearLegacyRememberedCredentials();
    const remembered = readRememberedLogin();
    if (!remembered) return;

    setEmail(remembered.email);
    setRole(remembered.role);
    setRememberLogin(true);
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
    if (mode === "signup") {
      const passwordPolicyError = getPasswordPolicyError(password);
      if (passwordPolicyError) {
        toast({
          title: "Password is too weak",
          description: PASSWORD_POLICY_TEXT,
          variant: "destructive",
        });
        return;
      }
    }

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
        if (rememberLogin) {
          writeRememberedLogin({ email, role });
        } else {
          clearRememberedLogin();
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
            in Victoria.
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
      <div className="relative bg-surface flex items-center justify-center p-8 pb-24 lg:p-16 lg:pb-24">
        {busy ? (
          <LoadMindLoader
            label={mode === "signin" ? "Signing in to LoadMind" : "Creating workspace"}
            detail={mode === "signin" ? "Preparing your selected portal" : "Setting up your LoadMind access"}
            className="h-[520px] bg-transparent"
          />
        ) : (
          <>
            <div className="w-full max-w-md">
              <div className="label-eyebrow mb-2 text-center">{mode === "signin" ? "RETURNING OPERATOR" : "NEW WORKSPACE"}</div>
              <h2 className="font-display text-3xl font-bold mb-8 text-center">
                {mode === "signin" ? "Sign in to LoadMind" : "Create your workspace"}
              </h2>

              {/* Role selector */}
              <div className="label-eyebrow mb-3 text-center">SELECT ROLE</div>
              <div
                className="relative mb-8 grid grid-cols-2 rounded-md surface-1 p-1"
                role="tablist"
                aria-label="Select account role"
              >
                <div
                  className={`absolute left-1 top-1 h-[calc(100%-0.5rem)] w-[calc(50%-0.25rem)] rounded-[4px] bg-white lift-shadow transition-transform duration-300 ease-out ${
                    role === "shipper" ? "translate-x-full" : "translate-x-0"
                  }`}
                  aria-hidden="true"
                />
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
                      role="tab"
                      aria-selected={active}
                      onClick={() => setRole(opt.v)}
                      className={`relative z-10 rounded-[4px] p-4 text-center transition-colors duration-200 ${
                        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className={`mx-auto mb-3 h-5 w-5 transition-transform duration-200 ${active ? "scale-110" : ""}`} />
                      <div className="font-display text-sm font-semibold">{opt.t}</div>
                      <div className={`mt-0.5 text-xs ${active ? "text-primary/75" : "text-muted-foreground"}`}>{opt.d}</div>
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
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={mode === "signup" ? 10 : undefined}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={mode === "signin" ? "current-password" : "new-password"}
                      className="w-full h-11 rounded-md surface-2 px-3 pr-11 ring-1 ring-transparent outline-none transition focus:ring-primary"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((next) => !next)}
                      className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-md text-muted-foreground transition hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {mode === "signup" && (
                    <PasswordPolicyChecklist
                      hasMinLength={passwordChecks.hasMinLength}
                      hasSpecialCharacter={passwordChecks.hasSpecialCharacter}
                    />
                  )}
                </div>
                {mode === "signin" && (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Checkbox
                      checked={rememberLogin}
                      onCheckedChange={(checked) => {
                        const next = checked === true;
                        setRememberLogin(next);
                        if (!next) clearRememberedLogin();
                      }}
                      aria-label="Remember email"
                    />
                    Remember email
                  </label>
                )}

                <button
                  type="submit"
                  disabled={busy}
                  className="btn-primary-gradient w-full h-11 rounded-md font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {mode === "signin" ? "Sign in" : "Create workspace"} <ArrowRight className="h-4 w-4" />
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

            <PrivacyPolicyDialog />
          </>
        )}
      </div>
    </div>
  );
};

export default Auth;

function getErrorField(err: unknown, field: "message" | "code") {
  if (typeof err !== "object" || err === null || !(field in err)) return "";
  return String((err as Record<"message" | "code", unknown>)[field] ?? "");
}

function readRememberedLogin(): RememberedLogin | null {
  try {
    const raw = window.localStorage.getItem(REMEMBERED_LOGIN_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<RememberedLogin>;
    if (
      typeof parsed.email !== "string" ||
      (parsed.role !== "carrier" && parsed.role !== "shipper")
    ) {
      clearRememberedLogin();
      return null;
    }

    return {
      email: parsed.email,
      role: parsed.role,
    };
  } catch {
    clearRememberedLogin();
    return null;
  }
}

function writeRememberedLogin(login: RememberedLogin) {
  window.localStorage.setItem(REMEMBERED_LOGIN_KEY, JSON.stringify(login));
}

function clearRememberedLogin() {
  window.localStorage.removeItem(REMEMBERED_LOGIN_KEY);
}

function clearLegacyRememberedCredentials() {
  window.localStorage.removeItem(LEGACY_REMEMBERED_CREDENTIALS_KEY);
}

function PrivacyPolicyDialog() {
  const protections = [
    {
      icon: ShieldCheck,
      title: "Privacy-first handling",
      text: "We collect only the account, role, shipment, route, and fleet details needed to run the freight workflow.",
    },
    {
      icon: LockKeyhole,
      title: "Protected access",
      text: "Authentication is handled through Supabase, and your active Carrier or Shipper portal is controlled by the role you choose at sign in.",
    },
    {
      icon: Database,
      title: "Operational use only",
      text: "Shipment and location details are used for posting loads, matching carriers, route display, status tracking, and price suggestions.",
    },
    {
      icon: MapPinned,
      title: "Address transparency",
      text: "Map and address features use selected street addresses for geocoding and route display. We show readable addresses instead of asking users to manage raw coordinates.",
    },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xs font-semibold uppercase tracking-wide text-muted-foreground underline-offset-4 transition hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-background"
        >
          Privacy Policy
        </button>
      </DialogTrigger>
      <DialogContent className="grid max-h-[88vh] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-lg border-border/70 bg-surface p-0 shadow-2xl">
        <div className="surface-1 border-b border-border/60 px-6 py-5">
          <DialogHeader>
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="font-display text-2xl">LoadMind Privacy Policy</DialogTitle>
            <DialogDescription>
              A short summary of how this MVP protects account, shipment, route, and fleet information.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="min-h-0 space-y-5 overflow-y-auto px-6 py-5">
          <div className="grid gap-3 sm:grid-cols-2">
            {protections.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="surface-2 rounded-md p-4">
                  <Icon className="mb-3 h-4 w-4 text-primary" />
                  <div className="font-display text-sm font-semibold">{item.title}</div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                </div>
              );
            })}
          </div>

          <div className="surface-2 rounded-md p-4 text-sm leading-relaxed text-muted-foreground">
            <div className="label-eyebrow mb-2">STANDARDS WE ARE GUIDED BY</div>
            LoadMind is designed around privacy and security principles from the Australian Privacy Principles,
            GDPR-style transparency and data minimisation principles, and OWASP secure web application guidance.
            This MVP is not a legal compliance certification, but these principles guide how we handle user and
            operational data.
          </div>

          <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-3">
            <div>
              <div className="font-display font-semibold text-foreground">No payment data</div>
              <p className="mt-1">The MVP does not ask for card details, invoices, or banking information.</p>
            </div>
            <div>
              <div className="font-display font-semibold text-foreground">Limited sharing</div>
              <p className="mt-1">We use third-party services only where needed for authentication, storage, maps, and routing.</p>
            </div>
            <div>
              <div className="font-display font-semibold text-foreground">User control</div>
              <p className="mt-1">Users can sign out at any time, and service restarts require a fresh login.</p>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t border-border/60 bg-surface px-6 py-4 shadow-[0_-8px_24px_hsl(var(--background)/0.25)]">
          <DialogClose asChild>
            <button type="button" className="btn-primary-gradient h-10 rounded-md px-5 text-sm font-semibold">
              Close
            </button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
