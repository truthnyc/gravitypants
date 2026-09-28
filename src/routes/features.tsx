import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Play } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/features")({
  head: () => ({ meta: [
    { title: "Features — Gravity Pants" },
    { name: "description", content: "Explore everything Gravity Pants offers to turn photos into video ads: editing, branding, motion, formats, and export." },
    { property: "og:title", content: "Features — Gravity Pants" },
    { property: "og:description", content: "Everything you need to turn photos into video ads. Nothing to learn." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: FeaturesPage,
});

const sections = [
  { id: "create", eyebrow: "Create", title: "Drop photos. Get a reel.", description: "Drag your product photos in, or choose them from your computer. Each one becomes a frame, already in order and already timed.", points: ["Works with the photos you already have", "Add more photos at any time", "Duplicate or delete a frame in one click"] },
  { id: "edit", eyebrow: "Edit", title: "Six things to tap. That’s the whole editor.", description: "Every frame is made of the same simple parts. Tap one on the frame or in the side panel and only its settings appear.", points: ["Photo, headline, subline and logo", "Timing and transition for each frame", "Undo anything, and your work saves as you go"] },
  { id: "text", eyebrow: "Text", title: "Words that look designed.", description: "Size, color and position with simple controls, plus the whole Google Fonts library to search and preview right on your ad.", points: ["Nine-point position grid, no nudging", "Size slider and brand color swatches", "“Same on all frames” keeps every frame consistent"] },
  { id: "brand", eyebrow: "Brand kit", title: "On brand, without thinking about it.", description: "Save your logo, colors and fonts once. Every new ad starts with them in place, so a whole month of reels looks like one campaign.", points: ["Logo placed automatically", "Brand colors in every color picker", "Headline and subline fonts set once"] },
  { id: "motion", eyebrow: "Motion & timing", title: "Smooth by default.", description: "Pick a transition between frames and an animation for your words. Give each frame its own length, then press play to see the real thing.", points: ["Fade, Slide and Zoom transitions", "Rise-up text animation", "Per-frame timing with live playback"] },
  { id: "formats", eyebrow: "Formats", title: "One design, every screen.", description: "Switch between Story, feed and banner layouts while you edit. Your words and logo adapt to each shape, so nothing gets cropped awkwardly.", points: ["9:16 for Reels, Stories and TikTok", "1:1 for feeds", "16:9 for banners and YouTube"] },
  { id: "export", eyebrow: "Export", title: "Ready where it’s going.", description: "Export every format together, as MP4 for ads and social or GIF for email and the web. One click, one download.", points: ["MP4 and GIF", "All three sizes at once", "Sized for Stories, feeds and banners"] },
  { id: "manage", eyebrow: "Manage", title: "Make one. Make fifty.", description: "All your ads live in one place. Found a reel that works? Duplicate it with new photos and keep the words, timing and style, or save it as a template.", points: ["Duplicate with new photos", "Save as template", "Rename, duplicate and tidy up in one menu"] },
] as const;

const allFeatures = [
  ["Create", "Drag-and-drop photos", "Automatic frames & timing", "Add, duplicate, delete frames"],
  ["Edit", "Photo, headline, subline, logo", "Tap-to-select elements", "Undo and auto-save"],
  ["Text", "Google Fonts picker", "Size, color, nine-point position", "Same on all frames"],
  ["Brand", "Brand kit: logo, colors, fonts", "Brand colors in every picker"],
  ["Motion", "Fade, Slide, Zoom transitions", "Rise-up text animation", "Per-frame timing, live playback"],
  ["Formats", "9:16, 1:1, 16:9", "Adaptive layouts"],
  ["Export", "MP4 and GIF", "All sizes in one click"],
  ["Manage", "Your ads library", "Duplicate with new photos", "Save as template"],
];

function FeatureIllustration({ kind }: { kind: string }) {
  switch (kind) {
    case "create": return <div className="features-upload"><div className="features-upload-photos"><span /><span /><span /></div><div className="features-upload-copy"><b>New ad from photos</b><small>Drop photos here, or</small><span>Choose Photos</span></div></div>;
    case "edit": return <div className="features-elements">{[["Photo", "bottle.jpg"], ["Headline", "New season…"], ["Subline", "[Your product…]"], ["Logo", "Top right"], ["Timing", "2.5 seconds"], ["Transition", "Fade"]].map(([label, detail], i) => <div className={`features-element features-element-${i}`} key={label}><i /><b>{label}</b><small>{detail}</small></div>)}</div>;
    case "text": return <div className="features-text-art"><div className="features-position"><small>Position</small><div className="features-position-grid">{Array.from({length:9},(_,i) => <span className={i===6 ? "selected" : ""} key={i} />)}</div><small>Color</small><div className="features-swatches"><i /><i /><i /></div></div><div className="features-font-picker"><small>Search Google Fonts</small><span>Playfair-style serif</span><span>Bold grotesk</span><span>Mono type</span><span>Elegant italic</span></div></div>;
    case "brand": return <div className="features-brand-art"><div className="features-brand-swatches"><b>LOGO</b><i /><i /><i /></div><div className="features-font-cards"><div><b>Aa</b><small>Headline · Bold</small></div><div><b>Aa</b><small>Subline · Regular</small></div></div></div>;
    case "motion": return <div className="features-motion-art"><div className="features-motion-chips"><span>Fade</span><span>Slide</span><span>Zoom</span><span>Rise up</span></div><div className="features-timeline"><span>1 · 3.5s</span><small>Fade</small><span>2 · 1.5s</span><small>Zoom</small><span>3 · 3s</span><i /></div><div className="features-play"><span><Play fill="currentColor" size={15} /></span><b>0:02.4</b> / 0:08</div></div>;
    case "formats": return <div className="features-formats-art">{["9:16", "1:1", "16:9"].map((format,i) => <div className={`features-format features-format-${i}`} key={format}><span><b>New season.<br />New color.</b></span><small>{format}</small></div>)}</div>;
    case "export": return <div className="features-export-art"><b>Export “Spring Launch”</b><div><span>9:16</span><span>1:1</span><span>16:9</span></div><div><span>MP4</span><span>GIF</span></div><div className="features-progress"><i /></div><strong>Export 6 files</strong></div>;
    default: return <div className="features-manage-art"><div className="features-library">{[0,1,2,3].map(i => <div className={`features-library-item features-library-item-${i}`} key={i}><i /><i /><i /></div>)}</div><div className="features-manage-menu"><span>Open</span><span>Duplicate with New Photos…</span><span>Save as Template</span><span>Rename</span></div></div>;
  }
}

function FeaturesPage() {
  return <SiteShell><div className="features-page">
    <section className="features-hero"><span className="site-eyebrow">Features</span><h1>Everything you need.<br /><span>Nothing to learn.</span></h1><p className="site-lede">Gravity Pants does one thing: it turns your photos into video ads. Here’s everything that makes that fast.</p><nav className="features-jumps" aria-label="Jump to feature">{sections.map(section => <a href={`#${section.id}`} key={section.id}>{section.eyebrow === "Brand kit" ? "Brand" : section.eyebrow === "Motion & timing" ? "Motion" : section.eyebrow}</a>)}</nav></section>
    {sections.map((section, i) => <section id={section.id} className={`features-split ${i % 2 ? "features-reverse" : ""}`} key={section.id}><div className="features-split-inner"><div className="features-copy"><span className="site-eyebrow">{section.eyebrow}</span><h2>{section.title}</h2><p>{section.description}</p><ul>{section.points.map(point => <li key={point}><span><Check size={13} strokeWidth={2.5} /></span>{point}</li>)}</ul></div><div className={`site-card features-media features-media-${section.id}`} aria-label={`${section.eyebrow} illustration`}><FeatureIllustration kind={section.id} /></div></div></section>)}
    <section className="features-all"><div className="features-all-inner"><h2>All features</h2><div className="features-all-grid">{allFeatures.map(([title,...items]) => <div key={title}><h3>{title}</h3>{items.map(item => <p key={item}>{item}</p>)}</div>)}</div></div></section>
    <section className="features-closing"><div className="site-card features-closing-inner"><div className="features-closing-copy"><h2>Your next ad is three photos away.</h2><p>Start free and make your first reel in the next few minutes.</p><div><Button asChild variant="site" size="site"><Link to="/signup">Start free <ArrowRight size={18} /></Link></Button><Button asChild variant="siteSecondary" size="site"><Link to="/pricing">See pricing</Link></Button></div></div><div className="features-closing-orbit" aria-hidden="true"><span /></div></div></section>
  </div></SiteShell>;
}
