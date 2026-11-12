"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogOut, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV } from "./nav";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { signOut } from "@/server/actions/auth";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 px-2 font-semibold tracking-tight">
      <span className="grid size-7 place-items-center rounded-lg bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <circle cx="12" cy="12" r="7.5" />
          <path d="M12 7.5v4.5l3 2" />
        </svg>
      </span>
      Life OS
    </Link>
  );
}

function NavList({ unread, onNavigate }: { unread: number; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-0.5">
      {NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
            isActive(pathname, href) && "bg-sidebar-accent font-medium text-foreground",
          )}
        >
          <Icon className="size-4" />
          <span className="flex-1">{label}</span>
          {href === "/powiadomienia" && unread > 0 && (
            <span className="rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-4 text-primary-foreground">{unread}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}

function Footer({ email }: { email: string }) {
  return (
    <div className="flex items-center gap-1 border-t pt-3">
      <div className="min-w-0 flex-1 truncate px-2 text-xs text-muted-foreground" title={email}>
        {email}
      </div>
      <ThemeToggle />
      <form action={signOut}>
        <Button variant="ghost" size="icon-sm" type="submit" aria-label="Wyloguj">
          <LogOut />
        </Button>
      </form>
    </div>
  );
}

export function Sidebar({ email, unread }: { email: string; unread: number }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r bg-sidebar p-3 lg:flex">
      <div className="pt-1">
        <Logo />
      </div>
      <div className="flex-1 overflow-y-auto">
        <NavList unread={unread} />
      </div>
      <Footer email={email} />
    </aside>
  );
}

export function MobileHeader({ email, unread }: { email: string; unread: number }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 flex items-center gap-2 border-b bg-background/80 px-3 py-2 backdrop-blur lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Menu" />}>
          <Menu />
        </SheetTrigger>
        <SheetContent side="left" className="flex w-72 flex-col gap-6 bg-sidebar p-3">
          <SheetTitle className="pt-1">
            <Logo />
          </SheetTitle>
          <div className="flex-1 overflow-y-auto">
            <NavList unread={unread} onNavigate={() => setOpen(false)} />
          </div>
          <Footer email={email} />
        </SheetContent>
      </Sheet>
      <Logo />
    </header>
  );
}
