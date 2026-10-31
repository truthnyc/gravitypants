import photo1 from "@/assets/site/purl-soho-photo-1.webp.asset.json";
import photo2 from "@/assets/site/purl-soho-photo-2.webp.asset.json";
import photo3 from "@/assets/site/purl-soho-photo-3.webp.asset.json";
import kg1 from "@/assets/site/fine-jewelry-frame-1.webp.asset.json";
import kg2 from "@/assets/site/fine-jewelry-frame-2.webp.asset.json";
import kg3 from "@/assets/site/fine-jewelry-frame-3.webp.asset.json";
import beni1 from "@/assets/site/beni-rug-room.jpg.asset.json";
import beni2 from "@/assets/site/beni-rug-overhead.jpg.asset.json";
import beni3 from "@/assets/site/beni-rug-detail.jpg.asset.json";
import aro1 from "@/assets/site/aro-shoe-1.webp.asset.json";
import aro2 from "@/assets/site/aro-shoe-2.webp.asset.json";
import aro3 from "@/assets/site/aro-shoe-3.webp.asset.json";
import sachajuanShampoo from "@/assets/site/sachajuan-bioshield-shampoo.webp.asset.json";
import sachajuanMist from "@/assets/site/sachajuan-glow-hair-mist.webp.asset.json";
import sachajuanBanner from "@/assets/site/sachajuan-bioshield-banner.png.asset.json";
import annGishDetail from "@/assets/site/ann-gish-pickstitch-detail-1.jpg.asset.json";
import annGishBed from "@/assets/site/ann-gish-pickstitch-lifestyle-1.webp.asset.json";
import annGishSet from "@/assets/site/ann-gish-rib-lifestyle-1.webp.asset.json";
import vosgesBoard from "@/assets/site/vosges-skulls-board.webp.asset.json";
import vosgesIngredients from "@/assets/site/vosges-skulls-ingredients.webp.asset.json";
import vosgesBox from "@/assets/site/vosges-skulls-box.webp.asset.json";
import agnonaCoatScarf from "@/assets/site/agnona-coat-scarf.jpg.asset.json";
import agnonaWhiteCoat from "@/assets/site/agnona-white-coat.jpg.asset.json";
import agnonaSageCoat from "@/assets/site/agnona-sage-coat-hat.jpg.asset.json";
import reschioCanaryBed from "@/assets/site/reschio-canary-bed.webp.asset.json";
import reschioCampaignBed from "@/assets/site/reschio-campaign-bed.webp.asset.json";
import reschioFireGrate from "@/assets/site/reschio-fire-grate.jpg.asset.json";
import filicoriEspresso from "@/assets/site/filicori-espresso-pour.webp.asset.json";
import filicoriLogos from "@/assets/site/filicori-vintage-logos.webp.asset.json";
import filicoriRoasted from "@/assets/site/filicori-roasted-beans.webp.asset.json";
import mfkTriptych from "@/assets/site/mfk-triptych.webp.asset.json";
import mfkEdp from "@/assets/site/mfk-edp.jpg.asset.json";
import mfkCoffret from "@/assets/site/mfk-coffret.jpg.asset.json";
import frenchBloomPour from "@/assets/site/french-bloom-01.jpg.asset.json";
import frenchBloomRose from "@/assets/site/french-bloom-03.jpg.asset.json";
import frenchBloomIce from "@/assets/site/french-bloom-06.jpg.asset.json";

/** Website reel IDs (site_reels) used as examples on the search pages. */
export const REEL = {
  purl: "c875b9a8-a2e9-4553-86aa-765fc349705d",
  beni: "f575acf3-fc9a-4f44-9b0b-9db52a62dfe3",
  katherine: "15d44e2e-96ba-4855-9fd0-1de72debd4b3",
  aro: "625bd361-cb80-4586-ada8-5a3881ec9b99",
  sachajuan: "0de82f06-9ca0-4a59-a721-7944f0073245",
  annGish: "eb965e36-b7c2-46ef-a0a2-750df4de811f",
  vosges: "a48632eb-71f8-4ebd-b47b-0efad82f235b",
  agnona: "daadae8a-d251-4088-ba92-febb654f88e9",
  reschio: "17c0717e-73e3-4f7b-872b-a0a222023377",
  filicori: "4ff544bb-e181-46cf-af57-f720a00e4fc1",
  meaume: "2622b7db-614a-405f-a1da-79276bbe2de2",
  mfk: "afb7a588-8a41-44d6-9bef-c09be883b3dd",
  frenchBloom: "d5e802e6-8f19-4db3-b2bf-cb056498c863",
} as const;

