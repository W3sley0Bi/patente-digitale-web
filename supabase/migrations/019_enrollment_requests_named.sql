-- Pending enrollment requests, resolved with the student's name + email so the
-- school sees who is asking to enroll (not a truncated uuid). Email/profile live
-- behind RLS the school can't read directly, so this SECURITY DEFINER RPC joins
-- them server-side, gated to the school owner / admin.
create or replace function public.list_enrollment_requests(p_school_id uuid)
returns table(
  enrollment_id uuid,
  student_id uuid,
  full_name text,
  email text,
  licence_code text,
  created_at timestamptz
)
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() <> (select user_id from public.driving_schools where id = p_school_id)
     and (select role from public.profiles where id = auth.uid()) <> 'admin' then
    raise exception 'forbidden';
  end if;
  return query
    select e.id, e.student_id, p.full_name, u.email::text, e.licence_code, e.created_at
    from public.enrollments e
    join public.profiles p on p.id = e.student_id
    join auth.users u on u.id = e.student_id
    where e.school_id = p_school_id and e.status = 'pending'
    order by e.created_at desc;
end;
$$;

grant execute on function public.list_enrollment_requests(uuid) to authenticated;
