import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";

export function AppShell({
  title,
  action,
  children,
  fullBleed,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  fullBleed?: boolean;
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen max-w-md flex-col pb-26">
        {title !== undefined && (
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur">
            <h1 className="font-display text-2xl tracking-tight">{title}</h1>
            {action}
          </header>
        )}
        <main className={fullBleed ? "flex-1" : "flex-1 px-4 py-4"}>{children}</main>
      </div>
      <BottomNav />
    </div>
  );
}
