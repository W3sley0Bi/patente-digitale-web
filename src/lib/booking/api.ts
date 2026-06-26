import { supabase } from "@/lib/supabase";
import type { Booking, Enrollment, Instructor } from "./types";

// ── reads ──
export async function listSchoolBookings(schoolId: string): Promise<Booking[]> {
  const { data, error } = await supabase.from("bookings")
    .select("*").eq("school_id", schoolId).order("starts_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Booking[];
}
export async function listMyBookings(): Promise<Booking[]> {
  const { data, error } = await supabase.from("bookings")
    .select("*").order("starts_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Booking[];
}
export async function listInstructors(schoolId: string): Promise<Instructor[]> {
  const { data, error } = await supabase.from("instructors")
    .select("*").eq("school_id", schoolId).order("name");
  if (error) throw error;
  return (data ?? []) as Instructor[];
}
export async function listSchoolEnrollments(schoolId: string): Promise<Enrollment[]> {
  const { data, error } = await supabase.from("enrollments")
    .select("*").eq("school_id", schoolId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Enrollment[];
}
export async function getMyEnrollment(): Promise<Enrollment | null> {
  const { data, error } = await supabase.from("enrollments")
    .select("*").in("status", ["pending", "active"]).limit(1).maybeSingle();
  if (error) throw error;
  return (data as Enrollment) ?? null;
}

// ── instructor CRUD (RLS-guarded direct writes) ──
export async function addInstructor(schoolId: string, name: string): Promise<void> {
  const { error } = await supabase.from("instructors").insert({ school_id: schoolId, name });
  if (error) throw error;
}
export async function setInstructorActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from("instructors").update({ active }).eq("id", id);
  if (error) throw error;
}

// ── service settings (RLS-guarded; owner policy on driving_schools) ──
export async function setServiceSettings(schoolId: string, durationMin: number, enabled: boolean): Promise<void> {
  const { error } = await supabase.from("driving_schools")
    .update({ lesson_duration_min: durationMin, booking_enabled: enabled }).eq("id", schoolId);
  if (error) throw error;
}

// ── notifications (best-effort, never blocks the user action) ──
async function notify(event: string, to: string | null | undefined, body?: string): Promise<void> {
  if (!to) return;
  try {
    await supabase.functions.invoke("notify", { body: { event, to, body } });
  } catch {
    /* email is best-effort */
  }
}

// ── RPC mutations (throw on error; caller maps .message to i18n) ──
async function rpc(fn: string, args: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data;
}

export const requestEnrollment = async (schoolId: string, licence?: string, schoolEmail?: string) => {
  const id = await rpc("request_enrollment", { p_school_id: schoolId, p_licence_code: licence ?? null });
  await notify("enrollment_requested", schoolEmail);
  return id;
};
export const approveEnrollment = async (id: string, studentEmail?: string) => {
  await rpc("approve_enrollment", { p_enrollment_id: id });
  await notify("enrollment_approved", studentEmail);
};
export const rejectEnrollment = (id: string) => rpc("reject_enrollment", { p_enrollment_id: id });

export const requestBooking = async (schoolId: string, startsAt: string, schoolEmail?: string) => {
  const id = await rpc("request_booking", { p_school_id: schoolId, p_starts_at: startsAt });
  await notify("booking_requested", schoolEmail);
  return id;
};
export const confirmBooking = async (id: string, instructorId: string, startsAt?: string, studentEmail?: string) => {
  await rpc("confirm_booking", { p_booking_id: id, p_instructor_id: instructorId, p_starts_at: startsAt ?? null });
  await notify("booking_confirmed", studentEmail);
};
export const declineBooking = async (id: string, reason?: string, studentEmail?: string) => {
  await rpc("decline_booking", { p_booking_id: id, p_reason: reason ?? null });
  await notify("booking_declined", studentEmail);
};
export const cancelBooking = async (id: string, reason?: string, otherEmail?: string) => {
  await rpc("cancel_booking", { p_booking_id: id, p_reason: reason ?? null });
  await notify("booking_cancelled", otherEmail);
};
