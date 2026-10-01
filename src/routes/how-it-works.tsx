import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Play } from "lucide-react";
import { SiteShell } from "@/components/site/SiteShell";
import { Button } from "@/components/ui/button";
import { siteHead } from "@/lib/site/seo";

export const Route = createFileRoute("/how-it-works")({
  head: () => siteHead({ path: "/how-it-works", title: "How to Turn Product Photos into a Video Ad — Gravity Pants", description: "Follow the steps from dropping in photos to downloading a finished video ad: create, edit, brand, animate, resize and export." }),
  component: HowItWorksPage,
});

const sections = [
  { id: "create", eyebrow: "Create", title: "Start with the photos you already have.", description: "Drag in your product photos or choose them from your computer. Each photo becomes a frame in the reel.", points: ["Use photos from your phone or camera", "Add more photos at any time", "Duplicate or delete a frame in one click"] },
  { id: "edit", eyebrow: "Edit", title: "Tap the part you want to change.", description: "Choose a photo, headline, logo or transition. The editor shows the controls for that item and hides the rest.", points: ["Photo, headline, subline and logo", "Timing and transition for each frame", "Undo changes, with automatic saving"] },
  { id: "text", eyebrow: "Text", title: "Make the words fit your brand.", description: "Choose the size, color, position and font. You can search Google Fonts and preview each one on your ad.", points: ["Nine fixed positions", "Size slider and brand color swatches", "Apply the same style to every frame"] },
  { id: "brand", eyebrow: "Brand kit", title: "Save your brand once.", description: "Add your logo, colors and fonts to a brand kit. New ads can start with those choices already applied.", points: ["Logo placed automatically", "Brand colors in every color picker", "Headline and subline fonts set once"] },
  { id: "motion", eyebrow: "Motion & timing", title: "Control how the reel moves.", description: "Choose a transition between frames, add movement to photos and words, and set how long each frame stays on screen.", points: ["Fade, Slide and Zoom transitions", "Photo and text movement", "Per-frame timing with live playback"] },
  { id: "formats", eyebrow: "Formats", title: "One design, every screen.", description: "Switch between Story, feed and banner layouts while you edit. Your words and logo adapt to each shape, so nothing gets cropped awkwardly.", points: ["9:16 for Reels, Stories and TikTok", "1:1 for feeds", "16:9 for banners and YouTube"] },
  { id: "export", eyebrow: "Export", title: "Download files that are ready to use.", description: "Export every format together. Choose MP4 for ads and social posts or GIF for email and websites.", points: ["MP4 and GIF", "All three sizes at once", "Sized for Stories, feeds and banners"] },
  { id: "manage", eyebrow: "Manage", title: "Reuse the ads that work.", description: "Keep all your ads in one place. Duplicate one with new photos, keep its words and timing, or save the whole setup as a template.", points: ["Duplicate with new photos", "Save as template", "Rename, duplicate and organize from one menu"] },
] as const;


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

function HowItWorksPage() {
  return <SiteShell><div className="features-page">
    <section className="features-hero"><span className="site-eyebrow">How it works</span><h1>From your photos<br /><span>to a finished reel.</span></h1><p className="site-lede">Here is how Gravity Pants helps you build, edit and export a video ad without learning traditional video software.</p><nav className="features-jumps" aria-label="Jump to step">{sections.map(section => <a href={`#${section.id}`} key={section.id}>{section.eyebrow === "Brand kit" ? "Brand" : section.eyebrow === "Motion & timing" ? "Motion" : section.eyebrow}</a>)}</nav></section>
    {sections.map((section, i) => <section id={section.id} className={`features-split ${i % 2 ? "features-reverse" : ""}`} key={section.id}><div className="features-split-inner"><div className="features-copy"><span className="site-eyebrow">{section.eyebrow}</span><h2>{section.title}</h2><p>{section.description}</p><ul>{section.points.map(point => <li key={point}><span><Check size={13} strokeWidth={2.5} /></span>{point}</li>)}</ul></div><div className={`site-card features-media features-media-${section.id}`} aria-label={`${section.eyebrow} illustration`}><FeatureIllustration kind={section.id} /></div></div></section>)}
    <section className="features-closing"><div className="site-card features-closing-inner"><div className="features-closing-copy"><h2>Try it with three of your own photos.</h2><p>Your first reel starts with a 7-day free trial.</p><div><Button asChild variant="site" size="site"><Link to="/signup">Start free <ArrowRight size={18} /></Link></Button><Button asChild variant="siteSecondary" size="site"><Link to="/features">See all features</Link></Button></div></div><div className="features-closing-orbit" aria-hidden="true"><span /></div></div></section>
  </div></SiteShell>;
}