/** Source photos are only listed where the reel's real originals exist on the site. */
const SOURCE_PHOTOS: Record<string, { src: string; alt: string }[]> = {
  [REEL.purl]: [
    { src: photo1.url, alt: "Purl Soho Japanese Denim Cotton yarn product photo" },
    { src: photo2.url, alt: "Purl Soho knitted denim cotton sweater photo" },
    { src: photo3.url, alt: "Purl Soho denim cotton yarn skeins photo" },
  ],
  [REEL.katherine]: [
    { src: kg1.url, alt: "Katherine Grover Fine Jewelry photo 1" },
    { src: kg2.url, alt: "Katherine Grover Fine Jewelry photo 2" },
    { src: kg3.url, alt: "Katherine Grover Fine Jewelry photo 3" },
  ],
  [REEL.beni]: [
    { src: beni1.url, alt: "Beni Rugs red rug with green paisley motif in a sitting room with checkered floor" },
    { src: beni2.url, alt: "Beni Rugs red rug with green paisley motif seen from above" },
    { src: beni3.url, alt: "Beni Rugs red rug corner detail with dark woven squares on a checkered floor" },
  ],
  [REEL.aro]: [
    { src: aro1.url, alt: "Aro Shoes red sneaker with pink overlays product photo" },
    { src: aro2.url, alt: "Aro Shoes mustard yellow suede and mesh sneaker product photo" },
    { src: aro3.url, alt: "Aro Shoes lavender mesh sneaker product photo" },
  ],
  [REEL.sachajuan]: [
    { src: sachajuanShampoo.url, alt: "Sachajuan Bioshield Shampoo 200 ml product photo" },
    { src: sachajuanMist.url, alt: "Sachajuan Glow Hair Mist 150 ml product photo" },
    { src: sachajuanBanner.url, alt: "Sachajuan Bioshield shampoo bottle on a red background" },
  ],
  [REEL.annGish]: [
    { src: annGishDetail.url, alt: "Ann Gish Pickstitch bone coverlet detail with dark running stitches" },
    { src: annGishBed.url, alt: "Ann Gish bed styled with pickstitch bone coverlet and rib slate shams" },
    { src: annGishSet.url, alt: "Ann Gish Rib Slate and Pickstitch Bone bed set in a styled bedroom" },
  ],
  [REEL.vosges]: [
    { src: vosgesBoard.url, alt: "Vosges chocolate skulls on a wood serving board with cherries and prosciutto" },
    { src: vosgesIngredients.url, alt: "Vosges chocolate skulls with cinnamon, cloves, nutmeg and crispy rice" },
    { src: vosgesBox.url, alt: "Vosges Crispy Rice Chocolate Skulls box with three chocolate skulls" },
  ],
  [REEL.agnona]: [
    { src: agnonaCoatScarf.url, alt: "Agnona dark wool coat with fringed scarf, sunglasses and leather gloves" },
    { src: agnonaWhiteCoat.url, alt: "Agnona white wool coat from behind on a dark background" },
    { src: agnonaSageCoat.url, alt: "Agnona sage coat with draped collar, wide-brim hat and leather gloves" },
  ],
  [REEL.reschio]: [
    { src: reschioCanaryBed.url, alt: "Reschio Canary Bed in yellow with a metal canopy frame" },
    { src: reschioCampaignBed.url, alt: "Reschio Campaign Bed, a black four-poster with brass details" },
    { src: reschioFireGrate.url, alt: "Reschio kitchen fire grate in a stone fireplace with candles and logs" },
  ],
  [REEL.filicori]: [
    { src: filicoriRoasted.url, alt: "Filicori Zecchini roasted coffee beans in the cooling drum" },
    { src: filicoriLogos.url, alt: "Filicori Zecchini vintage logo sheet with an espresso cup and coffee beans" },
    { src: filicoriEspresso.url, alt: "Espresso pouring into Filicori Zecchini branded cups" },
  ],
  [REEL.mfk]: [
    { src: mfkTriptych.url, alt: "Maison Francis Kurkdjian Baccarat Rouge 540 extrait de parfum bottles on red" },
    { src: mfkEdp.url, alt: "Maison Francis Kurkdjian Baccarat Rouge 540 eau de parfum bottle on red and gold" },
    { src: mfkCoffret.url, alt: "Maison Francis Kurkdjian Baccarat Rouge 540 travel set coffret" },
  ],
  [REEL.frenchBloom]: [
    { src: frenchBloomPour.url, alt: "French Bloom sparkling rosé poured by the sea with cheese and raspberries" },
    { src: frenchBloomRose.url, alt: "French Bloom Le Rosé alcohol-free sparkling bottle" },
    { src: frenchBloomIce.url, alt: "French Bloom bottles chilling on ice" },
  ],
};
export const sourcePhotos = (reelId: string) => SOURCE_PHOTOS[reelId] ?? [];

