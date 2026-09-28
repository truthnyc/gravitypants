import { useState } from "react";
import { HelpMenu } from "@/components/stillframe/HelpMenu";
import { Link } from "@tanstack/react-router";
import { Check, ChevronLeft, ChevronRight, LayoutGrid, Play, Square, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SaveStatus } from "./use-editor";

export function EditorHeader({
  id,
  name,
  status,
  canUndo,
  playing,
  onRename,
  onUndo,
  onPlayVideo,
  exportDisabled = false,
}: {
  id: string;
  name: string;
  status: SaveStatus;
  canUndo: boolean;
  playing: boolean;
  onRename: (name: string) => void;
  onUndo: () => void;
  onPlayVideo: () => void;
  exportDisabled?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <header className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 bg-card px-2 hairline-b safe-top lg:h-[60px] lg:grid-cols-[1fr_auto_1fr] lg:gap-4 lg:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Back to Your Ads">
          <Link to="/app/ads">
            <LayoutGrid className="hidden lg:block" strokeWidth={1.7} /><ChevronLeft className="lg:hidden" strokeWidth={1.7} />
          </Link>
        </Button>
        <HelpMenu />
        {editing ? (
          <input
            autoFocus
            defaultValue={name}
            aria-label="Ad name"
            className="h-11 min-w-0 flex-1 rounded-sm border bg-card px-2 text-[16px] font-semibold lg:h-8 lg:w-56 lg:flex-none lg:text-[15px]"
            onBlur={(e) => {
              const v = e.currentTarget.value.trim();
              if (v && v !== name) onRename(v);
              setEditing(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") setEditing(false);
            }}
          />
        ) : (
          <div className="min-w-0"><button type="button" onClick={() => setEditing(true)} className="block min-h-0 max-w-full truncate rounded-sm px-1 text-left text-[16px] font-semibold lg:text-[15px]" title="Rename">{name}</button><span className="flex items-center gap-1 px-1 text-[12px] text-secondary-text lg:hidden">{status === "saved" && <Check className="size-3.5 text-success-text" strokeWidth={1.7} />}{status === "saving" ? "Saving…" : status === "error" ? "Not saved" : "Saved"} · Step 2 of 3</span></div>
        )}
        <span className="hidden shrink-0 items-center gap-1 text-[12px] text-secondary-text lg:flex">
          {status === "saving" && "Saving…"}
          {status === "saved" && (
            <>
              <Check className="size-3.5" strokeWidth={1.7} /> Saved
            </>
          )}
          {status === "error" && <span className="text-destructive">Not saved — retrying on next change</span>}
        </span>
      </div>

      <nav className="hidden h-8 items-center rounded-lg bg-control-fill p-0.5 text-[13px] font-medium lg:flex" aria-label="Steps">
        <Link to="/app/ads" className="flex h-7 items-center gap-1.5 rounded-lg px-3 text-secondary-text">
          <span className="flex size-4 items-center justify-center rounded-full bg-toggle-on text-primary-foreground">
            <Check className="size-2.5" strokeWidth={2.5} />
          </span>
          Photos
        </Link>
        <span className="flex h-7 items-center gap-1.5 rounded-lg bg-card px-3 shadow-segment" aria-current="step">
          <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground nums">2</span>
          Edit
        </span>
        <Link to="/app/ad/$id/export" params={{ id }} className="flex h-7 items-center gap-1.5 rounded-lg px-3 text-secondary-text">
          <span className="flex size-4 items-center justify-center rounded-full border border-secondary-text/50 text-[10px] nums">3</span>
          Export
        </Link>
      </nav>

      <div className="flex items-center justify-end gap-1 lg:gap-2">
        <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} aria-label="Undo">
          <Undo2 strokeWidth={1.7} />
        </Button>
        <Button variant="plain" size="header" className="hidden lg:inline-flex" onClick={onPlayVideo}>
          {playing ? <Square strokeWidth={1.7} /> : <Play strokeWidth={1.7} />}
          {playing ? "Stop" : "Play Video"}
        </Button>
        {exportDisabled ? (
          <Button size="header" className="h-11 px-4 lg:h-[34px] lg:px-3.5" disabled>
            <span className="lg:hidden">Export</span><span className="hidden lg:inline">Next: Export</span> <ChevronRight strokeWidth={1.7} />
          </Button>
        ) : (
          <Button asChild size="header" className="h-11 px-4 lg:h-[34px] lg:px-3.5">
            <Link to="/app/ad/$id/export" params={{ id }}>
              <span className="lg:hidden">Export</span><span className="hidden lg:inline">Next: Export</span> <ChevronRight strokeWidth={1.7} />
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
