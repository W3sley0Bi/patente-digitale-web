import { Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
	cancelBooking,
	confirmBooking,
	createBookingAsSchool,
	declineBooking,
	type EnrolledStudent,
	updateBookingAsSchool,
} from "@/lib/booking/api";
import { instructorColor } from "@/lib/booking/colors";
import type { Booking, Instructor } from "@/lib/booking/types";
import { CalendarPopover } from "./CalendarPopover";

const TZ = "Europe/Rome";
const pad = (n: number) => String(n).padStart(2, "0");

const field =
	"mt-1 block w-full rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm text-ink focus:border-brand focus:outline-none";

const errorMap = (
	t: (k: string) => string,
	code: string,
	fallback = "booking.book.error",
): string =>
	({
		instructor_busy: t("booking.school.instructorBusy"),
		instructor_unavailable: t("booking.school.instructorUnavailable"),
		outside_hours: t("booking.school.outsideHours"),
		student_not_enrolled: t("booking.school.studentNotEnrolled"),
		booking_disabled: t("booking.book.disabled"),
		booking_not_pending: t("booking.book.error"),
	})[code] ?? t(fallback);

function fmtRange(startIso: string, durationMin: number, lang: string): string {
	const start = new Date(startIso);
	const end = new Date(start.getTime() + durationMin * 60000);
	const day = start.toLocaleDateString(lang, {
		weekday: "short",
		day: "2-digit",
		month: "short",
		timeZone: TZ,
	});
	const ht = (d: Date) =>
		d.toLocaleTimeString(lang, {
			hour: "2-digit",
			minute: "2-digit",
			timeZone: TZ,
		});
	return `${day} · ${ht(start)}–${ht(end)}`;
}

/**
 * Reusable appointment form popover, anchored at the clicked slot.
 * - create mode (no `bookingId`): inserts a new lesson.
 * - edit mode (`bookingId` set): updates the existing lesson, prefilled.
 */
