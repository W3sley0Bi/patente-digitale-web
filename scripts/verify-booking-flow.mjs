// scripts/verify-booking-flow.mjs
// End-to-end flow test through the RPCs as REAL authenticated users (exercises
// RLS + RPC authorization + the booking state machine), run against the live DB.
// Run: node scripts/verify-booking-flow.mjs
// Requires VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in .env.local.
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anon || !service) throw new Error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY");

const admin = createClient(url, service, { auth: { persistSession: false } });
const fails = [];
const ok = (m) => console.log(`  ok: ${m}`);
const bad = (m) => { fails.push(m); console.error(`  FAIL: ${m}`); };
const PW = "Test-passw0rd!";

async function makeUser(role) {
  const email = `flow-${crypto.randomUUID()}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email, password: PW, email_confirm: true, user_metadata: { role, full_name: role },
  });
  if (error) throw error;
  const client = createClient(url, anon, { auth: { persistSession: false } });
  const { error: se } = await client.auth.signInWithPassword({ email, password: PW });
  if (se) throw se;
  return { id: data.user.id, client };
}

const created = [];
async function main() {
  // owner + accepted school + instructor (service role: setup)
  const owner = await makeUser("autoscuola");
  created.push(owner.id);
  const { data: school, error: se } = await admin.from("driving_schools")
    .insert({ user_id: owner.id, place_id: `flow-${crypto.randomUUID()}`, name: "Flow School", status: "accepted", lesson_duration_min: 60, booking_enabled: true })
    .select("id").single();
  if (se) throw se;
  const { data: instr } = await admin.from("instructors").insert({ school_id: school.id, name: "Mario" }).select("id").single();
  const { data: instr2 } = await admin.from("instructors").insert({ school_id: school.id, name: "Luigi" }).select("id").single();

  const student = await makeUser("student");
  created.push(student.id);

  // 1. student requests enrollment
  const { error: e1 } = await student.client.rpc("request_enrollment", { p_school_id: school.id, p_licence_code: "B" });
  if (e1) bad(`request_enrollment: ${e1.message}`); else ok("student requested enrollment");

  // booking before approval must fail (not_enrolled)
  const { error: eEarly } = await student.client.rpc("request_booking", { p_school_id: school.id, p_starts_at: "2030-02-01T10:00:00Z" });
  if (eEarly?.message?.includes("not_enrolled")) ok("booking blocked before enrollment approved"); else bad(`expected not_enrolled, got: ${eEarly?.message ?? "no error"}`);

  // 2. owner approves enrollment
  const { data: enr } = await admin.from("enrollments").select("id").eq("school_id", school.id).eq("student_id", student.id).single();
  const { error: e2 } = await owner.client.rpc("approve_enrollment", { p_enrollment_id: enr.id });
  if (e2) bad(`approve_enrollment: ${e2.message}`); else ok("owner approved enrollment");

  // a non-owner cannot approve/confirm (authz)
  const { error: eAuthz } = await student.client.rpc("confirm_booking", { p_booking_id: enr.id, p_instructor_id: instr.id, p_starts_at: null });
  if (eAuthz) ok("non-owner cannot confirm (authz enforced)"); else bad("student was able to call confirm_booking");

  // 3. student requests a booking
  const { data: bookingId, error: e3 } = await student.client.rpc("request_booking", { p_school_id: school.id, p_starts_at: "2030-02-01T10:00:00Z" });
  if (e3) bad(`request_booking: ${e3.message}`); else ok("student requested booking");

  // 4. owner confirms with instructor
  const { error: e4 } = await owner.client.rpc("confirm_booking", { p_booking_id: bookingId, p_instructor_id: instr.id, p_starts_at: null });
  if (e4) bad(`confirm_booking: ${e4.message}`); else ok("owner confirmed booking with instructor");

  const { data: confirmed } = await admin.from("bookings").select("status, instructor_id, ends_at").eq("id", bookingId).single();
  if (confirmed.status === "confirmed" && confirmed.instructor_id === instr.id) ok("booking is confirmed + instructor assigned"); else bad(`unexpected booking state: ${JSON.stringify(confirmed)}`);
  if (confirmed.ends_at === "2030-02-01T11:00:00+00:00") ok("ends_at computed by trigger (start + 60m)"); else bad(`ends_at wrong: ${confirmed.ends_at}`);

  // 5. overlap: second confirmed booking for same instructor must fail (instructor_busy)
  const { data: b2 } = await student.client.rpc("request_booking", { p_school_id: school.id, p_starts_at: "2030-02-01T10:30:00Z" });
  const { error: eOverlap } = await owner.client.rpc("confirm_booking", { p_booking_id: b2, p_instructor_id: instr.id, p_starts_at: null });
  if (eOverlap?.message?.includes("instructor_busy")) ok("overlapping confirm rejected (instructor_busy)"); else bad(`expected instructor_busy, got: ${eOverlap?.message ?? "no error"}`);

  // ...but confirming the overlap on a DIFFERENT instructor succeeds
  const { error: eOther } = await owner.client.rpc("confirm_booking", { p_booking_id: b2, p_instructor_id: instr2.id, p_starts_at: null });
  if (eOther) bad(`confirm on free instructor: ${eOther.message}`); else ok("same slot confirmed for a different instructor");

  // 6. student cancels the first booking; slot frees
  const { error: e6 } = await student.client.rpc("cancel_booking", { p_booking_id: bookingId, p_reason: "test" });
  if (e6) bad(`cancel_booking: ${e6.message}`); else ok("student cancelled booking");
  const { data: cancelled } = await admin.from("bookings").select("status, cancelled_by").eq("id", bookingId).single();
  if (cancelled.status === "cancelled" && cancelled.cancelled_by === "student") ok("booking cancelled + cancelled_by=student"); else bad(`unexpected cancel state: ${JSON.stringify(cancelled)}`);

  // 7. RLS read isolation: a second student cannot read the first student's bookings
  const other = await makeUser("student");
  created.push(other.id);
  const { data: leaked } = await other.client.from("bookings").select("id").eq("id", bookingId);
  if (!leaked || leaked.length === 0) ok("RLS: other student cannot read someone else's booking"); else bad("RLS leak: other student read a foreign booking");

  // cleanup
  await admin.from("driving_schools").delete().eq("user_id", owner.id);
  for (const id of created) await admin.auth.admin.deleteUser(id);

  if (fails.length) { console.error(`\n${fails.length} check(s) failed.`); process.exit(1); }
  console.log("\nFull booking flow verified end-to-end.");
}
main().catch(async (e) => {
  for (const id of created) { try { await admin.auth.admin.deleteUser(id); } catch { /* ignore */ } }
  console.error(e);
  process.exit(1);
});
