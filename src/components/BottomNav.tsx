import { Link } from "@tanstack/react-router";
import { Calendar, Map, User } from "lucide-react";

export function BottomNav() {
  const item = "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs text-muted-foreground transition-colors data-[status=active]:text-primary";
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex max-w-md">
        <Link to="/events" className={item} activeProps={{ "data-status": "active" } as any}>
          <Calendar className="h-5 w-5" />
          Events
        </Link>
        <Link to="/map" className={item} activeProps={{ "data-status": "active" } as any}>
          <Map className="h-5 w-5" />
          Map
        </Link>
        <Link to="/profile" className={item} activeProps={{ "data-status": "active" } as any}>
          <User className="h-5 w-5" />
          Profile
        </Link>
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
