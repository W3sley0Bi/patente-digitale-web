-- 027: claim_student_record must be idempotent for the same caller.
-- The auth_user_id IS NULL predicate already blocks re-claims by anyone else,
-- so rotating claim_token on success added no extra safety — it only broke
-- retries: an auth-state re-render (or user reopening the confirmation link)
-- re-mounts the claim page and re-invokes this RPC with the same token, which
-- then reported claim_not_found even though the first call already succeeded.
-- Keep the token stable and treat "already claimed by me" as success.

create or replace function public.claim_student_record(p_token uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_id uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if (select role from public.profiles where id = v_uid) is distinct from 'student' then
    raise exception 'role_must_be_student';
  end if;

  update public.students
    set auth_user_id = v_uid,
        email        = null
    where claim_token = p_token and auth_user_id is null and status = 'active'
    returning id into v_id;

  if v_id is null then
    select id into v_id
      from public.students
      where claim_token = p_token and auth_user_id = v_uid and status = 'active';
    if v_id is null then raise exception 'claim_not_found'; end if;
  end if;

  return v_id;
exception when unique_violation then
  declare v_constraint text;
  begin
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint = 'students_school_authuser_uq' then
      -- the caller already has a row at this school
      raise exception 'already_enrolled_at_school';
    end if;
    -- students_one_active_per_user: active at another school
    raise exception 'student_active_elsewhere';
  end;
end;
$$;
revoke execute on function public.claim_student_record(uuid) from public, anon;
grant execute on function public.claim_student_record(uuid) to authenticated;
