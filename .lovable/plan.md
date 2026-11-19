# Extra storage: monthly add-on or clean up

Clients who near their storage limit get two choices: buy more space each month, or free up space by deleting old files.

## What clients will see

1. **Storage meter** on Account → Billing: "2.1 GB of 5 GB used", with two buttons: **Add storage** and **Free up space**.
2. **Add storage** (paid plans only): +10 GB for $5/month, can add more than one, cancel anytime. Free plan sees "Upgrade to add storage" instead.
3. **Free up space** page: lists their biggest items (photos, logos, finished exports, old ads) with size and date, select and delete. Published reels on Aimanté/Showcase are protected and labelled "In use".
4. **80% email** gets both buttons too, linking to the same two places.
5. **Pricing page**: one line per plan ("1 GB / 5 GB / 20 GB / 50 GB storage") plus a short FAQ: "Need more? Add 10 GB for $5/month or clean up old files." Help guide updated to match.

Uploads still never get blocked; the limit only drives the meter and email.

## Technical details

- New Stripe recurring price "Storage +10 GB" ($5/month, quantity-based) via payments tools; checkout server fn re-checks paid tier server-side like `canBuyPacks`.
- `workspace_billing.storage_addon_units` (int, default 0), synced only by `/api/public/payments/webhook` from subscription item quantity.
- `storageLimitFor(plan, addonUnits)` adds units x 10 GB; storage-alerts job and meter use it. Tests updated for add-on math.
- Usage + largest-files list via caller-scoped SQL function (workspace members only, `<workspace_id>/` paths); deletes go through storage RLS, pinned directory/site reels excluded.
- Update `plans-config.ts` comparison/FAQ, `guide.ts`, storage-warning email, memory and `src/lib/stillframe/AGENTS.md`.

## Open detail

Price and size ($5 for 10 GB) are a placeholder; easy to change before going live.
