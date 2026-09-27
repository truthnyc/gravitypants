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

  const previewFrames = project.frames.slice(0, 4);
  const meta = `${project.frames.length} ${project.frames.length === 1 ? "frame" : "frames"} · ${formatSeconds(
    totalSeconds(project.frames),
  )} sec · ${project.formats.join(", ")}`;

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
        className="block rounded-sm bg-card p-3 shadow-card transition-shadow hover:shadow-popover/20"
        aria-label={`Open ${project.name}`}
      >
        <div className="flex h-[176px] items-center justify-center gap-2 rounded-sm bg-inspector/60 p-3">
          {previewFrames.length ? (
            previewFrames.map((frame) => (
              <FramePreview key={frame.id} frame={frame} format={project.primary_format} />
            ))
          ) : (
            <span className="text-[13px] text-secondary-text">No frames yet</span>
          )}
        </div>
        <div className="px-1 pt-3">
          <p className="truncate text-[14px] font-semibold">{project.name}</p>
          <p className="nums mt-0.5 truncate text-[12px] text-secondary-text">{meta}</p>
        </div>
      </Link>

      <div className="absolute right-4 top-4 flex items-center gap-1.5 opacity-100 md:opacity-0 md:transition-opacity md:group-hover:opacity-100 md:group-focus-within:opacity-100">
        <Button variant="plain" size="sm" className="bg-card/90" onClick={() => void handleDuplicate()}>
          Duplicate
        </Button>
        <DropdownMenu>
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
        </DropdownMenu>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
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
            className="h-10 w-full rounded-sm bg-control-fill px-3 text-[14px]"
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