export function AppointmentFormPopover({
	anchor,
	schoolId,
	startIso,
	bookingId,
	initialStudentId = "",
	initialInstructorId = "",
	instructors,
	students,
	onClose,
	onSaved,
}: {
	anchor: { x: number; y: number };
	schoolId: string;
	startIso: string;
	bookingId?: string;
	initialStudentId?: string;
	initialInstructorId?: string;
	instructors: Instructor[];
	students: EnrolledStudent[];
	onClose: () => void;
	onSaved: () => void;
}) {
	const { t } = useTranslation();
	const editing = Boolean(bookingId);
	const clicked = Temporal.Instant.from(startIso).toZonedDateTimeISO(TZ);
	const [date, setDate] = useState(clicked.toPlainDate().toString());
	const [time, setTime] = useState(
		`${pad(clicked.hour)}:${pad(clicked.minute)}`,
	);
	const [studentId, setStudentId] = useState(initialStudentId);
	const [instructorId, setInstructorId] = useState(initialInstructorId);
	const [busy, setBusy] = useState(false);
	const [err, setErr] = useState<string | null>(null);

	const startsAtIso = (() => {
		try {
			return Temporal.PlainDateTime.from(`${date}T${time}:00`)
				.toZonedDateTime(TZ)
				.toInstant()
				.toString();
		} catch {
			return startIso;
		}
	})();

	const save = async () => {
		if (!studentId || !instructorId) {
			setErr(t("booking.school.selectStudentInstructor"));
			return;
		}
		setBusy(true);
		setErr(null);
		try {
			if (bookingId) {
				await updateBookingAsSchool(
					bookingId,
					studentId,
					instructorId,
					startsAtIso,
				);
			} else {
				await createBookingAsSchool(
					schoolId,
					studentId,
					instructorId,
					startsAtIso,
				);
			}
			onSaved();
		} catch (e) {
			setErr(errorMap(t, (e as Error).message));
		} finally {
			setBusy(false);
		}
	};

	return (
		<CalendarPopover anchor={anchor} onClose={onClose}>
			<div className="flex items-start justify-between gap-2">
				<h2 className="text-sm font-bold tracking-tight text-ink">
					{editing
						? t("booking.school.editAppointment")
						: t("booking.school.newAppointment")}
				</h2>
				<button
					type="button"
					onClick={onClose}
					aria-label={t("booking.school.cancel")}
					className="grid h-7 w-7 place-items-center rounded-md text-ink-muted hover:bg-bg-sunken"
				>
					<X size={15} aria-hidden />
				</button>
			</div>

			<div className="mt-3 space-y-3">
				<div className="flex gap-2">
					<label className="block flex-1 text-xs font-medium text-ink-muted">
						{t("booking.book.date")}
						<input
							type="date"
							value={date}
							onChange={(e) => setDate(e.target.value)}
							className={field}
						/>
					</label>
					<label className="block w-24 text-xs font-medium text-ink-muted">
						{t("booking.book.time")}
						<input
							type="time"
							step={900}
							value={time}
							onChange={(e) => setTime(e.target.value)}
							className={field}
						/>
					</label>
				</div>
				<label className="block text-xs font-medium text-ink-muted">
					{t("booking.school.student")}
					<select
						value={studentId}
						onChange={(e) => setStudentId(e.target.value)}
						className={field}
					>
						<option value="">{t("booking.school.selectStudent")}</option>
						{students.map((s) => (
							<option key={s.student_id} value={s.student_id}>
								{s.full_name ?? s.student_id.slice(0, 8)}
								{s.licence_code ? ` · ${s.licence_code}` : ""}
							</option>
						))}
					</select>
				</label>
				<label className="block text-xs font-medium text-ink-muted">
					{t("booking.school.instructor")}
					<select
						value={instructorId}
						onChange={(e) => setInstructorId(e.target.value)}
						className={field}
					>
						<option value="">{t("booking.school.assignInstructor")}</option>
						{instructors.map((i) => (
							<option key={i.id} value={i.id}>
								{i.name}
							</option>
						))}
					</select>
				</label>
			</div>

			{err && <p className="mt-3 text-xs text-accent-ink">{err}</p>}

			<div className="mt-4 flex justify-end gap-2">
				<button
					type="button"
					onClick={onClose}
					className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink-muted hover:text-ink"
				>
					{t("booking.school.cancel")}
				</button>
				<button
					type="button"
					onClick={save}
					disabled={busy}
					className="rounded-md bg-brand px-3 py-1.5 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-50"
				>
					{editing ? t("booking.school.save") : t("booking.school.create")}
				</button>
			</div>
		</CalendarPopover>
	);
}

