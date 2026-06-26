# Guide Reservation Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the lesson-reservation feature: scrollable calendar, requests on top, instructor CRUD, configurable availability (school + per-instructor) with a student slot-picker, and pending lessons shown Outlook-style in the calendar.

**Architecture:** Add weekly-recurring availability (school `booking_hours` jsonb + `instructor_availability` table) and a security-definer `list_available_slots` RPC that the student slot-picker calls; harden `request_booking` to re-validate. Frontend edits to booking components + new editors.

**Tech Stack:** React 19, Vite, react-i18next, Supabase (Postgres + RLS + RPC), schedule-x v4 calendar, vitest.

---

## Task 1: DB migration — availability schema + RPC

**Files:**
- Create: `supabase/migrations/009_availability.sql`

- [ ] **Step 1: Write migration**

```sql
-- 009_availability.sql — configurable booking availability
alter table public.driving_schools
  add column if not exists booking_hours jsonb;
-- shape: {"1":[["09:00","13:00"],["15:00","18:00"]], ...} keys = isodow 1=Mon..7=Sun

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

alter table public.instructor_availability enable row level security;

drop policy if exists "ia_owner_all" on public.instructor_availability;
create policy "ia_owner_all" on public.instructor_availability for all using (
  auth.uid() = (select ds.user_id from public.instructors i
                join public.driving_schools ds on ds.id = i.school_id
                where i.id = instructor_id)
);
drop policy if exists "ia_admin_all" on public.instructor_availability;
create policy "ia_admin_all" on public.instructor_availability for all using (
  (select role from public.profiles where id = auth.uid()) = 'admin'
);
drop policy if exists "ia_enrolled_read" on public.instructor_availability;
create policy "ia_enrolled_read" on public.instructor_availability for select using (
  exists (select 1 from public.instructors i
          join public.enrollments e on e.school_id = i.school_id
          where i.id = instructor_id and e.student_id = auth.uid() and e.status = 'active')
);

-- available slots for a school on a given day (security definer: students can't read
-- other students' confirmed bookings under RLS, so slot math runs server-side)
create or replace function public.list_available_slots(p_school_id uuid, p_day date)
returns setof timestamptz language plpgsql security definer set search_path = '' as $$
declare
  v_duration int; v_enabled boolean; v_hours jsonb;
  v_dow int := extract(isodow from p_day)::int;
  v_range jsonb; v_slot timestamptz; v_end timestamptz;
  v_start_t time; v_end_t time;
begin
  select lesson_duration_min, booking_enabled, booking_hours
    into v_duration, v_enabled, v_hours
    from public.driving_schools where id = p_school_id;
  if v_enabled is not true or v_duration is null or v_duration <= 0 or v_hours is null then
    return;
  end if;

  for v_range in select * from jsonb_array_elements(coalesce(v_hours->(v_dow::text), '[]'::jsonb))
  loop
    v_start_t := (v_range->>0)::time;
    v_end_t   := (v_range->>1)::time;
    v_slot := (p_day + v_start_t) at time zone 'UTC';
    -- iterate slots within this range
    while v_slot + make_interval(mins => v_duration) <= (p_day + v_end_t) at time zone 'UTC' loop
      v_end := v_slot + make_interval(mins => v_duration);
      if v_slot > now() and exists (
        select 1 from public.instructors ins
        where ins.school_id = p_school_id and ins.active
          and exists (
            select 1 from public.instructor_availability ia
            where ia.instructor_id = ins.id and ia.weekday = v_dow
              and ia.start_time <= v_start_t_of(v_slot) and ia.end_time >= v_end_t_of(v_end)
          )
          and not exists (
            select 1 from public.bookings b
            where b.instructor_id = ins.id and b.status = 'confirmed'
              and tstzrange(b.starts_at, b.ends_at) && tstzrange(v_slot, v_end)
          )
      ) then
        return next v_slot;
      end if;
      v_slot := v_end;
    end loop;
  end loop;
end;
$$;

revoke execute on function public.list_available_slots(uuid, date) from anon;
grant  execute on function public.list_available_slots(uuid, date) to authenticated;
```

