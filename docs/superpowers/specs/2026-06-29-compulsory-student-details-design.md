# Compulsory student details — design

Date: 2026-06-29

## Problem

Two student touchpoints currently let required data slip through:

1. **Registration.** `AuthForm` renders a `required` full-name field for student
   password signup and copies it to `profiles.full_name` via the `handle_new_user`
   trigger. Enforcement is browser-only: the HTML `required` accepts whitespace,
   the magic-link / OAuth paths never show the field, and `StudentDashboard` has a
   fallback "complete your name" prompt precisely because names go missing. Full
   name is not truly compulsory.

2. **Requesting access to a school.** `EnrollButton`'s "Iscriviti a questa
   autoscuola" is a single click straight to `requestEnrollment(school.id)`. The
   student's **driving licence type** and **phone number** are never asked for, so
   schools receive enrollment requests with no way to contact the student and no
   idea which licence they are pursuing.

## Goals

- Full name is mandatory and non-empty at registration (unskippable).
- Requesting access to a school requires the student to provide their driving
  licence type and phone number (unskippable).

## Non-goals

- No redesign of the search panel or the booking flow.
- No new licence taxonomy: reuse `PATENTE_CATEGORIES` from `src/lib/booking/licence.ts`.
- No change to how schools view/edit student details (`StudentEditSheet` already
  shows phone + licence).

## Decisions

| Topic | Decision |
|---|---|
| Enrollment step presentation | **Modal dialog** (reuse `@/components/ui/dialog`). |
| Phone validation | **Required + light sanity**: trimmed, allows digits `+ - ( ) space`, min 6 digits. Accepts foreign numbers (international-student persona). |
| Prefill | **Yes.** Dialog prefills `profiles.phone` and the student's most recent `enrollments.licence_code` when present; both editable. |
| Full-name enforcement | **Harden client validation** (trim + non-empty + inline error). Keep `StudentDashboard` fallback prompt. **No DB constraint.** |
| Storage | Phone → `profiles.phone` (shared across schools, school-visible). Licence → `enrollments.licence_code` (per-school, matches today's schema). |

## Design

### 1. Registration full name (`AuthForm.tsx`)

- On submit, when the name field is shown (`mode === "signup" && fullName === undefined`),
  trim `name`; if empty, set an inline error (`auth.errors.fullNameRequired`) and
  abort before calling `supabase.auth.signUp`. Do not rely on HTML `required` alone.
- The submitted metadata already trims (`(fullName ?? name).trim()`); no change there.
- `StudentDashboard`'s existing prompt stays as the safety net for accounts created
  via magic link / OAuth or before this change.

### 2. Enrollment dialog

New component `EnrollDialog` (colocated with `EnrollButton`, or a small dialog
rendered by `EnrollButton`). Fields:

- **Tipo di patente** — `<select>` seeded from `PATENTE_CATEGORIES`, starts empty
  (`""`) so a choice is forced. Label `booking.enroll.licenceLabel`.
- **Telefono** — `<input type="tel" autoComplete="tel">`, light-sanity validated.
  Label `booking.enroll.phoneLabel`, placeholder `+39 …`.

Behaviour:

- On open, prefill from `getMyProfileContact()` (new tiny reader: `profiles.phone`)
  and the most recent enrollment `licence_code` (already available via
  `getMyEnrollment()` when re-requesting; otherwise empty).
- "Invia richiesta" is disabled until both fields validate. Inline errors per field.
- On confirm → `requestEnrollment(school.id, licence, phone, school.email)`.
- Pending/active states on `EnrollButton` are unchanged.

### 3. API + RPC

- `requestEnrollment(schoolId, licence, phone, schoolEmail?)` — signature gains
  `phone`. Calls the RPC with `p_phone`.
- **Migration `021_enrollment_required_details.sql`:**
  - `drop function public.request_enrollment(uuid, text);`
  - Recreate as `request_enrollment(p_school_id uuid, p_licence_code text, p_phone text default null)`:
    - `if coalesce(btrim(p_licence_code), '') = '' then raise exception 'licence_required'; end if;`
    - Existing student-role guard and upsert into `enrollments` (licence now always set).
    - `if p_phone is not null and btrim(p_phone) <> '' then update public.profiles set phone = btrim(p_phone) where id = v_uid; end if;`
  - Re-apply grants: `revoke execute … from public, anon; grant execute … to authenticated;`
    for the new `request_enrollment(uuid, text, text)` signature (mirrors migration 008).
- Migration file is written but **not applied** in this work without explicit
  permission (Supabase is a live project; applying is a deploy).

### 4. i18n (IT + EN)

New keys under `booking.enroll`: `licenceLabel`, `licencePlaceholder`,
`phoneLabel`, `dialogTitle`, `dialogSubmit`, `dialogCancel`, and validation
errors `phoneInvalid`, `licenceRequired`. New `auth.errors.fullNameRequired`.

## Error handling

- Dialog maps RPC errors: `licence_required` → field error; anything else →
  `booking.enroll.error` (existing).
- Phone update is part of the same RPC call, so it cannot half-succeed relative to
  the enrollment insert.

## Testing

- Unit: phone sanity validator (valid IT, valid foreign, reject empty/junk/too-short).
- Component: `EnrollDialog` blocks submit until both fields valid; prefill populates
  from profile.
- Component: `AuthForm` blocks empty/whitespace name on student signup.
- E2E (existing signup-driving-school spec pattern): student requests enrollment,
  dialog requires licence + phone, request reaches the school inbox with both values.

## Files touched

- `src/components/auth/AuthForm.tsx` — name trim/validation.
- `src/components/booking/EnrollButton.tsx` — open dialog instead of direct enroll.
- `src/components/booking/EnrollDialog.tsx` — new.
- `src/lib/booking/api.ts` — `requestEnrollment` phone param, profile-contact reader.
- `supabase/migrations/021_enrollment_required_details.sql` — new (not applied).
- `src/i18n/locales/it.json`, `src/i18n/locales/en.json` — new keys.
