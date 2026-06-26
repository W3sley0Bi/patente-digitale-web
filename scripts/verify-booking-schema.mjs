// scripts/verify-booking-schema.mjs
// Run: node scripts/verify-booking-schema.mjs
// Requires SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL in env (.env.local).
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");

const db = createClient(url, key, { auth: { persistSession: false } });
const fails = [];
const ok = (m) => console.log(`  ok: ${m}`);
const bad = (m) => { fails.push(m); console.error(`  FAIL: ${m}`); };

async function rawUser() {
  // create a throwaway auth user to satisfy FKs; returns id
  const { data, error } = await db.auth.admin.createUser({ email: `t-${crypto.randomUUID()}@example.test`, email_confirm: true });
  if (error) throw error;
  return data.user.id;
}

async function main() {
  // --- guarantee 1: instructor double-booking blocked ---
  const ownerId = await rawUser();
  await db.from("profiles").update({ role: "autoscuola", approved: true }).eq("id", ownerId);
  const { data: school, error: se } = await db.from("driving_schools")
    .insert({ user_id: ownerId, place_id: `verify-${crypto.randomUUID()}`, name: "Verify School", status: "accepted", lesson_duration_min: 60, booking_enabled: true })
    .select("id").single();
  if (se) throw se;
  const { data: instr } = await db.from("instructors").insert({ school_id: school.id, name: "Mario" }).select("id").single();
  const studentId = await rawUser();
  const base = "2030-01-01T10:00:00Z";
  const ins1 = await db.from("bookings").insert({ school_id: school.id, student_id: studentId, instructor_id: instr.id, starts_at: base, duration_min: 60, status: "confirmed" });
  if (ins1.error) bad(`first confirmed booking should insert: ${ins1.error.message}`); else ok("first confirmed booking inserts");
  const ins2 = await db.from("bookings").insert({ school_id: school.id, student_id: studentId, instructor_id: instr.id, starts_at: "2030-01-01T10:30:00Z", duration_min: 60, status: "confirmed" });
  if (ins2.error) ok("overlapping confirmed booking rejected by exclusion constraint"); else bad("overlapping confirmed booking was NOT rejected");
  const ins3 = await db.from("bookings").insert({ school_id: school.id, student_id: studentId, instructor_id: instr.id, starts_at: "2030-01-01T10:30:00Z", duration_min: 60, status: "pending" });
  if (ins3.error) bad(`pending overlap should be allowed: ${ins3.error.message}`); else ok("pending overlap allowed (only confirmed is constrained)");

  // --- guarantee 2: one active school per student ---
  const { data: school2 } = await db.from("driving_schools")
    .insert({ user_id: ownerId, place_id: `verify-${crypto.randomUUID()}`, name: "Verify School 2", status: "accepted", lesson_duration_min: 60, booking_enabled: true })
    .select("id").single();
  const e1 = await db.from("enrollments").insert({ school_id: school.id, student_id: studentId, status: "active" });
  if (e1.error) bad(`first active enrollment should insert: ${e1.error.message}`); else ok("first active enrollment inserts");
  const e2 = await db.from("enrollments").insert({ school_id: school2.id, student_id: studentId, status: "active" });
  if (e2.error) ok("second active enrollment rejected (one school per student)"); else bad("second active enrollment was NOT rejected");
  const e3 = await db.from("enrollments").insert({ school_id: school2.id, student_id: studentId, status: "pending" });
  if (e3.error) bad(`pending enrollment elsewhere should be allowed: ${e3.error.message}`); else ok("pending enrollment elsewhere allowed");

  // cleanup
  await db.from("driving_schools").delete().eq("user_id", ownerId);
  await db.auth.admin.deleteUser(ownerId);
  await db.auth.admin.deleteUser(studentId);

  if (fails.length) { console.error(`\n${fails.length} check(s) failed.`); process.exit(1); }
  console.log("\nAll booking-schema guarantees verified.");
}
main().catch((e) => { console.error(e); process.exit(1); });
