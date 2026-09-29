# Show trial exports on the Billing page

## What's happening
- The server gives a new trial workspace 3 watermarked exports. The newest trial account ("test3's ads", trial ends October 6) has an active trial and no exports used, so the server should answer "3 of 3".
- The Billing page still showed "None — pick a plan". That text only appears when the page gets an answer with no trial limit in it. So the page most likely showed an older answer: one saved before the new account's workspace was ready, or saved for a different workspace.
- The likely cause is that the saved export count isn't linked to a specific workspace. After signing up or switching workspaces, the page can reuse an answer that was meant for something else. This isn't confirmed yet, so step 1 checks it.

## Changes
1. **Confirm the cause.** Sign in as a fresh trial account, open Billing, and record what the server sends back for the export count.
2. **Link the count to the workspace.** The saved export count is tied to the current workspace and refreshes after sign-up or a workspace switch, so a new trial always gets a fresh answer.
3. **Clearer wording for trials.** "Exports left" shows "3 of 3 · watermarked" during a trial. If the answer is still loading or can't be read, it shows "—" instead of "None — pick a plan". "None — pick a plan" only shows when the trial has really ended or its exports are used up.
4. **Progress line.** Under the details: "0 of 3 exports used in your trial · watermarked", with a bar.
5. **Same fix everywhere the count shows.** The export screen and the trial pill use the same saved count, so they're fixed the same way.

## Technical details
- `useExportStatus` in `billing.ts`: query key becomes `[...billingKey, "export", peekWorkspaceId()]`, the same as `usePlanAccess`. Invalidate `billingKey` after `ensure_workspace()` and on a workspace switch.
- `exportsLeft()` in `account_.billing.tsx`: when `st.watermark`, render `${left} of ${limit} · watermarked`. Reserve "None — pick a plan" for `reason in ('no_plan','limit_reached')`.
- No change to the `export_status` rule on the server, which is correct.
- Verify with Playwright signed in as a trial workspace: Billing shows "3 of 3 · watermarked".
