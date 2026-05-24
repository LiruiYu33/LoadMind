import { useRef } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { NavLink } from "@/components/NavLink";
import {
  Truck, Brain, Wrench, BarChart3, Send, History, LogOut, ChevronRight, Route, CreditCard, ChevronDown,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PortalShell({
  variant,
  hub,
}: {
  variant: "carrier" | "shipper";
  hub: string;
}) {
  const { user, roles, switchRole, signOut } = useAuth();
  const nav = useNavigate();
  const location = useLocation();
  const accountMenuTriggerRef = useRef<HTMLButtonElement | null>(null);

  const carrierNav = [
    { to: "/carrier",          label: "AI Load Matcher", icon: Brain, end: true },
    { to: "/carrier/fleet",    label: "Fleet Management",icon: Wrench },
    { to: "/carrier/route",    label: "Route Optimizer", icon: Route },
    { to: "/carrier/billing",  label: "Billing & Fees",  icon: CreditCard },
  ];
  const shipperNav = [
    { to: "/shipper",          label: "Dashboard",      icon: BarChart3, end: true },
    { to: "/shipper/post",     label: "Post Shipment",  icon: Send },
    { to: "/shipper/history",  label: "Shipment History", icon: History },
    { to: "/shipper/billing",  label: "Billing & Fees", icon: CreditCard },
  ];
  const items = variant === "carrier" ? carrierNav : shipperNav;
  const activeIndex = Math.max(
    0,
    items.findIndex((it) => (
      it.end ? location.pathname === it.to : location.pathname === it.to || location.pathname.startsWith(`${it.to}/`)
    )),
  );
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
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-md grid place-items-center" style={{ background: "var(--gradient-primary)" }}>
              <Truck className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-display font-bold text-lg leading-tight">LoadMind</div>
              <div className="text-xs text-muted-foreground">{hub}</div>
            </div>
          </div>
        </div>

        <nav className="relative flex-1 overflow-y-auto px-3">
          <div
            className="absolute left-3 right-3 top-0 h-[55px] rounded-md bg-white lift-shadow transition-transform duration-300 ease-out"
            style={{ transform: `translateY(${activeIndex * 63}px)` }}
            aria-hidden="true"
          />
          <div className="relative z-10 space-y-2">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                className="group relative flex h-[55px] items-center gap-3.5 rounded-md px-4 text-[15px] font-semibold text-muted-foreground transition-colors duration-200 hover:text-foreground"
                activeClassName="text-primary [&_.nav-icon]:scale-110 [&_.nav-icon]:text-primary"
              >
                <Icon className="nav-icon h-5 w-5 shrink-0 transition-all duration-200 group-hover:scale-110" />
                <span className="relative z-10">{it.label}</span>
              </NavLink>
            );
          })}
          </div>
        </nav>

        <div className="shrink-0 border-t border-border/60 p-3" />
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
            <DropdownMenu
              onOpenChange={(open) => {
                if (!open) {
                  window.requestAnimationFrame(() => accountMenuTriggerRef.current?.blur());
                }
              }}
            >
              <DropdownMenuTrigger asChild>
                <button
                  ref={accountMenuTriggerRef}
                  type="button"
                  className="flex h-10 items-center gap-2 rounded-full pl-1 pr-2 transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  aria-label="Open account menu"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback
                      className="text-xs font-semibold text-primary-foreground"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      {(user?.email ?? "U").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>
                  <div className="font-display text-sm font-semibold">Account</div>
                  <div className="mt-1 truncate text-xs font-normal text-muted-foreground">
                    {user?.email ?? "Signed in user"}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
                className="group relative flex items-center gap-2 overflow-hidden rounded-md px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap surface-2 transition-colors duration-200 hover:text-foreground"
                activeClassName="text-primary ring-1 ring-primary [&_.nav-icon]:scale-110 [&_.nav-icon]:text-primary"
              >
                <Icon className="nav-icon h-3.5 w-3.5 shrink-0 transition-all duration-200 group-hover:scale-110" />
                <span className="relative z-10">{it.label}</span>
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
