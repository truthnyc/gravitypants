import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listWorkspaces from "./tools/list-workspaces";
import listAds from "./tools/list-ads";
import adminOverview from "./tools/admin-overview";
import adminClientLookup from "./tools/admin-client-lookup";
import adminSupportTickets from "./tools/admin-support-tickets";
import adminBrandApplications from "./tools/admin-brand-applications";
import listAdCopy from "./tools/list-ad-copy";
import updateAdCopy from "./tools/update-ad-copy";
import listReelProducts from "./tools/list-reel-products";
import updateProductStatus from "./tools/update-product-status";
import adminApproveBrand from "./tools/admin-approve-brand";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";
export default defineMcp({
  name: "gravity-pants",
  title: "Gravity Pants",
  version: "0.3.0",
  instructions: "Read your Gravity Pants workspace and ad inventory. Select a workspace before listing its ads. Account permissions apply. You can edit ad headline/subline text and product stock status where your account allows. Tools prefixed admin_ work only for Gravity Pants staff; approving a brand application needs explicit user confirmation and creates an unpublished draft. No tool can export, publish, delete or spend exports.",
  auth: auth.oauth.issuer({ issuer: `https://${projectRef}.supabase.co/auth/v1`, acceptedAudiences: "authenticated" }),
  tools: [listWorkspaces, listAds, adminOverview, adminClientLookup, adminSupportTickets, adminBrandApplications, listAdCopy, updateAdCopy, listReelProducts, updateProductStatus, adminApproveBrand],
});
