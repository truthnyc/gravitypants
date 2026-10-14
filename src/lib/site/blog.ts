import type { BlogVisualKind } from "@/components/site/BlogVisual";
export type BlogPost = {
  slug: string;
  title: string;
  /** Shorter title for search results (under 60 characters). */
  seoTitle?: string;
  dek: string;
  date: string;
  minutes: number;
  tag: string;
  body: { h?: string; p: string[]; visual?: BlogVisualKind }[];
};

export const POSTS: BlogPost[] = [
  {
    slug: "how-to-turn-photos-into-a-video",
    title: "How to turn photos into a video (without editing anything)",
    seoTitle: "How to Turn Photos Into a Video Ad",
    dek: "A few photos, a size and your own words. Here is how to get from a camera roll to a finished video ad.",
    date: "October 14, 2026",
    minutes: 4,
    tag: "How to",
    body: [
      {
        p: [
          "You have good photos of your product, your shop or your work. You want a video for Reels, Stories or TikTok, but you don't have footage and you don't want to learn a video editor.",
          "You don't need either. A short video ad can be built entirely from still photos. Here is the whole process, step by step.",
        ],
      },
      {
        h: "1. Choose three to five photos",
        p: [
          "Pick photos that show one thing clearly. A useful set is one wide shot, one detail and one close-up, in that order. The wide shot says what we are looking at, the detail makes it believable and the close-up gives the ending somewhere to land.",
          "Photos you already have are fine. Clear, well lit and in focus matters more than a new camera.",
        ],
        visual: "three-shots",
      },
      {
        h: "2. Pick the size first",
        p: [
          "Decide where the video will be posted before you start. Vertical 9:16 suits Reels, Stories and TikTok. Portrait 4:5 and square 1:1 suit feeds. Wide 16:9 and 5:4 suit banners, websites and YouTube.",
          "Choosing the size first means your photos and words are placed for that shape from the start, instead of being cropped later.",
        ],
        visual: "formats",
      },
      {
        h: "3. Change the words, not the timing",
        p: [
          "In Gravity Pants your photos already move and the words are already in place when the reel opens. Tap the headline to rewrite it, tap a photo to replace it and tap the text to change how it moves.",
          "Keep the words short. One headline and one short line under it is usually enough. Finish with what you want people to do, such as visit, book or shop.",
        ],
      },
      {
        h: "4. Add your brand once",
        p: [
          "Set up your logo, colors and fonts in a brand kit. Every new ad starts with them, so your videos look like they come from the same business without extra work.",
        ],
      },
      {
        h: "5. Download an MP4 or GIF",
        p: [
          "Export the finished reel as an MP4 for social posts or as an animated GIF for emails and websites. You can export the other sizes from the same ad, so one set of photos covers several places.",
          "Then post it where your customers already look.",
        ],
      },
      {
        h: "Try it with photos you already have",
        p: [
          "The free trial needs no card and has no time limit. Your first export has no watermark, so you can make a real ad and see how it does.",
        ],
      },
    ],
  },
  {
    slug: "photos-beat-nothing-video-beats-photos",
    title: "Photos beat nothing. Video beats photos.",
    dek: "A little movement can make the product photos you already have work harder in a busy feed.",
    date: "September 22, 2026",
    minutes: 4,
    tag: "Why video",
    body: [
      {
        p: [
          "You post a photo of today's special, a new arrival or a finished job. It does fine. Then another business posts a short reel of something similar and gets much more attention.",
          "The difference may be movement. A photo is easy to pass, while a moving image gives people another reason to stop and look.",
        ],
        visual: "photo-vs-reel",
      },
      {
        h: "You don't need footage to get motion",
        p: [
          "You do not need video footage. Three clear photos, such as a wide shot, a detail and a close-up, are enough for a short ad. Movement, words and timing do the rest.",
          "That is the idea behind Gravity Pants. Choose a few photos you already have, change the words and download a finished reel.",
        ],
      },
      {
        h: "What the movement buys you",
        p: [
          "Movement can catch someone's attention. Words explain what they are looking at. Using the same logo, colors and fonts helps them recognize your business the next time they see it.",
          "The same reel can be exported three ways: vertical for Reels, Stories and TikTok, square for feeds and wide for banners or YouTube.",
        ],
        visual: "formats",
      },
    ],
  },
  {
    slug: "three-photos-one-ad",
    title: "The three-photo rule: how to shoot for a reel you haven't made yet",
    seoTitle: "The Three-Photo Rule for Better Video Ads",
    dek: "Take one wide photo, one detail and one close-up. That is usually enough for a useful product reel.",
    date: "September 15, 2026",
    minutes: 3,
    tag: "Craft",
    body: [
      {
        p: [
          "The hardest part of any ad isn't the editing. It's standing there with a phone, wondering what to shoot. Here's the rule we use: every subject gets three photos, shot in the same order, every time.",
        ],
        visual: "three-shots",
      },
      {
        h: "1. The wide",
        p: [
          "The establishing shot. The whole dish on the table, the full storefront, the finished room. This is the photo that says what we're looking at. It goes first in the reel.",
        ],
      },
      {
        h: "2. The detail",
        p: [
          "Move closer. The steam coming off the bowl, the stitching on the jacket, the corner where the paint meets the trim. This is the photo that makes people believe you. It carries the middle of the reel.",
        ],
      },
      {
        h: "3. The close-up",
        p: [
          "Closer still — a texture, a color, a face. Abstract enough to feel designed, honest enough to be yours. This is the photo the end card lands on, with your logo and the words \"come in\" or \"shop now\" or whatever your call to action is.",
        ],
      },
      {
        h: "That's it",
        p: [
          "Wide, detail, close-up. If you take those three each time, you can start editing without wondering whether you have enough material.",
        ],
      },
    ],
  },
  {
    slug: "why-tap-anything",
    title: "Why we built an editor with no timeline",
    dek: "Traditional video timelines are useful for editors. Most small businesses need a simpler place to start.",
    date: "September 8, 2026",
    minutes: 4,
    tag: "Product",
    body: [
      {
        p: [
          "Traditional video editors start with a timeline full of tracks, keyframes and unfamiliar controls. That makes sense for people who edit video every day, but it is more than many small businesses need.",
          "Most small businesses have a simpler job: turn a few photos into a short ad with their name on it. We built Gravity Pants for that job.",
        ],
      },
      {
        h: "Tap anything, change everything",
        p: [
          "Instead of starting with an empty timeline, you start with a reel that already plays. Your photos have movement and the words are in place. Tap the headline to rewrite it, tap a photo to replace it or tap the words to change how they move.",
          "You do not need to manage hidden tracks or keyframes. The brand kit also keeps your logo in a consistent place.",
        ],
        visual: "timeline-vs-tap",
      },
      {
        h: "The brand does the remembering",
        p: [
          "Set your logo, colors and fonts once and every new ad starts with them already applied. Teams share the kit, so the reel your intern makes looks like the reel you'd make — which is the whole point of having a brand.",
        ],
      },
      {
        p: [
          "We want the editor to give you a useful starting point, then make every change easy to find.",
        ],
      },
    ],
  },
];

export function postBySlug(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}