export type Faq = { q: string; a: string };
export type SearchPage = {
  slug: string;
  path: string;
  title: string;
  description: string;
  h1: string;
  subhead: string;
  example: { reelId: string; label: string };
  why: string[];
  section: { title: string; items: string[]; ordered?: boolean } | { title: string; grid: string[] };
  faqs: Faq[];
  related: string[];
};

const STEPS = ["Add your photos", "Add your words and brand", "Download every size"];
export const SEARCH_STEPS = STEPS;

const PHOTO_FAQS: Faq[] = [
  { q: "How many photos do I need?", a: "Three is enough. You can use up to eight." },
  { q: "Do I need editing skills?", a: "No. You tap a photo, headline or logo to change it." },
  { q: "What do I get?", a: "An MP4 or GIF in every size: 9:16, 4:5, 1:1, 5:4, 16:9 and custom." },
  { q: "Is it free?", a: "Your first video is free, with no watermark and no card." },
];

const industry = (slug: string, name: string, title: string, description: string, grid: string[], why: string[]): SearchPage => ({
  slug: `for-${slug}`,
  path: `/for/${slug}`,
  title,
  description,
  h1: `Video ads for ${name} brands`,
  subhead: `Turn your ${name} photos into short video ads and Reels, with your words and brand, in every size.`,
  example: { reelId: grid[0] ?? "", label: "" },
  why,
  section: { title: "Made with Gravity Pants", grid },
  faqs: PHOTO_FAQS,
  related: ["/photo-to-video", "/instagram-reels-from-photos", "/video-ads-for-small-business"],
});

