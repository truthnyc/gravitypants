import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { siteHead } from "@/lib/site/seo";

export const Route = createFileRoute("/features")({
  head: () => siteHead({ path: "/features", title: "Product Video Maker Features — Gravity Pants", description: "Everything in the Gravity Pants product video maker: photo frames, text and fonts, brand kits, motion, four shapes plus custom sizes, MP4 and GIF export, templates and teams." }),
  component: FeaturesPage,
});

const groups = [
  {
    id: "photos",
    eyebrow: "Photos & frames",
    title: "Your photos, already in order.",
    points: [
      "Drag and drop photos, or pick them from your computer",
      "Each photo becomes a frame, timed automatically",
      "Add, duplicate, reorder or delete a frame in one click",
      "Move and zoom a photo inside the frame",
      "Paste a photo straight from your clipboard",
    ],
  },
  {
    id: "editing",
    eyebrow: "Editing",
    title: "Tap the thing you want to change.",
    points: [
      "Photo, headline, subline and logo on every frame",
      "Controls appear only for what you selected",
      "Undo and redo any change",
      "Everything saves as you work",
      "Play the reel while you edit",
    ],
  },
  {
    id: "text",
    eyebrow: "Text & fonts",
    title: "Words that look designed.",
    points: [
      "Search and preview the whole Google Fonts library",
      "Upload your own font file",
      "Size, weight and color for headline and subline",
      "Nine fixed positions, no nudging",
      "Apply one text style to every frame at once",
      "Optional darkening behind text for readability",
    ],
  },
  {
    id: "brand",
    eyebrow: "Brand kits",
    title: "Save your brand once.",
    points: [
      "Named brand kits with logo, colors and fonts",
      "Logo placement, size and opacity",
      "Brand colors in every color picker",
      "Optional end card on every ad",
      "Shared brand kits on the Team plan",
    ],
  },
  {
    id: "motion",
    eyebrow: "Motion & timing",
    title: "Smooth without any fiddling.",
    points: [
      "Transitions: fade, slide, swipe, zoom and cut",
      "Text animations: rise up, fade in and typewriter",
      "Photo movement: slow zoom and pan",
      "Each frame gets its own length, from 0.5 to 10 seconds",
      "Live playback with a moving playhead",
    ],
  },
  {
    id: "formats",
    eyebrow: "Formats",
    title: "One design, every screen.",
    points: [
      "9:16 for Reels, Stories and TikTok",
      "1:1 for feeds",
      "16:9 for banners and YouTube",
      "Switch format while editing and keep your words in place",
    ],
  },
  {
    id: "export",
    eyebrow: "Export",
    title: "Files ready to post.",
    points: [
      "MP4 for ads and social posts",
      "Animated GIF for email and websites",
      "Every size in one go",
      "Exports made in your browser, so nothing queues",
      "Finished files kept for 30 days to download again",
    ],
  },
  {
    id: "templates",
    eyebrow: "Templates & reuse",
    title: "Make one. Make fifty.",
    points: [
      "Ready-made templates from Gravity Pants",
      "Save your own ad as a template",
      "Make another from the same kit with new photos",
      "Duplicate and rename any ad",
      "Search your ads by name or template",
    ],
  },
  {
    id: "account",
    eyebrow: "Account & team",
    title: "Room for the people you work with.",
    points: [
      "Your ads, photos and exports stay private to your workspace",
      "Team plan: 5 seats with shared templates and brand kits",
      "Invite people by email, with owner, admin and editor roles",
      "Plan, exports and invoices on one billing page",
      "Priority support on paid plans",
    ],
  },
] as const;

const allFeatures = [
  ["Photos", "Drag-and-drop photos", "Automatic frames and timing", "Move and zoom inside a frame", "Add, duplicate, delete frames"],
  ["Editing", "Photo, headline, subline, logo", "Tap to select", "Undo and redo", "Saves as you work"],
  ["Text", "Google Fonts picker", "Upload your own font", "Size, weight, color", "Nine-point position", "Same on all frames"],
  ["Brand", "Named brand kits", "Logo, colors, fonts", "Logo placement and size", "End card", "Shared kits on Team"],
  ["Motion", "Fade, slide, swipe, zoom, cut", "Rise up, fade in, typewriter", "Slow zoom and pan", "Per-frame timing"],
  ["Formats", "9:16, 4:5, 1:1, 16:9, custom", "Switch while editing", "Layout adapts to the shape"],
  ["Export", "MP4 and GIF", "All sizes at once", "Made in your browser", "Kept for 30 days"],
  ["Templates", "Ready-made templates", "Save your own", "Make another from a kit", "Duplicate and rename"],
  ["Account", "Private workspace", "Team seats and roles", "Email invites", "Billing and invoices"],
  ["Support", "Help center", "Email support", "Priority on paid plans"],
];

function FeaturesPage() {
  return <SiteShell><div className="features-page">
    <section className="features-hero">
      <span className="site-eyebrow">Features</span>
      <h1>Everything you need.<br /><span>Nothing to learn.</span></h1>
      <p className="site-lede">Gravity Pants does one thing: it turns your photos into video ads. Here is everything that comes with it.</p>
      <nav className="features-jumps" aria-label="Jump to section">{groups.map(group => <a href={`#${group.id}`} key={group.id}>{group.eyebrow}</a>)}</nav>
    </section>
    <section className="features-list"><div className="features-list-inner">{groups.map(group => <div className="site-card features-group" id={group.id} key={group.id}>
      <span className="site-eyebrow">{group.eyebrow}</span>
      <h2>{group.title}</h2>
      <ul>{group.points.map(point => <li key={point}><span><Check size={13} strokeWidth={2.5} /></span>{point}</li>)}</ul>
    </div>)}</div></section>
    <section className="features-all"><div className="features-all-inner"><h2>All features</h2><div className="features-all-grid">{allFeatures.map(([title, ...items]) => <div key={title}><h3>{title}</h3>{items.map(item => <p key={item}>{item}</p>)}</div>)}</div></div></section>
    <section className="features-closing"><div className="site-card features-closing-inner"><div className="features-closing-copy"><h2>See it work on your own photos.</h2><p>Start with a 7-day free trial, then pick the plan that fits.</p><div><Button asChild variant="site" size="site"><Link to="/signup">Start free <ArrowRight size={18} /></Link></Button><Button asChild variant="siteSecondary" size="site"><Link to="/how-it-works">How it works</Link></Button></div></div><div className="features-closing-orbit" aria-hidden="true"><span /></div></div></section>
  </div></SiteShell>;
}