> NOTE: the helper `v_start_t_of` / `v_end_t_of` above are pseudocode for "time-of-day of
> the slot". Replace them in the real migration with the local time extracted from the slot:
> compare `ia.start_time <= (v_slot at time zone 'UTC')::time` and
> `ia.end_time >= (v_end at time zone 'UTC')::time`. Keep school hours and instructor hours
> both interpreted as UTC wall-clock for consistency with how slots are built here.

- [ ] **Step 2: Harden `request_booking` (append to same migration)**

```sql
create or replace function public.request_booking(p_school_id uuid, p_starts_at timestamptz)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid(); v_duration int; v_enabled boolean; v_licence text; v_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select lesson_duration_min, booking_enabled into v_duration, v_enabled
    from public.driving_schools where id = p_school_id;
  if v_enabled is not true then raise exception 'booking_disabled'; end if;
  if v_duration is null or v_duration <= 0 then raise exception 'lesson_duration_not_set'; end if;
  select licence_code into v_licence from public.enrollments
    where school_id = p_school_id and student_id = v_uid and status = 'active';
  if not found then raise exception 'not_enrolled'; end if;
  if not exists (
    select 1 from public.list_available_slots(p_school_id, (p_starts_at at time zone 'UTC')::date) s
    where s = p_starts_at
  ) then raise exception 'slot_unavailable'; end if;
  insert into public.bookings (school_id, student_id, starts_at, duration_min, status, licence_code)
  values (p_school_id, v_uid, p_starts_at, v_duration, 'pending', v_licence)
  returning id into v_id;
  return v_id;
end;
$$;
```

- [ ] **Step 3: Apply** via Supabase MCP `apply_migration` (name `009_availability`) — ONLY after user confirms (memory: no deploy without permission). Otherwise leave file for manual apply.

---

## Task 2: API layer — `src/lib/booking/api.ts`

**Files:** Modify: `src/lib/booking/api.ts`

- [ ] **Step 1: Add instructor rename/delete + availability + slots + hours**

```ts
export async function renameInstructor(id: string, name: string): Promise<void> {
  const { error } = await supabase.from("instructors").update({ name }).eq("id", id);
  if (error) throw error;
}
export async function deleteInstructor(id: string): Promise<void> {
  const { error } = await supabase.from("instructors").delete().eq("id", id);
  if (error) throw error;
}

export interface AvailabilityRow { weekday: number; start_time: string; end_time: string; }

export async function listInstructorAvailability(instructorId: string): Promise<AvailabilityRow[]> {
  const { data, error } = await supabase
    .from("instructor_availability")
    .select("weekday, start_time, end_time")
    .eq("instructor_id", instructorId)
    .order("weekday");
  if (error) throw error;
  return (data ?? []) as AvailabilityRow[];
}
export async function setInstructorAvailability(instructorId: string, rows: AvailabilityRow[]): Promise<void> {
  const del = await supabase.from("instructor_availability").delete().eq("instructor_id", instructorId);
  if (del.error) throw del.error;
  if (rows.length === 0) return;
  const ins = await supabase.from("instructor_availability")
    .insert(rows.map((r) => ({ ...r, instructor_id: instructorId })));
  if (ins.error) throw ins.error;
}

export type BookingHours = Record<string, [string, string][]>; // isodow "1".."7"
export async function getBookingHours(schoolId: string): Promise<BookingHours> {
  const { data, error } = await supabase
    .from("driving_schools").select("booking_hours").eq("id", schoolId).maybeSingle();
  if (error) throw error;
  return ((data?.booking_hours as BookingHours) ?? {});
}
export async function setBookingHours(schoolId: string, hours: BookingHours): Promise<void> {
  const { error } = await supabase.from("driving_schools").update({ booking_hours: hours }).eq("id", schoolId);
  if (error) throw error;
}

export async function listAvailableSlots(schoolId: string, dayISO: string): Promise<string[]> {
  const { data, error } = await supabase.rpc("list_available_slots", {
    p_school_id: schoolId, p_day: dayISO,
  });
  if (error) throw error;
  return ((data as string[]) ?? []);
}
```

