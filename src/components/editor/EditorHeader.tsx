import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronRight, LayoutGrid, Play, Square, Undo2 } from "lucide-react";
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
    <header className="grid h-[60px] shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-4 bg-card px-4 hairline-b">
      <div className="flex min-w-0 items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Back to Your Ads">
          <Link to="/">
            <LayoutGrid strokeWidth={1.7} />
          </Link>
        </Button>
        {editing ? (
          <input
            autoFocus
            defaultValue={name}
            aria-label="Ad name"
            className="h-8 w-56 rounded-sm border bg-card px-2 text-[15px] font-semibold"
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
          <button type="button" onClick={() => setEditing(true)} className="truncate rounded-sm px-1 text-[15px] font-semibold hover:bg-control-fill" title="Rename">
            {name}
          </button>
        )}
        <span className="flex shrink-0 items-center gap-1 text-[12px] text-secondary-text">
          {status === "saving" && "Saving…"}
          {status === "saved" && (
            <>
              <Check className="size-3.5" strokeWidth={1.7} /> Saved
            </>
          )}
          {status === "error" && <span className="text-destructive">Not saved — retrying on next change</span>}
        </span>
      </div>

      <nav className="flex h-8 items-center rounded-lg bg-control-fill p-0.5 text-[13px] font-medium" aria-label="Steps">
        <Link to="/" className="flex h-7 items-center gap-1.5 rounded-lg px-3 text-secondary-text">
          <span className="flex size-4 items-center justify-center rounded-full bg-toggle-on text-primary-foreground">
            <Check className="size-2.5" strokeWidth={2.5} />
          </span>
          Photos
        </Link>
        <span className="flex h-7 items-center gap-1.5 rounded-lg bg-card px-3 shadow-segment" aria-current="step">
          <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground nums">2</span>
          Edit
        </span>
        <Link to="/ad/$id/export" params={{ id }} className="flex h-7 items-center gap-1.5 rounded-lg px-3 text-secondary-text">
          <span className="flex size-4 items-center justify-center rounded-full border border-secondary-text/50 text-[10px] nums">3</span>
          Export
        </Link>
      </nav>

      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="icon" onClick={onUndo} disabled={!canUndo} aria-label="Undo">
          <Undo2 strokeWidth={1.7} />
        </Button>
        <Button variant="plain" size="header" onClick={onPlayVideo}>
          {playing ? <Square strokeWidth={1.7} /> : <Play strokeWidth={1.7} />}
          {playing ? "Stop" : "Play Video"}
        </Button>
        {exportDisabled ? (
          <Button size="header" disabled>
            Next: Export <ChevronRight strokeWidth={1.7} />
          </Button>
        ) : (
          <Button asChild size="header">
            <Link to="/ad/$id/export" params={{ id }}>
              Next: Export <ChevronRight strokeWidth={1.7} />
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
