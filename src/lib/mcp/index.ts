import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listWorkspaces from "./tools/list-workspaces";
import listAds from "./tools/list-ads";
import adminOverview from "./tools/admin-overview";
import adminClientLookup from "./tools/admin-client-lookup";
import adminSupportTickets from "./tools/admin-support-tickets";
import adminBrandApplications from "./tools/admin-brand-applications";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";
export default defineMcp({
  name: "gravity-pants",
  title: "Gravity Pants",
  version: "0.2.0",
  instructions: "Read your Gravity Pants workspace and ad inventory. Select a workspace before listing its ads. Account permissions apply. Tools prefixed admin_ work only for Gravity Pants staff and are read-only. No tool can export, publish, send, approve, delete or change anything.",
  auth: auth.oauth.issuer({ issuer: `https://${projectRef}.supabase.co/auth/v1`, acceptedAudiences: "authenticated" }),
  tools: [listWorkspaces, listAds, adminOverview, adminClientLookup, adminSupportTickets, adminBrandApplications],
});
