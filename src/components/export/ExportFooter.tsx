import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { formatSeconds } from "@/lib/stillframe/types";
import { exportSelectionCount } from "@/lib/stillframe/export-quality";

type ListedFile = { name: string; sizeName: string; ratio: string; width: number; height: number; kind: "mp4" | "gif"; estimatedBytes: number };
export function ExportFooter({ files, sizeNames, formats, seconds, remaining, action }: {
  files: ListedFile[]; sizeNames: string[]; formats: string[]; seconds: number; remaining: string; action: ReactNode;
}) {
  const [listOpen, setListOpen] = useState(false);
  const count = exportSelectionCount(sizeNames.length, formats.length);
  return (
    <Collapsible open={listOpen} onOpenChange={setListOpen} className="mt-6 border-t border-ap-hairline pt-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          {count > 0 && <p className="text-[14px] nums" aria-live="polite"><b>{count} {count === 1 ? "file" : "files"}</b> · {sizeNames.join(" + ")} · {formats.join(" + ")} · {formatSeconds(seconds)} sec each</p>}
          <div className="flex flex-wrap items-center text-[13px] text-ap-muted nums">
            {remaining && <span>{remaining}{files.length > 0 && " · "}</span>}
            {files.length > 0 && <Button variant="ghost" aria-expanded={listOpen} aria-controls="export-file-list" onClick={() => setListOpen((v) => !v)} className="h-auto min-h-7 px-1 text-[13px] font-normal text-ap-blue hover:text-ap-blue-hover">See file list</Button>}
          </div>
        </div>
        <div className="shrink-0">{action}</div>
      </div>
      <CollapsibleContent id="export-file-list">
        <ul aria-label="Selected export files" className="mt-3 space-y-2 rounded-lg bg-ap-panel p-3 text-[13px] nums">
          {files.map((file) => <li key={file.name}>{file.sizeName} · {file.ratio} · {file.width} × {file.height} px · {file.kind.toUpperCase()} · <span className="text-ap-muted">Est. {(file.estimatedBytes / 1_000_000).toFixed(1)} MB</span></li>)}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}