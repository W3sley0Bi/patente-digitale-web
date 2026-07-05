-- ════════════════════════════════════════════════════════════════════════════
-- 025_students_table.sql — replace enrollments with a central students table.
-- See docs/superpowers/specs/2026-07-05-students-table-rework-design.md
--   • students: one row per student↔school relationship; auth_user_id NULLABLE
--     so schools can add students who never signed up ("unclaimed").
--   • bookings.student_id repointed auth.users(id) → students(id), on delete restrict.
--   • Claim: token RPC (deterministic) or email match inside request_enrollment.
--   • Email resolution rule: claimed → auth.users.email; unclaimed → students.email.
-- ════════════════════════════════════════════════════════════════════════════

-- ──── 1. students table ────

create table public.students (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references public.driving_schools(id) on delete cascade,
  auth_user_id  uuid references auth.users(id) on delete set null,
  full_name     text,
  email         text,   -- contact email for UNCLAIMED rows only; NULL once claimed
  phone         text,
  licence_code  text,
  status        text not null default 'pending'
                check (status in ('pending','active','rejected','left')),
  source        text not null default 'self'
                check (source in ('self','manual')),
  claim_token   uuid not null default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  decided_at    timestamptz,
  -- unclaimed students must be reachable by email
  constraint students_unclaimed_needs_email
    check (auth_user_id is not null or email is not null)
);

comment on column public.students.email is
  'Contact email while unclaimed. NULL once auth_user_id is set: claimed rows resolve email from auth.users.';

-- claimed: one row per (school, auth user). Partial: NULLs (manual rows) unlimited.
create unique index students_school_authuser_uq
  on public.students (school_id, auth_user_id) where auth_user_id is not null;

-- one ACTIVE enrollment per auth user across all schools (kept from enrollments)
create unique index students_one_active_per_user
  on public.students (auth_user_id) where status = 'active' and auth_user_id is not null;

-- no duplicate manual adds of the same email within one school
create unique index students_school_email_unclaimed_uq
  on public.students (school_id, lower(email)) where auth_user_id is null;

create index students_school_status_idx on public.students (school_id, status);
create index students_authuser_idx      on public.students (auth_user_id);
create index students_claim_token_idx   on public.students (claim_token);

-- ──── 2. backfill from enrollments (reuse ids → trivial bookings remap) ────

insert into public.students
  (id, school_id, auth_user_id, full_name, email, phone, licence_code,
   status, source, created_at, decided_at)
select e.id, e.school_id, e.student_id, p.full_name, null, p.phone,
       e.licence_code, e.status, 'self', e.created_at, e.decided_at
from public.enrollments e
left join public.profiles p on p.id = e.student_id;

-- ──── 3. repoint bookings.student_id ────

alter table public.bookings drop constraint bookings_student_id_fkey;

update public.bookings b
  set student_id = s.id
  from public.students s
  where s.school_id = b.school_id and s.auth_user_id = b.student_id;

-- every booking must have found a students row (enrollments are never deleted,
-- so an orphan here means the backfill is wrong — abort loudly)
do $$
declare v_orphans int;
begin
  select count(*) into v_orphans
  from public.bookings b
  where not exists (select 1 from public.students s where s.id = b.student_id);
  if v_orphans > 0 then
    raise exception 'bookings remap left % orphan rows', v_orphans;
  end if;
end $$;

-- soft removal (status=left) is the normal path; deleting a student with
-- bookings is blocked so drive history survives
alter table public.bookings
  add constraint bookings_student_id_fkey
  foreign key (student_id) references public.students(id) on delete restrict;

-- ──── 4. RLS ────

alter table public.students enable row level security;

create policy "students_self_read" on public.students
  for select using (auth.uid() = auth_user_id);
create policy "students_owner_read" on public.students
  for select using (
    auth.uid() = (select user_id from public.driving_schools where id = school_id)
  );
create policy "students_admin_all" on public.students
  for all using ((select role from public.profiles where id = auth.uid()) = 'admin');

-- bookings: student-side read now goes through students
drop policy "bookings_student_read" on public.bookings;
create policy "bookings_student_read" on public.bookings
  for select using (
    exists (select 1 from public.students s
            where s.id = bookings.student_id and s.auth_user_id = auth.uid())
  );

-- instructors: enrolled-students read now goes through students
drop policy "instructors_enrolled_read" on public.instructors;
create policy "instructors_enrolled_read" on public.instructors
  for select using (
    exists (select 1 from public.students s
            where s.school_id = instructors.school_id
              and s.auth_user_id = auth.uid()
              and s.status = 'active')
  );
