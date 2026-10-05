import { useEffect, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/**
 * Shared full-screen mobile navigation overlay used by both the marketing
 * site header and the app header so the two menus can't drift apart.
 *
 * Renders below the header (header height offset via `topClass`), locks body
 * scroll while open, and closes on link tap.
 */

export function useBodyScrollLock(open: boolean) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
}

export function MobileNavLink({
  to,
  onNavigate,
  className,
  active,
  children,
}: {
  to: string;
  onNavigate?: () => void;
  className?: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      to={to as "/"}
      onClick={onNavigate}
      className={cn(
        "flex min-h-14 items-center border-b border-site-line text-[24px] font-semibold text-site-ink",
        active && "text-site-primary",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function MobileNavPanel({
  open,
  topClass = "top-14",
  className,
  children,
}: {
  open: boolean;
  /** Header height offset, e.g. "top-14" (56px) or "top-[60px]". */
  topClass?: string;
  className?: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <nav
      aria-label="Mobile"
      className={cn(
        "absolute inset-x-0 flex h-[calc(100dvh-56px)] flex-col gap-1 overflow-y-auto bg-site-page px-5 py-8 safe-bottom lg:hidden",
        topClass,
        className,
      )}
    >
      {children}
    </nav>
  );
}
