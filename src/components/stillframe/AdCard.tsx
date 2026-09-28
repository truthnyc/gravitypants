import { useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import {
  useDuplicateProject,
  useDuplicateWithNewPhotos,
  useSetTrashed,
  useUpdateProject,
  totalSeconds,
} from "@/lib/stillframe/data";
import { formatSeconds, type ProjectWithFrames } from "@/lib/stillframe/types";
import { isAcceptedImage } from "@/lib/stillframe/media";
import { FramePreview } from "./FramePreview";

export function AdCard({ project }: { project: ProjectWithFrames }) {
  const navigate = useNavigate();
  const duplicate = useDuplicateProject();
  const duplicateWithPhotos = useDuplicateWithNewPhotos();
  const setTrashed = useSetTrashed();
  const updateProject = useUpdateProject();
  const fileInput = useRef<HTMLInputElement>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const [draftName, setDraftName] = useState(project.name);
  const [actionsOpen, setActionsOpen] = useState(false);

  const previewFrames = project.frames.slice(0, 4);
  const meta = `${project.frames.length} ${project.frames.length === 1 ? "frame" : "frames"} · ${formatSeconds(
    totalSeconds(project.frames),
  )} sec`;

  async function handleDuplicate() {
    const id = await duplicate.mutateAsync(project);
    toast.success(`Copied "${project.name}"`);
    return id;
  }

  async function handleReplacePhotos(files: File[]) {
    const images = files.filter(isAcceptedImage);
    if (!images.length) return;
    const id = await duplicateWithPhotos.mutateAsync({ project, files: images });
    toast.success("Copy created with your new photos");
    navigate({ to: "/ad/$id/edit", params: { id } });
  }

  function handleTrash() {
    setTrashed.mutate(
      { id: project.id, trashed: true },
      {
        onSuccess: () =>
          toast(`"${project.name}" moved to Trash`, {
            action: {
              label: "Undo",
              onClick: () => setTrashed.mutate({ id: project.id, trashed: false }),
            },
          }),
      },
    );
  }

  return (
    <div className="group relative">
      <Link
        to="/ad/$id/edit"
        params={{ id: project.id }}
        className="block rounded-sm lg:bg-card lg:p-3 lg:shadow-card lg:transition-shadow lg:hover:shadow-popover/20"
        aria-label={`Open ${project.name}`}
      >
        <div className="flex aspect-square items-center justify-center gap-1.5 rounded-sm bg-card p-3 shadow-card lg:h-[176px] lg:aspect-auto lg:gap-2 lg:bg-inspector/60 lg:shadow-none">
          {previewFrames.length ? (
            previewFrames.map((frame) => (
              <FramePreview key={frame.id} frame={frame} format={project.primary_format} />
            ))
          ) : (
            <span className="text-[13px] text-secondary-text">No frames yet</span>
          )}
        </div>
        <div className="px-0.5 pt-2.5 pr-10 lg:px-1 lg:pt-3">
          <p className="truncate text-[16px] font-semibold lg:text-[14px]">{project.name}</p>
          <p className="nums mt-0.5 truncate text-[13px] text-secondary-text lg:text-[12px]">{meta}<span className="hidden lg:inline"> · {project.formats.join(", ")}</span></p>
        </div>
      </Link>

      <div className="absolute right-0 top-[calc(100%-48px)] flex items-center gap-1.5 lg:right-4 lg:top-4 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100 lg:group-focus-within:opacity-100">
        <Button variant="plain" size="sm" className="hidden bg-card/90 lg:inline-flex" onClick={() => void handleDuplicate()}>
          Duplicate
        </Button>
        <div className="hidden lg:block"><DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="plain" size="icon" className="h-8 w-8 bg-card/90" aria-label={`More options for ${project.name}`}>
              <MoreHorizontal size={16} strokeWidth={1.7} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[230px] rounded-sm shadow-popover">
            <DropdownMenuItem onSelect={() => navigate({ to: "/ad/$id/edit", params: { id: project.id } })}>
              Open
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void handleDuplicate()}>Duplicate</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => fileInput.current?.click()}>
              Duplicate with New Photos…
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() =>
                updateProject.mutate(
                  { id: project.id, patch: { is_template: true } },
                  { onSuccess: () => toast.success("Saved as template") },
                )
              }
            >
              Save as Template
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                setDraftName(project.name);
                setRenameOpen(true);
              }}
            >
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={handleTrash}>
              Move to Trash
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu></div>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={`More options for ${project.name}`} onClick={() => setActionsOpen(true)}><MoreHorizontal strokeWidth={1.7} /></Button>
      </div>

      <Drawer open={actionsOpen} onOpenChange={setActionsOpen} shouldScaleBackground={false}>
        <DrawerContent className="lg:hidden">
          <DrawerHeader><DrawerTitle>{project.name}</DrawerTitle></DrawerHeader>
          <div className="grid px-4 pb-6 text-left">
            <button className="flex h-12 items-center hairline-b" onClick={() => navigate({ to: "/ad/$id/edit", params: { id: project.id } })}>Open</button>
            <button className="flex h-12 items-center hairline-b" onClick={() => fileInput.current?.click()}>Duplicate with New Photos</button>
            <button className="flex h-12 items-center hairline-b" onClick={() => { updateProject.mutate({ id: project.id, patch: { is_template: true } }, { onSuccess: () => toast.success("Saved as template") }); setActionsOpen(false); }}>Save as Template</button>
            <button className="flex h-12 items-center hairline-b" onClick={() => { setDraftName(project.name); setActionsOpen(false); setRenameOpen(true); }}>Rename</button>
            <button className="flex h-12 items-center text-destructive" onClick={() => { setActionsOpen(false); handleTrash(); }}>Move to Trash</button>
          </div>
        </DrawerContent>
      </Drawer>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          void handleReplacePhotos(files);
        }}
      />

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="rounded-sm sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-[17px]">Rename ad</DialogTitle>
          </DialogHeader>
          <input
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            aria-label="Ad name"
            className="h-11 w-full rounded-sm bg-control-fill px-3 text-[16px] lg:h-10 lg:text-[14px]"
          />
          <DialogFooter>
            <Button variant="plain" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const name = draftName.trim();
                if (!name) return;
                updateProject.mutate({ id: project.id, patch: { name } });
                setRenameOpen(false);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
