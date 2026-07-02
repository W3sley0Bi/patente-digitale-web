# App/marketing URL restructure

## Problem

The current route tree mixes Italian and English segments (`/studenti`, `/autoscuole`), nests
real app pages under a literal `/dashboard` segment even though "dashboard" is a page, not a
section (e.g. `/driving-school/dashboard/edit` reads as "edit the dashboard" when it actually
edits the school's public listing), and doesn't separate the marketing site from the logged-in
app. There's also no way to jump between "the site" and "the app" from the UI.

## Goals

- English-only URLs everywhere.
- Marketing site stays at the root. The actual app (everything auth-related or behind auth)
  lives under `/app`.
- No `/dashboard` segment with subpages — the dashboard *is* the role's home page.
- Route names describe what the page does, not "edit"/"guide" placeholders.
- A way to switch between site and app from the profile/user menu.
- Clean cut: no redirects from old paths to new ones.

## New route table

### Marketing (public, root)

| Old | New |
|---|---|
| `/studenti` | `/students` |
| `/autoscuole` | `/driving-schools` |
| `/` | unchanged |
| `/search` (canonical; `/cerca`, `/iscrizione` still redirect here) | unchanged |
| `/partner` | unchanged (placeholder page, not linked from nav) |

### App (under `/app`)

| Old | New | Notes |
|---|---|---|
| `/login` | `/app/login` | |
| `/reset-password` | `/app/reset-password` | |
| `/set-password` | `/app/set-password` | protected, no role |
| `/signup` | `/app/signup` | still redirects to `/app/login?tab=signup` |
| `/signup/driving-school` | `/app/signup/driving-school` | |
| `/quiz` | `/app/quiz` | protected, student |
| `/student/dashboard` | `/app/student` | home/index for student role |
| `/student/dashboard/guide` | `/app/student/drive-bookings` | book lessons, view "my lessons" |
| `/student/dashboard/profile` | `/app/student/profile` | |
| `/student/dashboard/settings` | `/app/student/settings` | |
| `/driving-school/dashboard` | `/app/driving-school` | home/index for driving-school role |
| `/driving-school/dashboard/guide` | `/app/driving-school/drive-bookings` | calendar, instructors, requests inbox, service settings |
| `/driving-school/dashboard/students` | `/app/driving-school/students` | |
| `/driving-school/dashboard/edit` | `/app/driving-school/profile` | edits the school's public listing |
| `/driving-school/dashboard/settings` | `/app/driving-school/settings` | |

No redirects are added for any of the retired paths; they 404.

## Nav / UserMenu changes

`UserMenu` is shared by the marketing `Nav` and both app shells (`DrivingSchoolLayout`,
`StudentLayout`). It gets one context-aware link, replacing the current always-shown
"Dashboard" item:

- If the current path does **not** start with `/app`: show **"Go to app"**, linking to the
  user's home (`/app/student` or `/app/driving-school` based on `role`).
- If the current path **does** start with `/app`: show **"Go to website"**, linking to `/`.

This is a single link that swaps label/destination based on location, not two separate items.

`Nav.tsx`'s `NAV_LINKS` array updates `href` for the "how it works" and "partners" entries to
`/students` and `/driving-schools`. Labels (translation keys) are unchanged — they're already
in English.

## ProtectedRoute changes

`ProtectedRoute` currently redirects to:
- `/login?next=<path>` for unauthenticated users → becomes `/app/login?next=<path>`
- the correct dashboard on role mismatch (`/driving-school/dashboard` / `/student/dashboard`)
  → becomes `/app/driving-school` / `/app/student`
- `/driving-school/dashboard` when `requireApproved` fails → becomes `/app/driving-school`

## Implementation notes

- `App.tsx`'s route tree is restructured to nest everything app-related under a `/app` path
  prefix (a wrapping `<Route path="/app">` with child routes, or repeated literal prefixes —
  implementer's call based on what's cleanest with the existing lazy-loading setup).
- All internal navigation (`Link to=`, `useNavigate()` calls, `Navigate` redirects) referencing
  any of the old paths must be updated. Known call sites: `StudentDashboard`,
  `DrivingSchoolDashboard`, `DrivingSchoolLayout`, `StudentLayout`, `AuthForm`,
  `ForgotPasswordForm`, `ClaimForm`, `EnrollPaywall`, `ProtectedRoute`, and their tests
  (`ProtectedRoute.test.tsx`, `ClaimSearch.test.tsx`, `RequestsInbox.test.tsx`). A full grep for
  each old literal path is required during implementation since this list may not be exhaustive.
- `entry-server.tsx` should be checked for any SSR-side path matching that assumes the old
  structure.
- Route *file* names (e.g. `StudentGuide.tsx`, `DrivingSchoolEdit.tsx`) are not required to be
  renamed by this spec — only the URLs and route config change. Renaming files is optional
  polish, not blocking.
- i18n locale files are not expected to contain hardcoded paths, but should be checked as part
  of the grep sweep.

## Out of scope

- Renaming the `/partner` placeholder page (not linked anywhere, not part of the reported
  confusion).
- Any redesign of the marketing page content itself.
- Renaming component/file names beyond what's needed to keep the codebase coherent (left to
  implementer discretion, not a requirement of this spec).
