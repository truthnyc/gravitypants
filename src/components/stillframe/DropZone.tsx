import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isAcceptedImage } from "@/lib/stillframe/media";
import { useCreateAdFromPhotos, type UploadProgress } from "@/lib/stillframe/data";

export function DropZone({ spacious = false }: { spacious?: boolean }) {
  const navigate = useNavigate();
  const createAd = useCreateAdFromPhotos();
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);

  async function startFromFiles(files: File[]) {
    const images = files.filter(isAcceptedImage);
    if (!images.length) {
      toast.error("Please choose JPG, PNG, HEIC or WebP photos");
      return;
    }
    try {
      const id = await createAd.mutateAsync({ files: images, onProgress: setUploads });
      setUploads([]);
      navigate({ to: "/ad/$id/edit", params: { id } });
    } catch {
      setUploads([]);
      toast.error("Those photos could not be uploaded. Please try again.");
    }
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        void startFromFiles(Array.from(event.dataTransfer.files));
      }}
      className={cn(
        "flex items-center gap-8 rounded-sm border-2 border-dashed bg-card px-10 transition-colors",
        spacious ? "min-h-[260px]" : "min-h-[200px]",
        dragging ? "border-primary" : "border-placeholder-border",
      )}
    >
      <div className="flex shrink-0 items-center" aria-hidden="true">
        {["-8deg", "4deg", "-3deg"].map((rotation, index) => (
          <div
            key={rotation}
            className="h-[76px] w-[58px] rounded-sm bg-inspector shadow-card"
            style={{ transform: `rotate(${rotation})`, marginLeft: index ? -14 : 0 }}
          />
        ))}
      </div>

      <div className="min-w-0 flex-1 py-8">
        <h2 className="text-[28px] font-bold tracking-[-0.02em]">New ad from photos</h2>
        <p className="mt-1 text-[15px] text-secondary-text">Drop photos here, or</p>
        <Button
          className="mt-4"
          size="main"
          disabled={createAd.isPending}
          onClick={() => fileInput.current?.click()}
        >
          {createAd.isPending ? "Uploading…" : "Choose Photos"}
        </Button>

        {uploads.length > 0 && (
          <ul className="mt-5 max-w-[420px] space-y-2">
            {uploads.map((upload) => (
              <li key={upload.name}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate text-[12px] text-secondary-text">{upload.name}</span>
                  <span className="nums text-[12px] text-secondary-text">
                    {Math.round(upload.progress * 100)}%
                  </span>
                </div>
                <div className="mt-1 h-[3px] overflow-hidden rounded-lg bg-control-fill">
                  <div
                    className="h-full bg-primary transition-[width] duration-300"
                    style={{ width: `${Math.max(upload.progress * 100, 4)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
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
          void startFromFiles(files);
        }}
      />
    </div>
  );
}
