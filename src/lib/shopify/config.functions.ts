import { createServerFn } from "@tanstack/react-start";

/** The Shopify API key (client id) is public by design; App Bridge needs it in a meta tag. */
export const getShopifyConfig = createServerFn({ method: "GET" }).handler(async () => ({
  apiKey: process.env["SHOPIFY_API_KEY"] ?? "",
}));
