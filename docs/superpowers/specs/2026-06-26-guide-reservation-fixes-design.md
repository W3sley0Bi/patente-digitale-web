# Guide Reservation Fixes — Design

Date: 2026-06-26
Status: Approved (pending spec review)

Fixes five issues in the booking ("guida"/lesson reservation) feature. Builds on the
booking engine (`supabase/migrations/006_booking_engine.sql`) — tables `instructors`,
`enrollments`, `bookings`, plus `driving_schools.lesson_duration_min` / `booking_enabled`.

## Goals (verbatim from request)

1. Calendar is not scrollable / not long enough.
2. Requests should be visible at the top of the page.
3. CRUD for the instructor section.
4. Available time should be configurable: students pick only available slots; unavailable
   slots shown greyed/disabled.
5. Pending requests visible in the calendar (Outlook-style: dashed/different colour vs confirmed).

## Decisions (locked)

- Availability model: **school weekly hours AND per-instructor weekly hours**.
- A slot is **available** when: it falls inside school booking hours **AND** ≥1 active
  instructor is on-shift that weekday/time **AND** that instructor has no confirmed booking
  overlapping the slot **AND** the slot start is in the future.
- Student booking UX: **slot-picker grid** (pick a day → available slots as buttons;
  unavailable greyed/disabled).
- Instructor CRUD: **rename + delete + active toggle**.
- School configures hours via a **new `booking_hours` editor** (structured JSON), not the
  existing Google `opening_hours` column.

---

## 1. Calendar scroll & height — `src/components/booking/LessonsCalendar.tsx`

Current wrapper `h-[640px] overflow-hidden` clips the schedule-x time grid and the grid is
too short to scroll usefully.

- Wrapper: `h-[75vh] min-h-[600px]` (remove `overflow-hidden`; schedule-x scrolls internally).
- `weekOptions` / `dayOptions`: `gridHeight: 2400` so hours are tall enough to scroll.
- `dayBoundaries: { start: '06:00', end: '22:00' }` to focus the working day.
- Add current-time indicator + auto-scroll to now (schedule-x `createCurrentTimePlugin`).

## 2. Requests at top — `src/routes/DrivingSchoolGuide.tsx`

Reorder so the school sees pending requests first:

```
<RequestsInbox />        ← moved to top, full width
<LessonsCalendar />
<grid: EnrollmentsInbox · InstructorsManager · ServiceSettings/AvailabilityEditor>
```

`RequestsInbox` stays unchanged internally; only its position moves.

## 3. Instructor CRUD — `InstructorsManager.tsx` + `lib/booking/api.ts`

RLS `instructors_owner_all` is `FOR ALL`, so update/delete are already permitted; no
migration needed for writes. FK `bookings.instructor_id … ON DELETE SET NULL` preserves
booking history when an instructor is deleted.

New api functions:

- `renameInstructor(id: string, name: string)` → `update instructors set name`.
- `deleteInstructor(id: string)` → `delete from instructors where id`.

UI in `InstructorsManager`:

- Each row: name (inline-editable on "rename"), active toggle (existing), delete button
  with confirm.
- Keep add form.

## 4. Configurable availability

### 4a. DB migration `supabase/migrations/009_availability.sql`

```sql
alter table public.driving_schools
  add column if not exists booking_hours jsonb;
-- shape: { "1":[["09:00","13:00"],["15:00","18:00"]], "2":[...], ... }
-- keys = ISO weekday 1=Mon … 7=Sun; value = list of [start,end] "HH:MM" ranges.

create table if not exists public.instructor_availability (
  id            uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references public.instructors(id) on delete cascade,
  weekday       int  not null check (weekday between 1 and 7),
  start_time    time not null,
  end_time      time not null,
  check (start_time < end_time)
);
create index if not exists instructor_availability_idx
  on public.instructor_availability (instructor_id, weekday);
```

RLS on `instructor_availability`:
- owner `FOR ALL` (via `instructors → driving_schools.user_id`),
- admin `FOR ALL`,
- active-enrolled students `FOR SELECT` (mirrors `instructors_enrolled_read`).

