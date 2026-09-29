# Use the supplied ad on the public website

## What changes
- Replace the animated phone in the home page’s right-hand opening area with the supplied 9:16 ad, retaining the existing phone placement and surrounding layout.
- Replace the illustrated “Example of the week” reel on `/examples` with that same ad. Update the example’s title, description, duration, and supporting labels to match what the video actually shows; do not call extracted video frames original photos.
- Keep the rest of the examples gallery and editor untouched.

## Assets needed
- The uploaded `Example_of_the_week.mp4` is sufficient to show the ad in both locations. It is a 1080 × 1920 H.264 video, 7.8 seconds long, with no audio stream.
- Generate a lightweight poster image from the video for loading and reduced-motion preferences. If the existing featured layout keeps its small images, extract representative frames and label them as frames, not source photos.
- Optional: the original product photos and approved ad title/caption, only if the feature should continue to show an authentic “photos → reel” comparison. Otherwise use the video and frame captures with honest copy.

## Technical approach
- Make a web-sized copy of the supplied clip and its poster/frame captures; store public media as Lovable Assets pointers rather than in the repository.
- Use one shared video presentation for both placements: autoplay, muted, looping, inline in the home visual; give the featured example an accessible play/pause control. Preserve a poster fallback and avoid autoplay animation when reduced motion is requested.
- Adjust only the relevant home/examples styles for portrait fit at phone and desktop sizes. Verify both pages on desktop and phone, including playback, poster and reduced-motion behavior.