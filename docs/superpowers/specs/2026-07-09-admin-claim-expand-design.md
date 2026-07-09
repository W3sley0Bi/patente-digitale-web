# Admin — Expandable Claim Detail

## Problem

`AdminDashboard.tsx` lists pending driving-school claims as a flat table (School, Contact, Requested, Actions). Admins can only see `name`, `city`, `address`, `email`, `piva`, `created_at` — the rest of what the school submitted (zip, region, phone, website, place ID, coordinates, opening hours) is invisible without going into the database directly.

## Goal

Clicking a row expands it inline to show every field submitted with the claim, so admins can review a claim fully before approving/rejecting.

## Scope

- Show all fields currently stored on the `driving_schools` row for a pending claim.
- Inline accordion expand (row expands downward in the table), not a modal or side panel.
- No i18n — `AdminDashboard.tsx` is entirely hardcoded English today (internal tool, never localized); stay consistent.
- No DB/schema changes.

### Explicitly out of scope

- **Auto vs manually-edited field tracking.** The claim form (`ClaimForm.tsx`) pre-fills some fields from a Google Places selection and lets the user edit them, but nothing is recorded distinguishing "left as autofilled" from "user edited." Adding that would require a schema change (e.g. a `data_source` column) and form changes to track edits — a separate piece of work if wanted later.
- **Contact person's full name.** Lives on `profiles.full_name`, not `driving_schools`. There is currently no RLS policy allowing admins to read other users' `profiles` rows (`profiles_own_row` only allows `auth.uid() = id`). Adding admin read access to `profiles` is a security-relevant RLS change and should be reviewed on its own, not bundled into this UI change.
- **Map preview for lat/lng.** Shown as plain "lat, lng" text for v1.

## Design

### Data fetch

`fetchPending` in `AdminDashboard.tsx` currently selects:
```
id, name, city, address, email, created_at, piva
```
Widen to also include: `zip, region, website, place_id, lat, lng, opening_hours`.

### Types

Extend the `PendingSchool` interface with the new optional fields:
```ts
interface PendingSchool {
  id: string;
  name: string;
  city: string;
  address: string;
  email: string;
  created_at: string;
  piva: string;
  zip: string | null;
  region: string | null;
  website: string | null;
  place_id: string | null;
  lat: number | null;
  lng: number | null;
  opening_hours: string[] | null;
}
```

### Interaction

- New state: `expandedId: string | null`.
- Clicking a row toggles `expandedId` (click again, or click a different row, collapses/switches).
- Clicking the Approve/Reject buttons must not toggle the row — call `e.stopPropagation()` in their `onClick` handlers.
- A chevron icon (rotates on expand) sits before the school name in the School cell, signaling the row is interactive.
- When `expandedId === school.id`, render an additional `<tr>` right after that row: a single `<td colSpan={4}>` containing a label/value grid (2 columns on desktop, 1 on mobile) with:
  - VAT (piva)
  - Zip
  - Region
  - Website (rendered as a link, `target="_blank"`, if present)
  - Place ID
  - Coordinates (`"{lat}, {lng}"` or "Not provided")
  - Opening Hours (rendered as a list, or "Not provided" if null/empty)
- Missing/null fields render a muted "Not provided" string rather than being omitted — lets the admin see gaps in the submission at a glance.

### Error handling

No new error states — this only changes what's rendered from data already fetched successfully. If the widened `select` fails, the existing `console.error` + empty-list path in `fetchPending` covers it (unchanged).

### Testing

- Manual: expand/collapse a row, confirm Approve/Reject still work without triggering expand toggle, confirm "Not provided" shows for a claim missing optional fields.
