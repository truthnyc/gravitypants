import { Link } from "@tanstack/react-router";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initialsOf, useMe, useSignOut, type Me } from "@/lib/stillframe/account";
import { MediaImage } from "./MediaImage";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { checkAdmin } from "@/lib/stillframe/admin.functions";
import { planName, useBilling } from "@/lib/stillframe/billing";
import { usePlanAccess } from "@/lib/stillframe/plan";
import { peekWorkspaceId } from "@/lib/stillframe/workspace";
import { cn } from "@/lib/utils";
import { switchWorkspace, useMyWorkspaces } from "./WorkspaceSwitcher";

export function Avatar({ me, size = 32 }: { me: Me | null | undefined; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-control-fill text-[12px] font-semibold text-foreground"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {me?.avatarPath ? (
        <MediaImage path={me.avatarPath} alt="" className="h-full w-full object-cover" />
      ) : (
        initialsOf(me)
      )}
    </span>
  );
}

/** Shared desktop dropdown look (avatar menu, Explore). */
export const menuContent = "rounded-[16px] border-0 bg-ap-card p-2 shadow-[var(--ap-shadow-menu)]";
export const menuItem = "cursor-pointer rounded-lg px-2 py-2 text-[14px] text-ap-ink focus:bg-ap-panel data-[highlighted]:bg-ap-panel";
export const menuLabel = "px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ap-muted";
const sep = "-mx-2 my-2 bg-ap-hairline";

export function UserMenu({ websiteMenu = false }: { websiteMenu?: boolean }) {
  const { data: me } = useMe();
  const signOut = useSignOut();
  const { data: billing } = useBilling();
  const { data: access } = usePlanAccess();
  const { data: workspaces } = useMyWorkspaces();
  const active = peekWorkspaceId();
  const check = useServerFn(checkAdmin);
  const { data: adm } = useQuery({
    queryKey: ["is-admin", me?.id ?? null],
    enabled: !!me,
    retry: false,
    staleTime: 300_000,
    // Signed-out (or mid sign-out) calls have no session: treat as "not admin" instead of crashing.
    queryFn: async () => {
      try {
        return await check();
      } catch {
        return { admin: false };
      }
    },
  });
  const name = me?.displayName || me?.email?.split("@")[0] || "Your account";
  const plan = billing?.plan && billing.plan !== "none" ? planName(billing.plan) : null;
  const ids = (workspaces ?? []).map((w) => w.id);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex min-h-0 min-w-0 items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Your account">
        <Avatar me={me} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className={cn(menuContent, "w-[280px]")}>
        <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2 font-normal">
          <Avatar me={me} size={36} />
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold text-ap-ink">{name}</div>
            <div className="truncate text-[12px] text-ap-muted">{[me?.email, plan].filter(Boolean).join(" · ")}</div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className={sep} />
        {websiteMenu ? (
          <DropdownMenuItem asChild className={menuItem}><Link to="/app/ads">Your Ads</Link></DropdownMenuItem>
        ) : (
          workspaces && workspaces.length > 0 && (
            <>
              <DropdownMenuLabel className={menuLabel}>Workspaces</DropdownMenuLabel>
              {workspaces.map((w) => (
                <DropdownMenuItem key={w.id} className={cn(menuItem, "gap-2")} onSelect={() => void switchWorkspace(w.id, ids)}>
                  <span className="min-w-0 flex-1 truncate">{w.name}</span>
                  {w.id === active && <span className="text-[12px] text-ap-muted">Current</span>}
                </DropdownMenuItem>
              ))}
            </>
          )
        )}
        <DropdownMenuSeparator className={sep} />
        <DropdownMenuItem asChild className={menuItem}><Link to="/app/account">Account</Link></DropdownMenuItem>
        <DropdownMenuItem asChild className={menuItem}><Link to="/app/account/favorites">Favorites</Link></DropdownMenuItem>
        <DropdownMenuItem asChild className={menuItem}><Link to="/app/account/billing">Billing</Link></DropdownMenuItem>
        {access?.team && <DropdownMenuItem asChild className={menuItem}><Link to="/app/account/members">Team</Link></DropdownMenuItem>}
        {adm?.admin && <DropdownMenuItem asChild className={menuItem}><Link to="/admin">Admin</Link></DropdownMenuItem>}
        <DropdownMenuSeparator className={sep} />
        <DropdownMenuItem asChild className={menuItem}><Link to="/help">Help center</Link></DropdownMenuItem>
        <DropdownMenuItem asChild className={menuItem}><a href="https://status.gravitypants.com" target="_blank" rel="noreferrer">Status</a></DropdownMenuItem>
        <DropdownMenuSeparator className={sep} />
        <DropdownMenuItem className={cn(menuItem, "text-ap-red focus:text-ap-red")} onSelect={() => void signOut()}>Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
