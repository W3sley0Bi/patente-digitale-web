-- Let a school edit its students' editable info (name, phone, licence) without
-- touching login-critical fields (email/password live in auth.users, untouched).
-- Adds an optional phone field to profiles and a guarded RPC for school edits.

alter table public.profiles add column if not exists phone text;

-- ── School edits a student's editable profile + enrollment licence ──
-- Name/phone live in profiles; licence_code lives in the school's enrollment row.
-- Email is intentionally NOT a parameter: it is the login identity.
-- NULL params are treated as "leave unchanged" so partial edits are safe.
create or replace function public.school_update_student(
  p_school_id uuid,
  p_student_id uuid,
  p_full_name text default null,
  p_phone text default null,
  p_licence_code text default null
)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() <> (select user_id from public.driving_schools where id = p_school_id)
     and (select role from public.profiles where id = auth.uid()) <> 'admin' then
    raise exception 'forbidden';
  end if;

  -- must be a real, active enrollment at this school
  if not exists (
    select 1 from public.enrollments
    where school_id = p_school_id and student_id = p_student_id and status = 'active'
  ) then
    raise exception 'not_enrolled';
  end if;

  update public.profiles
    set full_name = coalesce(nullif(btrim(p_full_name), ''), full_name),
        phone     = case when p_phone is null then phone else nullif(btrim(p_phone), '') end
    where id = p_student_id;

  if p_licence_code is not null then
    update public.enrollments
      set licence_code = nullif(btrim(p_licence_code), '')
      where school_id = p_school_id and student_id = p_student_id;
  end if;
end;
$$;

grant execute on function public.school_update_student(uuid, uuid, text, text, text) to authenticated;

-- ── Refresh list_enrolled_students to also return phone ──
drop function if exists public.list_enrolled_students(uuid);

create function public.list_enrolled_students(p_school_id uuid)
returns table(student_id uuid, full_name text, email text, phone text, licence_code text)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() <> (select user_id from public.driving_schools where id = p_school_id)
     and (select role from public.profiles where id = auth.uid()) <> 'admin' then
    raise exception 'forbidden';
  end if;
  return query
    select e.student_id, p.full_name, u.email::text, p.phone, e.licence_code
    from public.enrollments e
    join public.profiles p on p.id = e.student_id
    join auth.users u on u.id = e.student_id
    where e.school_id = p_school_id and e.status = 'active'
    order by p.full_name nulls last;
end;
$$;

grant execute on function public.list_enrolled_students(uuid) to authenticated;
