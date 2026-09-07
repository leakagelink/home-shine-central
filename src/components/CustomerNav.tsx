import { Link } from "@tanstack/react-router";
import { Home, CalendarCheck, Bell, User } from "lucide-react";

const items = [
  { to: "/app" as const, label: "Home", icon: Home },
  { to: "/app/bookings" as const, label: "Bookings", icon: CalendarCheck },
  { to: "/app/notifications" as const, label: "Alerts", icon: Bell },
  { to: "/app/account" as const, label: "Account", icon: User },
];

export function CustomerNav() {
  return (
    <nav className="sticky bottom-0 z-20 border-t border-border bg-card/90 px-2 pb-[max(0.35rem,env(safe-area-inset-bottom))] backdrop-blur-xl">
      <ul className="mx-auto flex max-w-lg gap-1">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact: to === "/app" }}
              activeProps={{ className: "bg-secondary text-primary shadow-sm" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="my-1.5 flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.68rem] font-semibold hover:bg-secondary/60"
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mx-auto flex w-full max-w-4xl animate-rise items-start justify-between gap-3 px-5 pt-8">
      <div>
        <h1 className="text-4xl leading-none text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
