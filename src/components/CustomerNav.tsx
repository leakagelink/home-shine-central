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
    <nav className="sticky bottom-0 z-20 border-t border-border bg-card/95 backdrop-blur">
      <ul className="mx-auto flex max-w-lg">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <Link
              to={to}
              activeOptions={{ exact: to === "/app" }}
              activeProps={{ className: "text-primary" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex flex-col items-center gap-1 py-2.5 text-[0.68rem] font-semibold"
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
    <header className="flex items-start justify-between gap-3 px-5 pt-8">
      <div>
        <h1 className="text-2xl font-bold leading-tight text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
