import { Link } from "@tanstack/react-router";

const STATUS_URL = "https://status.gravitypants.com";

const linkCls = "min-h-0 min-w-0 text-[13px] text-ap-muted hover:text-ap-blue";

export function AppFooter() {
  return (
    <footer className="border-t border-ap-hairline bg-ap-panel font-ap">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center gap-x-5 gap-y-1 px-6 py-4 text-[13px] text-ap-muted">
        <span>© {new Date().getFullYear()} Gravity Pants</span>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-1 sm:ml-auto">
          <Link to="/app/help" className={linkCls}>Help center</Link>
          <a href={STATUS_URL} target="_blank" rel="noreferrer" className={linkCls}>Status</a>
          <Link to="/privacy" className={linkCls}>Privacy</Link>
          <Link to="/terms" className={linkCls}>Terms</Link>
        </nav>
      </div>
    </footer>
  );
}