- [ ] **Step 2: Add `slot_unavailable` to the error map in `BookLessonForm` (Task 6).**

---

## Task 3: Date helpers + test — `src/lib/booking/helpers.ts`

**Files:** Modify: `src/lib/booking/helpers.ts`, `src/lib/booking/helpers.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { nextDays } from "./helpers";
test("nextDays returns n consecutive ISO dates from start", () => {
  const days = nextDays(3, new Date("2026-06-26T10:00:00Z"));
  expect(days).toEqual(["2026-06-26", "2026-06-27", "2026-06-28"]);
});
```

- [ ] **Step 2: Run `pnpm test` → FAIL (nextDays not defined).**

- [ ] **Step 3: Implement**

```ts
/** n consecutive YYYY-MM-DD dates (UTC) starting at `from`. */
export function nextDays(n: number, from: Date = new Date()): string[] {
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + i));
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}
```

- [ ] **Step 4: Run `pnpm test` → PASS.**

---

## Task 4: Instructor CRUD + availability UI — `InstructorsManager.tsx`

**Files:** Modify: `src/components/booking/InstructorsManager.tsx`

- [ ] **Step 1:** Add rename (inline edit), delete (with `confirm`), and an expandable per-instructor weekly-hours editor (weekday rows with start/end time inputs) using `listInstructorAvailability` / `setInstructorAvailability`. Keep add + active toggle. Use existing tailwind classes/i18n keys.

---

## Task 5: School hours editor — `AvailabilityEditor.tsx`

**Files:** Create: `src/components/booking/AvailabilityEditor.tsx`

- [ ] **Step 1:** Weekly grid (Mon–Sun). Each weekday: list of `[start,end]` range rows with add/remove. Load via `getBookingHours`, save via `setBookingHours`. Render in guide page.

---

## Task 6: Student slot-picker — `BookLessonForm.tsx`

**Files:** Modify: `src/components/booking/BookLessonForm.tsx`

- [ ] **Step 1:** Replace date/time inputs with: day selector (`nextDays(14)`), on select call `listAvailableSlots`, render slot buttons (enabled = available; show `book.noSlots` when empty). Selecting + submit → `requestBooking(schoolId, slotIso)`. Add `slot_unavailable: t("booking.book.slotUnavailable")` to error map.

---

## Task 7: Calendar scroll + pending — `LessonsCalendar.tsx`

**Files:** Modify: `src/components/booking/LessonsCalendar.tsx`

- [ ] **Step 1:** Wrapper → `h-[75vh] min-h-[600px]` (drop `overflow-hidden`). Add `weekOptions/dayOptions: { gridHeight: 2400 }`, `dayBoundaries: { start: "06:00", end: "22:00" }`.
- [ ] **Step 2:** Include `pending` bookings as events (calendarId `pending`); keep confirmed by instructor. Add `pending` calendar (amber). Use `customComponents.timeGridEvent` + `monthGridEvent` to render pending with dashed border + translucent fill + `⧖` prefix; confirmed solid.

---

## Task 8: Reorder guide page — `DrivingSchoolGuide.tsx`

**Files:** Modify: `src/routes/DrivingSchoolGuide.tsx`

- [ ] **Step 1:** Move `<RequestsInbox>` above `<LessonsCalendar>` (full width). Add `<AvailabilityEditor>` into the settings grid. Pass `refresh` to editors so calendar updates.

---

## Task 9: i18n keys

**Files:** Modify: `src/i18n/locales/{it,en,ar}.json`

- [ ] **Step 1:** Add under `booking.book`: `pickDay`, `noSlots`, `chooseSlot`, `slotUnavailable`. Under `booking.school`: `availability`, `instructorHours`, `rename`, `delete`, `confirmDelete`, `addRange`, `removeRange`, `closed`, weekday short labels `weekday.1`..`weekday.7`. Under `booking` legend: `pendingLegend`, `confirmedLegend`.

---

## Task 10: Verify

- [ ] `pnpm test` passes. `pnpm build` (tsc) passes. Manual: set hours → student sees only valid slots, booked greyed; pending dashed in calendar; rename/delete instructor; requests on top; calendar scrolls.
