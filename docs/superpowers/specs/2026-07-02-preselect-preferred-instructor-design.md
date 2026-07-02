# Preselect Student's Preferred Instructor in School View — Design

Date: 2026-07-02
Status: Approved (pending spec review)

## Problem

Students booking a drive can pick a preferred instructor (`BookLessonForm.tsx`), stored on
`bookings.preferred_instructor_id` (added in `015_student_slots_and_preference.sql`). The
school's requests inbox (`src/components/booking/RequestsInbox.tsx`) fetches the full booking
row but never reads this field — the instructor `<select>` always defaults to empty, forcing
staff to re-pick even when the student already chose.

## Decision (locked)

- `RequestsInbox.tsx` seeds its local `picked` state from `booking.preferred_instructor_id`
  when loading bookings, so the dropdown is **preselected** with the student's choice.
- No badge or extra label — preselection only (per user decision).
- If the preferred instructor is missing or not in the current active-instructor list
  (deactivated/deleted), fall back to empty ("Assign instructor" placeholder) — same as today.
- Staff can still freely override the preselected value; nothing else about the confirm flow
  changes (`confirmBooking` / `confirm_booking` RPC untouched).
- Seeding must not clobber a booking's already-set `picked` entry (e.g. after `load()` reruns
  following a confirm/decline of a different pending booking) — only fill in keys that are
  `undefined`.

## Implementation sketch

In `load()`:

```ts
const [b, i] = await Promise.all([...]);
setBookings(b);
const active = i.filter((x) => x.active);
setInstructors(active);
const activeIds = new Set(active.map((x) => x.id));
setPicked((prev) => {
  const next = { ...prev };
  for (const booking of b) {
    if (
      next[booking.id] === undefined &&
      booking.preferred_instructor_id &&
      activeIds.has(booking.preferred_instructor_id)
    ) {
      next[booking.id] = booking.preferred_instructor_id;
    }
  }
  return next;
});
```

No DB/API changes. No new i18n strings.

## Testing

- Manual: student books with a preferred instructor → school inbox shows that instructor
  preselected in the dropdown; confirm works unchanged.
- Manual: student books "any instructor" (no preference) → dropdown starts empty, as today.
- Manual: preferred instructor later deactivated → dropdown falls back to empty.
- Manual: staff manually changes dropdown for booking A, then confirms/declines booking B
  (triggering reload) → booking A's manual pick is preserved.