export const SEARCH_PAGES: SearchPage[] = [
  {
    slug: "photo-to-video", path: "/photo-to-video",
    title: "Turn Photos Into a Video Ad in Minutes | Gravity Pants",
    description: "Add a few photos and get a short video with your words, logo and colors, sized for Reels, TikTok and ads. Your first video is free.",
    h1: "Turn your photos into a video",
    subhead: "Add a few photos, type a headline, and get a finished video with your logo and colors. No editing.",
    example: { reelId: REEL.purl, label: "Purl Soho, Launch Kit (3 photos → 7.8 sec reel)" },
    why: [
      "People scroll past still photos. A few seconds of movement makes them stop, and a stop is the start of every sale.",
      "You don't need a shoot or an editor. The photos you already took for your website or catalog are enough. Gravity Pants adds the movement, your words and your brand, so the video looks like it came from your team.",
    ],
    section: { title: "What photos work best", items: [
      "3 to 8 photos. Three is plenty for a first video.",
      "Start with the product alone, then the product in use, then a detail or the offer.",
      "Leave some space around the product. Your headline and logo sit there.",
      "Phone photos are fine.",
    ] },
    faqs: PHOTO_FAQS,
    related: ["/instagram-reels-from-photos", "/product-video-maker", "/blog/how-to-turn-photos-into-a-video"],
  },
  {
    slug: "product-video-maker", path: "/product-video-maker",
    title: "Product Video Maker for Online Stores | Gravity Pants",
    description: "Make product videos from the photos you already have. Short, on-brand videos for your store, social and ads, in every size. First one free.",
    h1: "Product videos from the photos you already have",
    subhead: "Short, on-brand product videos for your store, your social and your ads. No shoot, no editor.",
    example: { reelId: REEL.beni, label: "Beni Rugs, The Chelsea Collection" },
    why: [
      "Shoppers can't touch your product online. A short video does the next best thing: it shows the shape, the texture and how it looks in a real room or on a real person.",
      "Product pages with video hold attention longer, and ads with movement get more clicks than still images. You already have the photos. Gravity Pants turns them into the video.",
    ],
    section: { title: "Where to use your product video", items: [
      "Your product page, next to the photos",
      "Instagram and Facebook feed (4:5 or 1:1)",
      "Reels, Stories and TikTok (9:16)",
      "Ads on Meta and Google (every size)",
      "Email, as a GIF that plays in the inbox",
    ] },
    faqs: [
      { q: "Can I make a video for every product?", a: "Yes. Make one you like, then duplicate it and swap in new photos." },
      { q: "Will it match my brand?", a: "Save your logo, colors and fonts once. Every new video starts on brand." },
      { q: "Do I own the videos?", a: "Yes. They're yours to use anywhere." },
      { q: "Does it work with Shopify?", a: "Yes. Connect your store and make reels straight from your product photos." },
    ],
    related: ["/shopify-product-videos", "/video-ads-for-small-business", "/photo-to-video"],
  },
  {
    slug: "instagram-reels-from-photos", path: "/instagram-reels-from-photos",
    title: "Make Instagram Reels From Photos | Gravity Pants",
    description: "Turn a few photos into an Instagram Reel with your words, logo and colors. Ready-sized 9:16 for Reels and Stories. Your first reel is free.",
    h1: "Make an Instagram Reel from your photos",
    subhead: "A few photos in, a branded 9:16 Reel out. Also sized for your feed and Stories.",
    example: { reelId: REEL.katherine, label: "Katherine Grover Fine Jewelry, Gift Guide (8 sec reel)" },
    why: [
      "Instagram shows Reels to people who don't follow you yet. That makes a Reel one of the cheapest ways for a small brand to be seen by new customers.",
      "The hard part is making them often enough. With Gravity Pants, a Reel takes a few minutes, so you can post one every week from photos you already have.",
    ],
    section: { title: "Sizes for Instagram", items: [
      "Reels and Stories: Vertical 9:16",
      "Feed post: Portrait 4:5 or Square 1:1",
      "Ads: all of the above, from the same edit",
      "Tip: keep your headline away from the very bottom of a 9:16 Reel, where Instagram puts captions and buttons.",
    ] },
    faqs: [
      { q: "How long should a Reel be?", a: "For a product, 6 to 15 seconds is usually best. You set how long each photo stays on screen." },
      { q: "Can I add music?", a: "Add music in Instagram when you post, so you can use its licensed tracks." },
      { q: "Can I post the same video to TikTok?", a: "Yes. The 9:16 version works for Reels, Stories, TikTok and YouTube Shorts." },
      { q: "Is it free?", a: "Your first reel is free, with no watermark." },
    ],
    related: ["/tiktok-video-from-photos", "/photo-to-video", "/for/jewelry"],
  },
  {
    slug: "tiktok-video-from-photos", path: "/tiktok-video-from-photos",
    title: "Make TikTok Videos From Photos | Gravity Pants",
    description: "Turn product photos into a vertical TikTok video with your words and brand. Also sized for Reels and Shorts. Your first video is free.",
    h1: "Turn photos into a TikTok video",
    subhead: "Vertical 9:16 videos with your words and brand, ready for TikTok, Reels and Shorts.",
    example: { reelId: REEL.aro, label: "Aro Shoes, Escape the Ordinary" },
    why: [
      "TikTok shoppers decide in the first second whether to keep watching. Movement and a short, clear line of text give your product that second.",
      "You don't need to be on camera. Clean product photos with a strong headline work well for brand posts and for TikTok ads.",
    ],
    section: { title: "Three openings that work", items: [
      "The product, close up, with \"New in\" or \"Back in stock\"",
      "A problem in one line, then the product as the answer",
      "The offer first: \"20% off this week\"",
    ] },
    faqs: [
      { q: "Do I need to film anything?", a: "No. It starts from photos." },
      { q: "What size is a TikTok video?", a: "Vertical 9:16. Gravity Pants exports it, plus every other size." },
      { q: "Can I add sound?", a: "Add a sound in TikTok when you post." },
      { q: "Is it free?", a: "Your first video is free, with no watermark." },
    ],
    related: ["/instagram-reels-from-photos", "/video-ads-for-small-business", "/photo-to-video"],
  },
  {
    slug: "shopify-product-videos", path: "/shopify-product-videos",
    title: "Shopify Product Videos From Your Photos | Gravity Pants",
    description: "Connect your Shopify store and turn product photos into short, on-brand videos for your product pages, social and ads. First one free.",
    h1: "Product videos for your Shopify store",
    subhead: "Connect your store, pick a product, and get a short video made from its photos.",
    example: { reelId: REEL.sachajuan, label: "Sachajuan, Bundle Offer" },
    why: [
      "Most Shopify stores show only still photos. A short video on the product page and in your ads helps you stand out from stores selling something similar.",
      "Because Gravity Pants connects to Shopify, you don't even have to download your photos first. Pick a product and its photos are ready to use.",
    ],
    section: { title: "How it works with Shopify", ordered: true, items: [
      "Connect your Shopify store.",
      "Pick the products you want videos for.",
      "Add your headline and brand, then download every size.",
      "Add the video to your product page in Shopify, and post the other sizes to social and ads.",
    ] },
    faqs: [
      { q: "Can I use the photos already in my store?", a: "Yes. Connect your store and pick a product." },
      { q: "Where does the video go in Shopify?", a: "Upload the MP4 to the product's media, next to the photos." },
      { q: "Can I make videos for many products?", a: "Yes. Duplicate a video and swap in new photos." },
      { q: "Is it free to try?", a: "Your first reel is free, with no watermark and no card." },
    ],
    related: ["/product-video-maker", "/etsy-listing-videos", "/video-ads-for-small-business"],
  },
  {
    slug: "etsy-listing-videos", path: "/etsy-listing-videos",
    title: "Make Etsy Listing Videos From Your Photos | Gravity Pants",
    description: "Turn your Etsy product photos into a short listing video in minutes. No filming, no editing. Your first video is free.",
    h1: "Make an Etsy listing video from your photos",
    subhead: "A short video for your listing, made from the photos you already took.",
    example: { reelId: REEL.annGish, label: "Ann Gish, Pitchstitch Bed Set" },
    why: [
      "On Etsy, buyers compare similar items side by side. A listing with a video shows more of your work and feels more trustworthy than one with photos alone.",
      "Most sellers skip video because filming takes time. With Gravity Pants you start from your listing photos, so a video takes a few minutes.",
    ],
    section: { title: "Tips for Etsy videos", items: [
      "Keep it short. Etsy listing videos play without sound and run 5 to 15 seconds.",
      "Show the item from a few angles, then a detail.",
      "Use the Square 1:1 or Portrait 4:5 size.",
      "Post the 9:16 version to Instagram and Pinterest to bring people to your shop.",
    ] },
    faqs: [
      { q: "Does it connect to Etsy?", a: "Not directly. Download the video and upload it to your listing." },
      { q: "Does it need sound?", a: "No. Etsy plays listing videos without sound, so your words do the work." },
      { q: "Can I make one for every listing?", a: "Yes. Duplicate a video and swap in new photos." },
      { q: "Is it free?", a: "Your first video is free, with no watermark." },
    ],
    related: ["/product-video-maker", "/for/home-decor", "/photo-to-video"],
  },
  {
    slug: "gif-for-email", path: "/gif-for-email",
    title: "Animated Product GIFs for Email | Gravity Pants",
    description: "Turn product photos into an animated GIF that plays in the inbox. Small files, your brand, every size. Your first one is free.",
    h1: "Animated GIFs for your emails",
    subhead: "Turn product photos into a GIF that plays right in the inbox.",
    example: { reelId: REEL.vosges, label: "Vosges Haut-Chocolat, Campaign Promo" },
    why: [
      "Most email apps don't play video, but they do play GIFs. A little movement at the top of an email draws the eye to your product and your button.",
      "Gravity Pants exports a GIF from the same edit as your video, so your email matches your social posts and ads.",
    ],
    section: { title: "GIF tips", items: [
      "Use the Wide 5:4 or Square 1:1 size for email.",
      "Keep it to 3 or 4 photos so the file stays small.",
      "Put the most important photo first. Some email apps (like older Outlook) only show the first frame.",
      "Link the GIF to the same page as your button.",
    ] },
    faqs: [
      { q: "Will the GIF be too big for email?", a: "Gravity Pants makes smaller GIFs by default. Fewer photos make it smaller still." },
      { q: "Does it work in Gmail and Apple Mail?", a: "Yes. Both play GIFs." },
      { q: "Can I use the GIF on my website too?", a: "Yes." },
      { q: "Is it free?", a: "Your first export is free, with no watermark." },
    ],
    related: ["/product-video-maker", "/video-ads-for-small-business", "/for/food-and-drink"],
  },
  {
    slug: "video-ads-for-small-business", path: "/video-ads-for-small-business",
    title: "Video Ads for Small Businesses | Gravity Pants",
    description: "Make video ads from your product photos, sized for Instagram, Facebook, TikTok and Google. No agency, no editor. Your first ad is free.",
    h1: "Video ads for small businesses",
    subhead: "Make video ads from your product photos, in every size, without an agency or an editor.",
    example: { reelId: REEL.agnona, label: "Agnona, Seasonal Sale" },
    why: [
      "Ads with movement usually get more attention than still images, but a filmed ad can cost more than a small brand spends on ads all month.",
      "Gravity Pants gives you the same short, branded video ads from photos you already have. Make a few versions, see which one people click, and make more like it.",
    ],
    section: { title: "Test more, spend less", items: [
      "Make 3 versions with different first photos or headlines.",
      "Run them side by side with a small budget.",
      "Keep the one that gets the most clicks, then duplicate it with new photos.",
    ] },
    faqs: [
      { q: "Which sizes do ads need?", a: "Meta uses 9:16, 4:5 and 1:1. Google and websites use 16:9 and 5:4. You get them all from one edit." },
      { q: "How much does it cost?", a: "Your first ad is free. Plans start at $35 a month for 10 ads." },
      { q: "Do I need a designer?", a: "No. Save your brand kit once and every ad starts on brand." },
    ],
    related: ["/tiktok-video-from-photos", "/instagram-reels-from-photos", "/shopify-product-videos"],
  },
  industry("jewelry", "jewelry", "Jewelry Video Ads From Your Photos | Gravity Pants",
    "Turn jewelry photos into short video ads and Reels that show the sparkle. Your words, your brand, every size. First one free.",
    [REEL.katherine],
    ["Jewelry is small on a phone screen. Close-ups that move slowly show the detail and light that a still photo misses. Use a close-up, then the piece being worn, then a gift line (\"Ready to gift\")."]),
  industry("home-decor", "home decor", "Home Decor Video Ads From Your Photos | Gravity Pants",
    "Turn photos of rugs, bedding and homeware into short video ads that show texture and scale. Every size. First one free.",
    [REEL.reschio, REEL.beni, REEL.annGish],
    ["Buyers want to see how a piece looks in a real room. Start with the room, then a close-up of the texture, then the piece on its own."]),
  industry("fashion", "fashion", "Fashion Video Ads From Your Photos | Gravity Pants",
    "Turn lookbook and product photos into short video ads for new collections and sales. Your brand, every size. First one free.",
    [REEL.agnona, REEL.aro, REEL.purl],
    ["Collections change every season and there's never time to film them all. Turn each new lookbook into Reels and ads the same week it lands."]),
  industry("food-and-drink", "food and drink", "Food and Drink Video Ads From Your Photos | Gravity Pants",
    "Turn photos of chocolate, coffee and wine into short video ads and email GIFs. Your brand, every size. First one free.",
    [REEL.frenchBloom, REEL.filicori, REEL.vosges],
    ["Food sells on appetite. Movement makes a close-up feel fresh. Lead with the close-up, then the setting, then the offer or the occasion."]),
  industry("beauty-and-fragrance", "beauty and fragrance", "Beauty and Fragrance Video Ads From Photos | Gravity Pants",
    "Turn product photos of skincare, hair care and fragrance into short, polished video ads. Your brand, every size. First one free.",
    [REEL.mfk, REEL.sachajuan],
    ["Beauty buyers respond to mood and ritual. Slow movement and short lines give a bottle on a plain background a feeling."]),
];

export const searchPage = (path: string) => SEARCH_PAGES.find((p) => p.path === path)!;

/** Short footer labels for the "Made for" column. */
export const MADE_FOR_LINKS: { label: string; to: string }[] = [
  { label: "Photo to video", to: "/photo-to-video" },
  { label: "Product video maker", to: "/product-video-maker" },
  { label: "Instagram Reels", to: "/instagram-reels-from-photos" },
  { label: "TikTok videos", to: "/tiktok-video-from-photos" },
  { label: "Shopify product videos", to: "/shopify-product-videos" },
  { label: "Etsy listing videos", to: "/etsy-listing-videos" },
  { label: "GIFs for email", to: "/gif-for-email" },
  { label: "Small business ads", to: "/video-ads-for-small-business" },
  { label: "Jewelry", to: "/for/jewelry" },
  { label: "Home decor", to: "/for/home-decor" },
  { label: "Fashion", to: "/for/fashion" },
  { label: "Food and drink", to: "/for/food-and-drink" },
  { label: "Beauty and fragrance", to: "/for/beauty-and-fragrance" },
];