### 4b. RPC `list_available_slots(p_school_id uuid, p_day date)` → `setof timestamptz`

SECURITY DEFINER (students cannot read other students' confirmed bookings under RLS, so
slot computation must run server-side). Algorithm for the given day:

1. Resolve `lesson_duration_min`, `booking_enabled`, `booking_hours`. If disabled or no
   duration/hours → return empty.
2. Take the ISO-weekday's school ranges from `booking_hours`.
3. For each candidate start (stepping by `lesson_duration_min` within each range), the slot
   is available iff **some active instructor**:
   - has an `instructor_availability` row for that weekday fully covering
     `[start, start+duration)`, **and**
   - has no `confirmed` booking overlapping `[start, start+duration)`.
4. Exclude slots whose start ≤ now.
5. Return the available start timestamps (ascending).

Grant EXECUTE to `authenticated` only (revoke from `anon`, consistent with migration 007).

### 4c. Harden `request_booking`

Re-validate server-side before insert: the requested `p_starts_at` must be one of
`list_available_slots(school, day_of(p_starts_at))`. If not → `raise exception
'slot_unavailable'`. Guards against stale client state. Keeps existing `booking_disabled`,
`lesson_duration_not_set`, `not_enrolled` checks.

### 4d. API additions — `lib/booking/api.ts`

- `getBookingHours(schoolId)` / `setBookingHours(schoolId, hours)`.
- `listInstructorAvailability(instructorId)` / `setInstructorAvailability(instructorId, rows)`
  (replace-all: delete existing + insert new for that instructor).
- `listAvailableSlots(schoolId, dayISO)` → `string[]` (ISO timestamps via RPC).

### 4e. School UI

- New `AvailabilityEditor` (weekly grid: per weekday, add/remove `[start,end]` ranges) →
  saves `booking_hours`. Rendered in the guide page alongside `ServiceSettings`.
- Per-instructor weekly hours editor inside `InstructorsManager` (expandable row → weekday
  rows). Saves via `setInstructorAvailability`.

### 4f. Student UI — `BookLessonForm.tsx` → slot-picker grid

Replace free `date`+`time` inputs with:
- A day selector (next ~14 days, or a date input).
- On day pick → `listAvailableSlots(schoolId, day)` → render slot buttons.
- Available slots = enabled brand buttons; show greyed/disabled message when a day has none.
- Selecting a slot + submit → `requestBooking(schoolId, slotIso)`.

`new TZ` handling: slots come back as ISO timestamps; render with `toLocaleTimeString`.

## 5. Pending in calendar (Outlook-style) — `LessonsCalendar.tsx`

- Stop filtering out `pending`; include both `confirmed` and `pending` bookings as events.
- Add calendars: instructor colours (existing) + `unassigned` (grey) + reuse for pending.
- Distinguish pending via schedule-x `customComponents.timeGridEvent` (and
  `monthGridEvent`): pending → dashed border, translucent/amber fill, `⧖` title prefix;
  confirmed → solid instructor colour. Pending events are not draggable.

## i18n

Add keys to `src/i18n/locales/{it,en,ar}.json` under `booking.*`:
- `school.availability` (title), weekday labels, `addRange`, `removeRange`, `instructorHours`,
  `rename`, `delete`, `confirmDelete`.
- `book.pickDay`, `book.noSlots`, `book.chooseSlot`.
- `book.slotUnavailable` (maps RPC error `slot_unavailable`).
- `mine.status` / calendar legend: `pending` vs `confirmed`.

## Testing

- Unit (`lib/booking/helpers.test.ts` pattern): slot-generation helper if any logic lands
  client-side; otherwise rely on RPC.
- Manual/e2e: school sets hours + instructor hours → student sees only valid slots, booked
  slots greyed; pending request appears dashed in school calendar; confirm → turns solid;
  rename/delete instructor works.

## Out of scope (YAGNI)

- One-off date overrides / holidays (only weekly recurring hours).
- Instructor selection by the student (school still assigns at confirm).
- Timezone selection (uses browser TZ, as today).
