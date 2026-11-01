import type { BlogPost } from "./blog";
import aro from "@/assets/site/aro-shoe-1.webp.asset.json";
import drusus from "@/assets/site/drusus-tabor-grand-turk-pair.webp.asset.json";
import sachajuan from "@/assets/site/sachajuan-bioshield-shampoo.webp.asset.json";
import annGish from "@/assets/site/ann-gish-pickstitch-lifestyle-1.webp.asset.json";
import vosges from "@/assets/site/vosges-skulls-board.webp.asset.json";
import reschio from "@/assets/site/reschio-canary-bed.webp.asset.json";
import filicori from "@/assets/site/filicori-espresso-pour.webp.asset.json";

const DATE = "November 1, 2026";

/** How-to articles, one per landing-page cluster. Each links to its page through `pages`. */
export const GUIDES: BlogPost[] = [
  {
    slug: "how-to-make-an-etsy-listing-video-from-photos",
    title: "How to make an Etsy listing video from photos",
    seoTitle: "How to Make an Etsy Listing Video From Photos",
    dek: "Etsy lets every listing carry a short video. You can make one from the listing photos you already have.",
    date: DATE, minutes: 4, tag: "How to", cover: annGish.url, pages: ["/etsy-listing-videos"],
    body: [
      { p: [
        "A listing video plays right in the photo area of your Etsy listing, so shoppers see the item move before they read a word. Most sellers skip it because they think they need to film something. You don't.",
      ] },
      { h: "1. Use three listing photos", p: [
        "Pick a wide photo of the whole item, a detail that shows how it is made and a close-up of the texture or finish. Handmade work sells on detail, so the middle photo matters most.",
      ] },
      { h: "2. Keep it short and silent", p: [
        "Etsy listing videos are short, between 5 and 15 seconds, and they play without sound. Put any words you need on the video itself: the item name and one line about what makes it yours.",
      ] },
      { h: "3. Choose a shape that fits the listing", p: [
        "Square 1:1 and portrait 4:5 both sit well in the listing photo area. If you also sell on Instagram, export a Vertical 9:16 copy from the same ad at the same time.",
      ] },
      { h: "4. Download the MP4 and upload it to the listing", p: [
        "Export the MP4, open the listing in Etsy, and add the file in the video slot under Photos. You add the file yourself; Gravity Pants does not connect to your Etsy shop.",
      ] },
    ],
  },
  {
    slug: "how-to-make-shopify-product-videos-from-photos",
    title: "How to make Shopify product videos from the photos you already have",
    seoTitle: "How to Make Shopify Product Videos From Photos",
    dek: "Shopify product pages can show video next to your photos. Here is how to make one without filming.",
    date: DATE, minutes: 4, tag: "How to", cover: sachajuan.url, pages: ["/shopify-product-videos"],
    body: [
      { p: [
        "A product video shows how something looks in a way a still photo can't: the shine on a bottle, the drape of a scarf, the size of a bag in a hand. Your product photos are enough to make one.",
      ] },
      { h: "1. Start with your product page photos", p: [
        "Use the same photos customers already see, so the video feels like part of the page. Three is enough: the product on its own, a detail and the product in use.",
      ] },
      { h: "2. Pick the size of your product images", p: [
        "Match the shape of the photos on your product page. Most themes use square 1:1 or portrait 4:5. A matching video sits in the gallery without awkward bars.",
      ] },
      { h: "3. Add the product name and one line", p: [
        "Keep the words short. The product name and one reason to buy it is plenty; the price and the button are already on the page.",
      ] },
      { h: "4. Add the MP4 to the product", p: [
        "Export the MP4, open the product in your Shopify admin and add the file under Media. Drag it to the position you want in the gallery. Use the same ad to export a vertical copy for social posts that point back to the product.",
      ] },
    ],
  },
  {
    slug: "how-to-make-instagram-reels-from-photos",
    title: "How to make Instagram Reels from photos (no filming)",
    seoTitle: "How to Make Instagram Reels From Photos",
    dek: "Reels don't have to be filmed. A few good photos, the right size and short words make a Reel people stop for.",
    date: DATE, minutes: 4, tag: "How to", cover: drusus.url, pages: ["/instagram-reels-from-photos"],
    body: [
      { p: [
        "Instagram shows Reels to people who don't follow you yet, which makes them one of the best places for a small brand to be seen. You can make one from photos.",
      ] },
      { h: "1. Choose Vertical 9:16", p: [
        "Reels fill the phone screen at 9:16. Choose that size before you start, so your photos and words are placed for it from the beginning.",
      ] },
      { h: "2. Keep words away from the edges", p: [
        "Instagram puts your caption, account name and buttons over the bottom and right of a Reel. Keep your headline in the middle of the frame. The Gravity Pants editor shows these areas when you preview a 9:16 ad.",
      ] },
      { h: "3. Lead with your best photo", p: [
        "The first second decides whether someone keeps watching. Open on the photo that is most surprising or most beautiful, and end on your logo and what you want people to do.",
      ] },
      { h: "4. Download the MP4 and post it yourself", p: [
        "Export the MP4 and save it to your phone. In Instagram, create a Reel, pick the video from your gallery, add a caption and share it. Gravity Pants does not post to Instagram for you.",
      ] },
    ],
  },
  {
    slug: "how-to-make-a-tiktok-video-from-photos",
    title: "How to make a TikTok video from photos",
    seoTitle: "How to Make a TikTok Video From Photos",
    dek: "No filming, no dancing. Here is how to turn product photos into a TikTok video that looks made for the feed.",
    date: DATE, minutes: 3, tag: "How to", cover: aro.url, pages: ["/tiktok-video-from-photos"],
    body: [
      { p: [
        "TikTok is a video feed, but plenty of brands do well there with simple, well-made product videos. Photos you already have can be the whole thing.",
      ] },
      { h: "1. Use Vertical 9:16", p: [
        "TikTok is full screen on a phone. Choose 9:16 so nothing is cropped or framed with bars.",
      ] },
      { h: "2. Move fast at the start", p: [
        "Open on a strong close-up and keep each photo on screen briefly. Put one short line on screen early so people know what they are looking at.",
      ] },
      { h: "3. Leave room for TikTok's buttons", p: [
        "Like Reels, TikTok places buttons and captions over the right side and bottom of the video. Keep your words and logo in the middle.",
      ] },
      { h: "4. Download and upload", p: [
        "Export the MP4, save it to your phone and upload it in TikTok, where you can add sound and a caption. The same ad also exports for Instagram Reels and Stories.",
      ] },
    ],
  },
  {
    slug: "how-to-make-an-animated-gif-for-email",
    title: "How to make an animated GIF for your email newsletter",
    seoTitle: "How to Make an Animated GIF for Email",
    dek: "Most email apps can't play video, but they play GIFs. Here is how to make one from your product photos.",
    date: DATE, minutes: 4, tag: "How to", cover: vosges.url, pages: ["/gif-for-email"],
    body: [
      { p: [
        "An animated GIF is the simplest way to put movement in an email. It plays in most email apps without a play button, and it can be made from the same photos as your social ads.",
      ] },
      { h: "1. Choose a shape that fits the email", p: [
        "Emails are read in a narrow column, so square 1:1 or Wide 5:4 usually fit best. Choose the size first.",
      ] },
      { h: "2. Keep it small", p: [
        "Large GIFs load slowly and some email tools limit file size. Use fewer photos, a shorter reel and a smaller export size. The Export screen shows an estimated file size before you download.",
      ] },
      { h: "3. Make the first frame work on its own", p: [
        "Some email apps show only the first frame of a GIF. Put your product and headline in that first frame, so the email still makes sense if the animation never plays.",
      ] },
      { h: "4. Add it like any other image", p: [
        "Export the GIF and add it to your email as an image, then link it to the product or page you want people to visit.",
      ] },
    ],
  },
  {
    slug: "how-to-make-html5-display-ads-from-photos",
    title: "How to make HTML5 display ads from photos",
    seoTitle: "How to Make HTML5 Display Ads From Photos",
    dek: "Ad networks ask for HTML5 banners in fixed sizes. Here is how to make them from photos, with no code.",
    date: DATE, minutes: 4, tag: "How to", pages: ["/html5-ads"],
    body: [
      { p: [
        "HTML5 ads are the moving banners you see on websites. Ad platforms ask for them as a ZIP file in exact sizes. You can make them from the same photos and words as your social ads.",
      ] },
      { h: "1. Make the ad first", p: [
        "Build the ad as usual with your photos, words and brand kit. Then open Export and choose HTML5.",
      ] },
      { h: "2. Pick the sizes the platform asks for", p: [
        "Choose the banner sizes your ad platform lists, or use Custom size to type any width and height. Each size downloads as its own ZIP.",
      ] },
      { h: "3. Add the click-through link", p: [
        "Type the page you want people to land on. It is written into the ad as a click tag, the standard way ad platforms read where a click should go.",
      ] },
      { h: "4. Check the file size, then upload", p: [
        "Many networks set a small size limit for HTML5 ads. Fewer photos and smaller sizes keep the ZIP light. Upload each ZIP to your ad platform as an HTML5 creative.",
      ] },
    ],
  },
  {
    slug: "what-to-photograph-for-a-video-ad-by-category",
    title: "What to photograph for a video ad, by what you sell",
    seoTitle: "What to Photograph for a Video Ad, by Category",
    dek: "Jewelry, home decor, fashion, food and beauty each sell on different details. Here is what to shoot for each.",
    date: DATE, minutes: 5, tag: "Craft", cover: reschio.url,
    pages: ["/for/jewelry", "/for/home-decor", "/for/fashion", "/for/food-and-drink", "/for/beauty-and-fragrance"],
    body: [
      { p: [
        "The three-photo rule — a wide, a detail and a close-up — works for almost anything. What changes is what each photo should show.",
      ] },
      { h: "Jewelry", p: [
        "Show the piece worn, then on its own, then the setting or the clasp up close. Shine reads better on a plain, dark or soft background.",
      ] },
      { h: "Home decor", p: [
        "Start with the whole room so people can picture the piece at home, then move to the material: the weave of a rug, the grain of wood, the stitch on a cushion.",
      ] },
      { h: "Fashion", p: [
        "Lead with the full look on a person, then fabric and fit. A close-up of the texture often does more than a second full-length shot.",
      ] },
      { h: "Food and drink", p: [
        "Food sells on appetite. Open with the close-up, the pour or the bite, then the setting, then the bottle, box or offer.",
      ] },
      { h: "Beauty and fragrance", p: [
        "A bottle on a plain background is a good start. Add a texture or an ingredient and one photo of the ritual, so the reel carries a feeling, not just a product.",
      ] },
    ],
  },
];

export { filicori as _unusedFilicori };
