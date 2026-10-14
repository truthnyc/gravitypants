import { EXPORT_PACKS, PLANS, TRIAL } from "./plans-config";
import { MAIN_SIZES } from "./main-size";

export const TRIAL_ANSWER = `No time limit and no card. You get ${TRIAL.exports} exports: the first without a watermark, then ${TRIAL.exports - TRIAL.cleanExports} more with a small Gravity Pants mark.`;
const team = PLANS.find((p) => p.id === "team");
const sizes = MAIN_SIZES.map((s) => s.format).join(", ");

export type GuideLink = { label: string; to: "/app/new" | "/app/ads" | "/app/templates" | "/app/brand" | "/app/exports" | "/app/account/members" | "/app/stats" | "/app/account/billing" };
export type GuideSectionData = {
  id: string; title: string; shortTitle: string; steps: readonly string[]; tip: string;
  illustration: "start" | "create" | "edit" | "templates" | "brand" | "export" | "share" | "team" | "stats" | "directory" | "shopify" | "billing" | "support";
  imageDescription: string; link?: GuideLink; comingSoon?: boolean; support?: boolean;
};

export const GUIDE_SECTIONS: readonly GuideSectionData[] = [
  { id: "before-you-start", title: "Before you start", shortTitle: "Before you start", illustration: "start",
    steps: ["Gravity Pants turns still photos into short video ads (MP4) and animated GIFs. Bring your own photos; you can add words and a logo as you go.", TRIAL_ANSWER, "Choose clear photos with a little space around the subject. Three to five is a good place to start."],
    tip: "Your reels and brand kit stay saved when your trial exports run out. You can keep editing before choosing a plan.",
    imageDescription: "Three illustrated photos become a short reel, with one clean trial export and two marked exports.", link: { label: "Start a reel", to: "/app/new" } },
  { id: "first-reel", title: "Make your first reel", shortTitle: "Your first reel", illustration: "create",
    steps: [`Open New ad. Format comes first: pick your main size from ${sizes}. Portrait 4:5 is selected to begin with.`, "Choose a template and brand kit if you want them, then choose Next: Photos.", "Add three to five photos and drag them into the order you want. Each photo becomes a frame; choose Next to open Edit."],
    tip: "Your main size is the shape you design in. You can add other shapes, including custom dimensions, when you export.",
    imageDescription: "Five format choices lead to an ordered strip of three photos.", link: { label: "Start a reel", to: "/app/new" } },
  { id: "edit", title: "Edit your reel", shortTitle: "Edit", illustration: "edit",
    steps: ["Choose a frame in the rail, then select the photo, headline, subline or logo in the preview. The Inspector opens the matching controls.", "Use Photo, Text and Logo to adjust framing, movement, words, fonts, colours and logo placement. Check whether your change applies to one frame or all frames.", "Use the frame’s timing and transition controls to change its length and how it leads into the next frame. Play the reel to check the pace.", "Use Undo if a change does not work. Changes save automatically. On your phone, choose a frame and open its controls below the preview."],
    tip: "Preview as only changes what you are looking at. Make main size changes the reel’s main shape; Fix for this size lets you adjust that shape without changing the others.",
    imageDescription: "A reel preview beside Photo, Text and Logo controls, with a frame rail and timing marks below.", link: { label: "Open Your Ads", to: "/app/ads" } },
  { id: "templates", title: "Start from a template", shortTitle: "Templates", illustration: "templates",
    steps: ["Open Templates and preview a style before choosing it.", "Add your photos and replace the words. You can still change the layout, colours and movement in Edit.", "For a reel made from a reusable kit, choose Make another from this kit to begin another version with its words filled in. Add fresh photos."],
    tip: "Make another carries over words, not photos. It is available for reusable kits, not every template.",
    imageDescription: "Three template previews share a layout while showing different photo shapes.", link: { label: "Open Templates", to: "/app/templates" } },
  { id: "brand-kit", title: "Set up your brand kit", shortTitle: "Brand kit", illustration: "brand",
    steps: ["Open Brand Kit and create or edit a kit. Add a logo for light photos and a second version for dark photos if you have one.", "Choose your brand colours and Google fonts for headlines and sublines. Save the kit; settings that save automatically show Saved.", "Choose the kit when starting a reel. In Edit, use Logo to choose its version, placement and visibility on each frame."],
    tip: "A white version of your logo is usually easier to read on a dark photo. Check it on each frame rather than relying on one background.",
    imageDescription: "Light and dark logo samples above brand colour swatches and headline and subline font samples.", link: { label: "Open Brand Kit", to: "/app/brand" } },
  { id: "export", title: "Export your files", shortTitle: "Export", illustration: "export",
    steps: ["Open a reel from Your Ads and choose Export. Keep the main size and add any other sizes you need. Open Custom Size for your own dimensions.", "Choose MP4 for places that play video, or GIF for email and other places that accept animated images. You can choose both.", "Check crop warnings, quality and the estimated file size. Export, then download your files individually or together.", "Find finished files in Previous Exports for 30 days. Deleting a download does not give an export back to your plan."],
    tip: "One export can produce several sizes and file types. For a smaller GIF, try the Small file or Balanced setting; the estimate is a guide, not an exact final size.",
    imageDescription: "An export card lists an MP4 and GIF with sizes, an approximate file estimate and download symbols.", link: { label: "Previous Exports", to: "/app/exports" } },
  { id: "share", title: "Share your reel", shortTitle: "Share", illustration: "share",
    steps: ["Download your exported MP4 or GIF to use in your own posts, website or email. Downloading does not publish it anywhere.", "If you want to submit a reel to the Directory, open Share after Export and turn on the optional sharing control. A new reel stays private unless you choose to share it.", "Add the brand details and reel description, read the permission terms and submit. Your first submission needs review before it goes live."],
    tip: "The Share step is optional. It does not post directly to Instagram or another social account.",
    imageDescription: "A downloaded reel beside a separate, initially off sharing switch.", link: { label: "Open Your Ads", to: "/app/ads" } },
  { id: "team", title: "Work with your team", shortTitle: "Team", illustration: "team",
    steps: [`On the Team plan, you and up to ${(team?.seats ?? 5) - 1} teammates share brand kits, templates and ${team?.monthlyExports ?? 150} exports a month.`, "As a workspace owner or admin, open Account → Team to invite someone by email and choose their role.", "Use the workspace switcher in the header or phone menu to move between workspaces. Check the selected workspace before making changes."],
    tip: "Team invitations and billing changes belong to workspace owners and admins. Shared exports are one allowance for the workspace, not one allowance per person.",
    imageDescription: "Five team members connected to one workspace with shared brand kit and template symbols.", link: { label: "Open Team", to: "/app/account/members" } },
  { id: "stats", title: "Read your brand stats", shortTitle: "Brand stats", illustration: "stats",
    steps: ["Open Brand stats on a Business or Team plan.", "Choose a date range and compare views, saves and website clicks for your reels on Aimanté and Gravity Pants.", "Look at which reels and moods bring people to your website. If there is no activity yet, come back after shoppers have seen your published reels."],
    tip: "These are not Instagram statistics. Estimated revenue is a calculation from clicks and your assumptions, not a record of actual sales.",
    imageDescription: "A small chart and separate view, save and website-click counters.", link: { label: "Open Brand stats", to: "/app/stats" } },
  { id: "aimante", title: "Aimanté directory", shortTitle: "Aimanté", illustration: "directory", comingSoon: true,
    steps: ["Aimanté brings brand reels together in a browsable directory.", "This part of the tutorial is coming soon. The Share section above covers the optional submission step."],
    tip: "Your reel stays private unless you explicitly choose to submit it and accept the sharing terms.",
    imageDescription: "An illustrated directory with three reel tiles and brand caption lines." },
  { id: "shopify", title: "Shopify", shortTitle: "Shopify", illustration: "shopify", comingSoon: true,
    steps: ["Gravity Pants for Shopify brings product photos into a reel from inside your store’s admin.", "This part of the tutorial is coming soon. There is nothing to connect from this page."],
    tip: "You can make a reel here with your own photos without connecting a Shopify store.",
    imageDescription: "Product photo tiles lead into a vertical reel preview." },
  { id: "billing", title: "Plans and billing", shortTitle: "Plans & billing", illustration: "billing",
    steps: ["Open Account → Billing to see your plan and remaining exports. The free trial has no time limit; its included exports do not reset each month.", `${PLANS.map((p) => `${p.name} includes ${p.monthlyExports}`).join(", ")} exports a month. Choose a plan when you need to keep exporting.`, `Need more exports? Top-ups come in packs of ${EXPORT_PACKS.map((p) => p.exports).join(", ")} and never expire.`, "Workspace owners and admins can change billing. If you already have a billing account, use Manage billing to update payment details or cancel."],
    tip: "The remaining count belongs to the selected workspace and its billing coverage. Check which workspace you are in before changing a plan.",
    imageDescription: "A plan summary with an exports-used meter and separate extra-export balance.", link: { label: "Open Billing", to: "/app/account/billing" } },
  { id: "support", title: "Troubleshooting and support", shortTitle: "Support", illustration: "support", support: true,
    steps: ["If a photo will not upload, try a JPG or PNG and check your connection. If a crop or line of text looks wrong, open that frame in Edit and adjust its position or size.", "If fonts fail to load, use Retry loading fonts on Export. Wait for the font to load rather than exporting with a different-looking substitute.", "For a large GIF, reduce its quality preset or dimensions. If exports are blocked, check the remaining count and billing status in Account → Billing.", "Still stuck? Contact support with what happened and, if helpful, a screenshot. You do not need to leave the tutorial."],
    tip: "Include the reel name and the point where the problem happened. Never include your password or payment details.",
    imageDescription: "A support message with a screenshot attachment and a reply symbol." },
];

export const HELP_FAQ = [
  ["How do I make an ad?", "On Your Ads, start a new ad. Choose a main size, add your photos, then edit the words and logo before exporting."],
  ["What does the free trial include?", TRIAL_ANSWER],
  ["How long are my files kept?", "Finished exports stay under Previous exports for 30 days."],
  ["How do I change or cancel my plan?", "Go to Account → Billing and choose Manage billing."],
  ["Can I share with my team?", `On the Team plan, you and up to ${(team?.seats ?? 5) - 1} teammates share brand kits, templates and ${team?.monthlyExports ?? 150} exports a month.`],
] as const;