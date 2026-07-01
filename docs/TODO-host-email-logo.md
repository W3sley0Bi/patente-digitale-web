# TODO: Host the mascot logo for booking emails

**Status:** open — created 2026-06-30

## Context
The booking emails (`supabase/functions/notify/template.ts`) currently show a **text
wordmark** ("patentedigitale.it") in the green header instead of the mascot logo.

Reason: the original `<img src="https://patentedigitale.it/mascot-logo.png">` returned
**404** (the apex domain does not serve that asset — the SPA 404 page came back), so
the image was broken in delivered emails. We swapped to a CSS wordmark, which renders
reliably in every email client.

## What to do
1. Put `mascot-logo.png` at a **stable, public** URL. Recommended: a public Supabase
   Storage bucket on project `dodwkggrwlydimlbmvgk`, e.g.
   - bucket `assets` (public)
   - object `mascot-logo.png`
   - URL: `https://dodwkggrwlydimlbmvgk.supabase.co/storage/v1/object/public/assets/mascot-logo.png`
   (Creating a public bucket needs explicit owner sign-off — it's a new public surface.)
   Alternative: serve it from wherever the production web app actually lives, if that
   origin reliably serves `/mascot-logo.png`.
2. In `supabase/functions/notify/template.ts`:
   - restore `const LOGO_URL = "<stable public url>";`
   - replace the wordmark `<span>` in the header `<td>` with the `<img>` (keep a sensible
     `alt` so blocked-image clients still show text).
3. Redeploy the `notify` edge function and send a test to confirm the image renders.

## Source files
- `patente-digitale-web/supabase/functions/notify/template.ts` (header block + `LOGO_URL`)
- Local asset: `patente-digitale-web/public/mascot-logo.png`
