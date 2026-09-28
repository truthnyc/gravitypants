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
        "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-5 rounded-sm border-2 border-dashed bg-card px-4 transition-colors sm:gap-8 sm:px-8 lg:flex lg:px-10",
        spacious ? "min-h-[150px] lg:min-h-[260px]" : "min-h-[140px] lg:min-h-[200px]",
        dragging ? "border-primary" : "border-placeholder-border",
      )}
    >
      <div className="flex shrink-0 items-center" aria-hidden="true">
        {["-8deg", "4deg", "-3deg"].map((rotation, index) => (
          <div
            key={rotation}
            className="h-[62px] w-[44px] rounded-sm bg-inspector shadow-card sm:h-[76px] sm:w-[58px]"
            style={{ transform: `rotate(${rotation})`, marginLeft: index ? -14 : 0 }}
          />
        ))}
      </div>

      <div className="min-w-0 flex-1 py-5 lg:py-8">
        <h2 className="text-[20px] font-bold lg:text-[28px]">New ad from photos</h2>
        <p className="mt-1 hidden text-[15px] text-secondary-text lg:block">Drop photos here, or</p>
        <Button
          className="mt-3 min-h-12 w-full text-[16px] sm:w-auto lg:mt-4 lg:min-h-10 lg:text-[14px]"
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
        accept="image/*"
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
