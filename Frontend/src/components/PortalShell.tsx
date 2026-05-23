import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { NavLink } from "@/components/NavLink";
import {
  Truck, Brain, Wrench, BarChart3, Send, History, LogOut, ChevronRight, Activity,
} from "lucide-react";

export function PortalShell({
  variant,
  hub,
}: {
  variant: "carrier" | "shipper";
  hub: string;
}) {
  const { user, roles, switchRole, signOut } = useAuth();
  const nav = useNavigate();

  const carrierNav = [
    { to: "/carrier",          label: "AI Load Matcher", icon: Brain, end: true },
    { to: "/carrier/fleet",    label: "Fleet Management",icon: Wrench },
  ];
  const shipperNav = [
    { to: "/shipper",          label: "Dashboard",      icon: BarChart3, end: true },
    { to: "/shipper/post",     label: "Post Shipment",  icon: Send },
    { to: "/shipper/history",  label: "Shipment History", icon: History },
  ];
  const items = variant === "carrier" ? carrierNav : shipperNav;
  const canSwitchRole = roles.includes("carrier") && roles.includes("shipper");

  const handleSignOut = async () => {
    await signOut();
    nav("/auth");
  };

  const handleSwitchRole = (nextRole: "carrier" | "shipper") => {
    if (nextRole === variant) return;
    if (!switchRole(nextRole)) return;
    nav(nextRole === "carrier" ? "/carrier" : "/shipper");
  };

  return (
    <div className="flex h-screen min-h-screen w-full overflow-hidden bg-surface">
      {/* Sidebar */}
      <aside className="hidden h-screen w-64 shrink-0 flex-col surface-1 md:flex">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md grid place-items-center" style={{ background: "var(--gradient-primary)" }}>
              <Truck className="h-4 w-4 text-primary-foreground" />
            </div>
            <div>
              <div className="font-display font-bold text-base leading-tight">LoadMind</div>
              <div className="text-[11px] text-muted-foreground">{hub}</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 space-y-1">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-muted-foreground hover:surface-2 hover:text-foreground transition"
                activeClassName="surface-2 text-primary lift-shadow"
              >
                <Icon className="h-4 w-4" />
                <span>{it.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-border/60 p-3 space-y-2">
          {variant === "carrier" && (
            <button className="btn-action w-full h-10 rounded-md text-sm font-semibold flex items-center justify-center gap-2">
              <Activity className="h-4 w-4" /> Optimize Route
            </button>
          )}
          <button
            onClick={handleSignOut}
            className="w-full h-10 rounded-md text-sm font-medium text-muted-foreground hover:surface-2 hover:text-foreground flex items-center justify-center gap-2 transition"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="h-16 surface-1 flex items-center justify-between px-4 md:px-8 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="pill" style={{ background: "hsl(var(--action) / 0.18)", color: "hsl(var(--action-deep))" }}>
              <span className="h-1.5 w-1.5 rounded-full bg-action animate-pulse-soft" /> System Online
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
            <span className="text-sm text-muted-foreground hidden sm:block truncate">
              {variant === "carrier" ? "Operations" : "Marketplace"}
            </span>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            {canSwitchRole && (
              <div
                className="relative grid h-9 grid-cols-2 rounded-md surface-2 p-1 text-xs font-semibold"
                role="tablist"
                aria-label="Switch account role"
              >
                <div
                  className={`absolute left-1 top-1 h-7 w-[calc(50%-0.25rem)] rounded-[4px] bg-white lift-shadow transition-transform duration-200 ease-out ${
                    variant === "shipper" ? "translate-x-full" : "translate-x-0"
                  }`}
                  aria-hidden="true"
                />
                {(["carrier", "shipper"] as const).map((roleOption) => {
                  const active = variant === roleOption;
                  return (
                    <button
                      key={roleOption}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => handleSwitchRole(roleOption)}
                      className={`relative z-10 h-7 min-w-[74px] rounded-[4px] px-3 transition-colors duration-200 ${
                        active
                          ? "text-primary"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {roleOption === "carrier" ? "Carrier" : "Shipper"}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="h-9 w-9 rounded-full grid place-items-center text-xs font-semibold text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              {(user?.email ?? "U").slice(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Mobile nav bar */}
        <nav className="md:hidden flex overflow-x-auto px-4 py-2 surface-1 gap-2">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-muted-foreground whitespace-nowrap surface-2"
                activeClassName="text-primary ring-1 ring-primary"
              >
                <Icon className="h-3.5 w-3.5" /> {it.label}
              </NavLink>
            );
          })}
        </nav>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
