-- Expose student email to the school's Students tab.
-- Email lives only in auth.users (private). list_enrolled_students is
-- SECURITY DEFINER and already gates access to the school owner / admin,
-- so it can safely read auth.users and return the email. No duplication.

-- Return-type change -> must drop and recreate.
drop function if exists public.list_enrolled_students(uuid);

create function public.list_enrolled_students(p_school_id uuid)
returns table(student_id uuid, full_name text, email text, licence_code text)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() <> (select user_id from public.driving_schools where id = p_school_id)
     and (select role from public.profiles where id = auth.uid()) <> 'admin' then
    raise exception 'forbidden';
  end if;
  return query
    select e.student_id, p.full_name, u.email::text, e.licence_code
    from public.enrollments e
    join public.profiles p on p.id = e.student_id
    join auth.users u on u.id = e.student_id
    where e.school_id = p_school_id and e.status = 'active'
    order by p.full_name nulls last;
end;
$$;

grant execute on function public.list_enrolled_students(uuid) to authenticated;
