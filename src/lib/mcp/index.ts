import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listWorkspaces from "./tools/list-workspaces";
import listAds from "./tools/list-ads";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";
export default defineMcp({
  name: "gravity-pants",
  title: "Gravity Pants",
  version: "0.1.0",
  instructions: "Read your Gravity Pants workspace and ad inventory. Select a workspace before listing its ads. Account permissions apply. These tools cannot export, publish, send, delete or change ads.",
  auth: auth.oauth.issuer({ issuer: `https://${projectRef}.supabase.co/auth/v1`, acceptedAudiences: "authenticated" }),
  tools: [listWorkspaces, listAds],
});