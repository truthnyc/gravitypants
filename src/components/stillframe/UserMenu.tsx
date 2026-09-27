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

export function UserMenu() {
  const { data: me } = useMe();
  const signOut = useSignOut();
  const check = useServerFn(checkAdmin);
  const { data: adm } = useQuery({ queryKey: ["is-admin"], queryFn: () => check(), staleTime: 300_000 });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Your account">
        <Avatar me={me} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <div className="truncate text-[14px] font-semibold">{me?.displayName || "Your account"}</div>
          <div className="truncate text-[13px] text-secondary-text">{me?.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link to="/account">Account</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/brand">Brand Kit</Link>
        </DropdownMenuItem>
        {adm?.admin && (
          <DropdownMenuItem asChild>
            <Link to="/admin">Admin</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>Sign Out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
