import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { confirmBooking, declineBooking, listInstructors, listSchoolBookings } from "@/lib/booking/api";
import type { Booking, Instructor } from "@/lib/booking/types";

export function RequestsInbox({ schoolId, onChange }: { schoolId: string; onChange?: () => void }) {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    const [b, i] = await Promise.all([listSchoolBookings(schoolId), listInstructors(schoolId)]);
    setBookings(b); setInstructors(i.filter((x) => x.active));
  };
  useEffect(() => { void load().catch(() => {}); }, [schoolId]);

  const pending = bookings.filter((b) => b.status === "pending");
  const confirm = async (b: Booking) => {
    setErr(null);
    const instructorId = picked[b.id];
    if (!instructorId) { setErr(t("booking.school.assignInstructor")); return; }
    try { await confirmBooking(b.id, instructorId); await load(); onChange?.(); }
    catch (e) {
      const m = (e as Error).message;
      setErr(m === "instructor_busy" ? t("booking.school.instructorBusy") : m);
    }
  };
  const decline = async (b: Booking) => { await declineBooking(b.id); await load(); onChange?.(); };

  return (
    <div className="rounded-2xl border border-line bg-bg-raised p-6">
      <h3 className="font-sans text-lg font-black text-ink">{t("booking.school.requests")}</h3>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <ul className="mt-4 divide-y divide-line">
        {pending.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
            <span className="text-ink">{new Date(b.starts_at).toLocaleString()} · {b.duration_min}m</span>
            <span className="flex items-center gap-2">
              <select value={picked[b.id] ?? ""} onChange={(e) => setPicked((p) => ({ ...p, [b.id]: e.target.value }))}
                className="rounded-md border border-line bg-bg px-2 py-1 text-xs">
                <option value="">{t("booking.school.assignInstructor")}</option>
                {instructors.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
              <button type="button" onClick={() => confirm(b)}
                className="rounded-md bg-brand px-3 py-1 text-xs font-bold text-white">{t("booking.school.confirm")}</button>
              <button type="button" onClick={() => decline(b)}
                className="rounded-md border border-line px-3 py-1 text-xs">{t("booking.school.decline")}</button>
            </span>
          </li>
        ))}
        {pending.length === 0 && <li className="py-3 text-sm text-ink-faint">{t("booking.school.noRequests")}</li>}
      </ul>
    </div>
  );
}
