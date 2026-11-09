/** Search intent and factual metadata for the 37 public Gravity Pants sitemap pages. */
export type PageMetadata = {
  title: string;
  description: string;
  type: "WebPage" | "CollectionPage" | "AboutPage" | "ContactPage";
};

const page = (title: string, description: string, type: PageMetadata["type"] = "WebPage"): PageMetadata => ({
  title: `${title} | Gravity Pants`, description, type,
});

export const PAGE_METADATA: Record<string, PageMetadata> = {
  "/": page("Product Video Maker from Photos", "Turn product photos into branded video ads, Instagram Reels and animated GIFs. Add your words, logo and motion. Try Gravity Pants without a card."),
  "/how-it-works": page("How to Make Video Ads from Photos", "Choose photos, add your headline and brand, preview the motion and download your video ad. See the Gravity Pants photo-to-video process step by step."),
  "/features": page("Video Ad Maker Features and Export Sizes", "Create branded product reels with photo motion, text, logos and saved brand kits. Export MP4 and GIF in five shapes, with HTML5 on Business and Team."),
  "/examples": page("Product Video Ad Examples and Styles", "Explore product video ads made from photos across fashion, jewellery, beauty, food and home decor. Compare reel styles and find ideas for your brand.", "CollectionPage"),
  "/showcase": page("Brand Reels and Product Video Showcase", "Watch branded product reels made with Gravity Pants, including fashion, homeware and beauty examples. See how still photos become short video ads.", "CollectionPage"),
  "/contact": page("Commission a Product Reel", "Tell Gravity Pants about your brand, products and the reel you want to make. Send a commission enquiry for a short video ad built from your photos.", "ContactPage"),
  "/pricing": page("Video Ad Maker Pricing and Plans", "Compare Free, Starter, Simple, Business and Team video ad plans. Make MP4s and GIFs, with HTML5 on Business and Team. Free trial requires no card."),
  "/about": page("About the Photo-to-Video Ad Maker", "Gravity Pants turns still product photos into short branded video ads and GIFs. Learn about the photo-first editor, brand kits and export formats.", "AboutPage"),
  "/blog": page("Product Video Tips and Photo-to-Reel Guides", "Read practical guides to making product videos, Instagram Reels, TikTok videos, email GIFs and HTML5 ads from photos, with ideas for different brands.", "CollectionPage"),
  "/help": page("Help with Product Reels and Video Exports", "Find help with photos, brand kits, text, motion and export settings in Gravity Pants. Learn which sizes and file formats suit social posts and email."),
  "/referrals": page("Give a Reel, Get a Reel — Referral Program", "Share your Gravity Pants referral link. When a friend signs up and exports their first reel, earn one free export with no watermark. Learn how it works."),
  "/photo-to-video": page("Image to Video Ads: Photo to Video for Products", "Turn product images into a short branded video ad with your headline, logo and motion. Export an MP4 or GIF for social, email and websites. No filming needed."),
  "/product-video-maker": page("Product Video Maker for Online Stores", "Make product videos from existing photos for your online store, social posts and ads. Show product details with motion, text and your saved brand kit."),
  "/instagram-reels-from-photos": page("Instagram Reels from Product Photos", "Make a branded Instagram Reel from product photos in Vertical 9:16. Add text and your logo, download the MP4 and post it yourself in Instagram."),
  "/tiktok-video-from-photos": page("TikTok Video Maker from Product Photos", "Turn product photos into Vertical 9:16 TikTok videos with text, motion and your brand. Download the MP4, then add sound and publish it in TikTok."),
  "/shopify-product-videos": page("Shopify Product Videos from Photos", "Use your Shopify product photos to make branded videos for product galleries and social posts. Choose your photos, add words and export your MP4."),
  "/etsy-listing-videos": page("Etsy Listing Videos from Product Photos", "Create a short Etsy listing video from photos of your products. Show the item, texture and details, then download the MP4 and upload it to Etsy."),
  "/gif-for-email": page("Animated Product GIF Maker for Email", "Make animated GIFs from product photos for email newsletters and websites. Add your brand, keep the first frame clear and export from the same reel."),
  "/html5-ads": page("HTML5 Ad Maker from Product Photos", "Export your edited reel as an HTML5 ZIP with photos, fonts and a click-through link at its main size. Business and Team only; not for Google Ads yet."),
  "/video-ads-for-small-business": page("Video Ads for Small Businesses", "Create branded video ads from product photos without filming. Make versions for Instagram, Facebook and TikTok using your words, logo and motion."),
  "/for/jewelry": page("Jewelry Video Ads from Product Photos", "Turn jewellery photos into branded video ads and Reels. Show pieces worn, close-up details and gift ideas with text and motion, without a video shoot."),
  "/for/home-decor": page("Home Decor Video Ads from Photos", "Make video ads from photos of furniture, rugs, bedding and homeware. Show room settings, texture and scale in branded reels for social and your store."),
  "/for/fashion": page("Fashion Video Ads from Lookbook Photos", "Turn lookbook and product photos into fashion video ads. Show outfits, fabric details and fit as pictured, with branded text and motion for social."),
  "/for/food-and-drink": page("Food and Drink Video Ads from Photos", "Make branded food and drink reels from chocolate, coffee and sparkling drink photos. Use the same edit for social MP4 videos and email GIFs."),
  "/for/beauty-and-fragrance": page("Beauty and Fragrance Video Ads", "Create polished video ads from skincare, hair care and fragrance photos. Add product details, brand colours, your logo and motion for social posts."),
  "/privacy": page("Privacy Policy for the Video Ad Maker", "Read how Gravity Pants handles account details, uploaded photos, reel files and website measurement, including advertising consent and cookie settings."),
  "/terms": page("Video Ad Maker Terms of Service", "Read the terms for using Gravity Pants to create and export product video ads, including accounts, uploaded content and use of the service."),
  "/blog/how-to-turn-photos-into-a-video": page("How to Turn Photos into a Video", "Learn how to turn product photos into a branded video: choose images, set the size, add words and export. Includes steps for posting a photo Reel."),
  "/blog/photos-beat-nothing-video-beats-photos": page("Using Photo Motion in Product Video Ads", "Explore how movement, short headlines and consistent branding turn still product photos into useful video ads for social feeds, without filming."),
  "/blog/three-photos-one-ad": page("Three Photos for a Product Video Ad", "Plan a product reel with three photos: a wide view, a detail and a close-up. Learn what each shot contributes before you start making your video ad."),
  "/blog/why-tap-anything": page("Making Video Ads without a Timeline", "See why Gravity Pants uses a photo-first editor rather than a traditional video timeline, with direct changes to photos, text, motion and brand kits."),
  "/blog/how-to-make-an-etsy-listing-video-from-photos": page("How to Make an Etsy Listing Video", "Make an Etsy listing video from three product photos. Learn about silent playback, suitable shapes and downloading an MP4 to upload to your listing."),
  "/blog/how-to-make-shopify-product-videos-from-photos": page("How to Make Shopify Product Videos", "Learn how to choose product photos, match your Shopify gallery shape, add a short headline and upload the exported MP4 to your product's media."),
  "/blog/how-to-make-instagram-reels-from-photos": page("How to Make Instagram Reels from Photos", "Make an Instagram Reel from product photos in 9:16. Keep text clear of captions and buttons, export the MP4 and post it yourself in Instagram."),
  "/blog/how-to-make-a-tiktok-video-from-photos": page("How to Make a TikTok Video from Photos", "Build a vertical TikTok video from product photos. Choose an opening image, keep words clear of buttons and download the MP4 to upload in TikTok."),
  "/blog/how-to-make-an-animated-gif-for-email": page("How to Make an Animated GIF for Email", "Turn product photos into an email GIF. Choose a shape, reduce file size, make the first frame work alone and link the image to your product page."),
  "/blog/how-to-make-html5-display-ads-from-photos": page("How to Make HTML5 Ads from Photos", "Learn how to export your reel as an HTML5 ZIP at its main size, add a click-through link and check platform requirements. Google Ads is not supported."),
  "/blog/what-to-photograph-for-a-video-ad-by-category": page("Product Photos to Use in Video Ads", "Choose reel photos for jewellery, fashion, home decor, food and beauty. Learn when to show a full look, fabric, texture, product detail or room setting."),
};

/** A page describes the software or an article; it is never marked as a clothing product. */
export function pageStructuredData(path: string, metadata: PageMetadata, origin: string) {
  const url = `${origin}${path}`;
  const article = path.startsWith("/blog/");
  return {
    "@context": "https://schema.org",
    "@type": metadata.type,
    "@id": `${url}#webpage`,
    url,
    name: metadata.title,
    description: metadata.description,
    inLanguage: "en",
    isPartOf: { "@type": "WebSite", "@id": `${origin}/#website`, name: "Gravity Pants", url: `${origin}/` },
    publisher: { "@type": "Organization", "@id": `${origin}/#org`, name: "Gravity Pants", url: `${origin}/` },
    ...(article ? { mainEntity: { "@id": `${url}#article` } } : {
      about: { "@type": "SoftwareApplication", "@id": `${origin}/#software`, name: "Gravity Pants", url: `${origin}/`, applicationCategory: "MultimediaApplication", operatingSystem: "Web browser" },
    }),
  };
}