/** Details + actions for an existing lesson. */
export function EventDetailsPopover({
	anchor,
	booking,
	instructorIndex,
	instructors,
	students,
	durationMin,
	onClose,
	onChanged,
	onEdit,
}: {
	anchor: { x: number; y: number };
	booking: Booking;
	instructorIndex: number;
	instructors: Instructor[];
	students: EnrolledStudent[];
	durationMin: number;
	onClose: () => void;
	onChanged: () => void;
	onEdit: () => void;
}) {
	const { t, i18n } = useTranslation();
	const pending = booking.status === "pending";
	const ins = instructors.find((i) => i.id === booking.instructor_id) ?? null;
	const student = students.find((s) => s.student_id === booking.student_id);
	const studentName = student?.full_name ?? booking.student_id.slice(0, 8);
	const dotColor = ins
		? instructorColor(ins.color, instructorIndex)
		: "oklch(0.70 0.15 75)"; // pending amber when unassigned
	const [instructorId, setInstructorId] = useState(booking.instructor_id ?? "");
	const [busy, setBusy] = useState(false);
	const [err, setErr] = useState<string | null>(null);

	const run = async (fn: () => Promise<void>) => {
		setBusy(true);
		setErr(null);
		try {
			await fn();
			onChanged();
		} catch (e) {
			setErr(errorMap(t, (e as Error).message));
			setBusy(false);
		}
	};
	const doConfirm = () => {
		if (!instructorId) {
			setErr(t("booking.school.assignInstructor"));
			return;
		}
		run(() => confirmBooking(booking.id, instructorId));
	};
	const doDecline = () => run(() => declineBooking(booking.id));
	const doCancel = () => run(() => cancelBooking(booking.id));

	return (
		<CalendarPopover anchor={anchor} onClose={onClose}>
			<div className="flex items-start justify-between gap-2">
				<div className="flex min-w-0 items-center gap-2">
					<span
						className="h-3 w-3 shrink-0 rounded-full"
						style={{ backgroundColor: dotColor }}
					/>
					<h2 className="truncate text-sm font-bold tracking-tight text-ink">
						{studentName}
					</h2>
				</div>
				<button
					type="button"
					onClick={onClose}
					aria-label={t("booking.school.cancel")}
					className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink-muted hover:bg-bg-sunken"
				>
					<X size={15} aria-hidden />
				</button>
			</div>

			<dl className="mt-3 space-y-1.5 text-xs">
				<div className="flex justify-between gap-3">
					<dt className="text-ink-faint">{t("booking.school.instructor")}</dt>
					<dd className="font-medium text-ink">
						{ins?.name ?? t("booking.school.unassigned")}
					</dd>
				</div>
				<div className="flex justify-between gap-3">
					<dt className="text-ink-faint">{t("booking.book.date")}</dt>
					<dd className="font-medium text-ink">
						{fmtRange(booking.starts_at, durationMin, i18n.language)}
					</dd>
				</div>
				<div className="flex justify-between gap-3">
					<dt className="text-ink-faint">{t("booking.school.statusLabel")}</dt>
					<dd
						className={`font-semibold ${pending ? "text-warning" : "text-brand-ink"}`}
					>
						{pending
							? t("booking.school.statusPending")
							: t("booking.school.statusConfirmed")}
					</dd>
				</div>
			</dl>

			{/* pending → assign + confirm/decline; confirmed → cancel */}
			{pending ? (
				<div className="mt-3 space-y-3">
					<label className="block text-xs font-medium text-ink-muted">
						{t("booking.school.assignInstructor")}
						<select
							value={instructorId}
							onChange={(e) => setInstructorId(e.target.value)}
							className={field}
						>
							<option value="">{t("booking.school.assignInstructor")}</option>
							{instructors.map((i) => (
								<option key={i.id} value={i.id}>
									{i.name}
								</option>
							))}
						</select>
					</label>
					{err && <p className="text-xs text-accent-ink">{err}</p>}
					<div className="flex justify-end gap-2">
						<button
							type="button"
							onClick={doDecline}
							disabled={busy}
							className="rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink-muted hover:text-accent disabled:opacity-50"
						>
							{t("booking.school.decline")}
						</button>
						<button
							type="button"
							onClick={doConfirm}
							disabled={busy}
							className="rounded-md bg-brand px-3 py-1.5 text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-50"
						>
							{t("booking.school.confirm")}
						</button>
					</div>
				</div>
			) : (
				<div className="mt-3">
					{err && <p className="mb-2 text-xs text-accent-ink">{err}</p>}
					<div className="flex gap-2">
						<button
							type="button"
							onClick={onEdit}
							disabled={busy}
							className="flex flex-1 items-center justify-center gap-2 rounded-md border border-line px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
						>
							<Pencil size={14} aria-hidden />
							{t("booking.school.edit")}
						</button>
						<button
							type="button"
							onClick={doCancel}
							disabled={busy}
							className="flex flex-1 items-center justify-center gap-2 rounded-md border border-line px-3 py-1.5 text-sm font-medium text-accent transition-colors hover:bg-accent-soft disabled:opacity-50"
						>
							<Trash2 size={14} aria-hidden />
							{t("booking.school.cancelLesson")}
						</button>
					</div>
				</div>
			)}
		</CalendarPopover>
	);
}
