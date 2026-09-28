export type BlogPost = {
  slug: string;
  title: string;
  dek: string;
  date: string;
  minutes: number;
  tag: string;
  body: { h?: string; p: string[] }[];
};

export const POSTS: BlogPost[] = [
  {
    slug: "photos-beat-nothing-video-beats-photos",
    title: "Photos beat nothing. Video beats photos.",
    dek: "Feeds reward movement. Here's why a reel made from stills outperforms the stills themselves.",
    date: "September 22, 2026",
    minutes: 4,
    tag: "Why video",
    body: [
      {
        p: [
          "You already know the feeling: you post a photo of today's special, the new arrival, the finished job — and it does fine. Then the shop down the street posts a 15-second reel of the same thing and it does five times better.",
          "That's not because their photo was worse. It's because feeds are built to reward movement. A still frame gets a glance; a moving one gets a thumb to stop. And a stopped thumb is the whole game.",
        ],
      },
      {
        h: "You don't need footage to get motion",
        p: [
          "The common objection is \"I don't have video.\" You don't need it. Three well-shot photos — a wide, a detail, a close-up — contain everything a short ad needs. Add rhythm, text and a bit of timing, and the stills do the moving.",
          "That's the entire idea behind Gravity Pants: the camera roll you already have is the raw material. Pick three photos, tap the words to change them, and export a reel that looks like you hired someone.",
        ],
      },
      {
        h: "What the movement buys you",
        p: [
          "Motion buys attention. Text over motion buys comprehension. A consistent brand — the same logo, colors and fonts every time — buys memory. Attention times comprehension times memory is, roughly, a customer.",
          "One reel, three formats: a vertical cut for stories and TikTok, a square for feed posts, a wide one for anywhere else. Make it once; it works everywhere.",
        ],
      },
    ],
  },
  {
    slug: "three-photos-one-ad",
    title: "The three-photo rule: how to shoot for a reel you haven't made yet",
    dek: "A wide, a detail, a close-up. Shoot in that order and every tool — including this one — has what it needs.",
    date: "September 15, 2026",
    minutes: 3,
    tag: "Craft",
    body: [
      {
        p: [
          "The hardest part of any ad isn't the editing. It's standing there with a phone, wondering what to shoot. Here's the rule we use: every subject gets three photos, shot in the same order, every time.",
        ],
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
          "Wide, detail, close-up. If you shoot those three every time, you'll never open an editor wondering whether you have enough. You'll always have exactly enough — and making the reel takes minutes instead of an evening.",
        ],
      },
    ],
  },
  {
    slug: "why-tap-anything",
    title: "Why we built an editor with no timeline",
    dek: "Most tools hand you a timeline and wish you luck. We think the editing room should feel like tapping a label and typing over it.",
    date: "September 8, 2026",
    minutes: 4,
    tag: "Product",
    body: [
      {
        p: [
          "Ask someone who doesn't edit video why they don't, and you'll hear about the timeline. The tracks, the keyframes, the little diamond buttons. Video software was built for people who cut video for a living, and it shows.",
          "But the job a small business has isn't \"edit video.\" It's \"turn these three photos into something that moves, with our name on it, before lunch.\" Those are different jobs, and they deserve different tools.",
        ],
      },
      {
        h: "Tap anything, change everything",
        p: [
          "So we built the opposite of a timeline. You start with a finished reel — photos in, motion applied, text placed. Nothing is blank. From there, the whole screen is tappable: tap the headline to rewrite it, tap a photo to swap it, tap the words to change how they move.",
          "There's no way to break it, because there's nothing to break. You can't delete a keyframe you didn't know existed. You can't mis-place a logo; the brand kit already knows where it goes.",
        ],
      },
      {
        h: "The brand does the remembering",
        p: [
          "Set your logo, colors and fonts once and every new ad starts with them already applied. Teams share the kit, so the reel your intern makes looks like the reel you'd make — which is the whole point of having a brand.",
        ],
      },
      {
        p: [
          "We think that's what software for everyone else should feel like: a finished thing you adjust, not an empty thing you build.",
        ],
      },
    ],
  },
];

export function postBySlug(slug: string): BlogPost | undefined {
  return POSTS.find((p) => p.slug === slug);
}
