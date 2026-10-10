# Smaller GIFs and videos by default

## GIF defaults
- Size: default to **Half** (was Full). Half size alone makes GIFs about 4 times smaller.
- Frame rate: default to **15 fps** (was 25). The 15 fps option already exists; making it the default cuts the file about 40% more. Still photos with slow movement look nearly the same at 15 fps.
- Colours: keep **Best** as the default, so quality holds.
- The size estimate next to each file updates to match.

Together, a typical GIF drops from roughly 40 MB to about 6 MB.

## Videos (MP4)
A 15 fps option would not help much for MP4. Video files mostly grow with picture detail, not frame count, and 15 fps makes movement look jerky. Better ways:
- Lower the video bitrate. Today it is 12 Mbps at 30 fps (20 at 60), much higher than social platforms keep (they recompress to about 3–6 Mbps). Use about **6 Mbps at 30 fps** and **10 at 60 fps**. Files get about half the size with no visible loss for still-photo motion.
- Set the backup encoder's quality setting from 20 to 23 (same visual result, smaller file).
- Keep 24/30/60 fps choices as they are.

## Technical details
- `ExportPage.tsx`: `gSize` default `"half"`, `gFps` default `15`; adjust `estimateMb` MP4 factor to the new bitrate.
- `exportMedia.ts`: bitrate ladder `[6M, 4M, 2.5M]` at 30 fps, `[10M, 6M, 4M]` at 60 fps; ffmpeg `-crf 23`.
