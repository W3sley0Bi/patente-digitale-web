import {
	createViewDay,
	createViewMonthGrid,
	createViewWeek,
} from "@schedule-x/calendar";
import { createCurrentTimePlugin } from "@schedule-x/current-time";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import { ScheduleXCalendar, useNextCalendarApp } from "@schedule-x/react";
import { Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import "@schedule-x/theme-default/dist/index.css";
import type { EnrolledStudent } from "@/lib/booking/api";
import { instructorColor, UNASSIGNED_COLOR } from "@/lib/booking/colors";
import type { Booking, Instructor } from "@/lib/booking/types";
import {
	AppointmentFormPopover,
	EventDetailsPopover,
} from "./AppointmentPopovers";

type Anchor = { x: number; y: number };
type PopoverState =
	| { kind: "new"; anchor: Anchor; startIso: string }
	| { kind: "event"; anchor: Anchor; bookingId: string }
	| { kind: "edit"; anchor: Anchor; bookingId: string }
	| null;

// The school operates in Italy; pin the grid + now-line to Rome time so it is
// correct regardless of the viewer's machine timezone.
const TZ = "Europe/Rome";

/** Current hour in Rome (0-23). */
function romeHour(): number {
	return Number(
		new Intl.DateTimeFormat("en-GB", {
			hour: "2-digit",
			hour12: false,
			timeZone: TZ,
		}).format(new Date()),
	);
}
const GRID_HEIGHT = 2400; // px for the full 24h grid → 100px/hour

// Schedule-X v4 events use Temporal.ZonedDateTime (global, polyfilled in main.tsx).
const toZoned = (iso: string) =>
	Temporal.Instant.from(iso).toZonedDateTimeISO(TZ);

const PENDING = "oklch(0.70 0.15 75)"; // amber

type SxEvent = {
	id: string;
	title: string;
	color: string;
	pending: boolean;
	start: unknown;
	end: unknown;
};

/** Outlook-style event: confirmed = solid brand colour, pending = dashed + translucent. */
function EventBox({ calendarEvent }: { calendarEvent: SxEvent }) {
	const { color, pending, title } = calendarEvent;
	return (
		<div
			className="flex h-full w-full flex-col gap-0.5 overflow-hidden rounded-[0.5rem] px-2 py-1 text-[0.7rem] font-semibold leading-tight"
			style={
				pending
					? {
							color,
							backgroundColor: `color-mix(in oklch, ${color} 14%, transparent)`,
							border: `1.5px dashed ${color}`,
						}
					: {
							color: "#fff",
							backgroundColor: color,
							boxShadow: "0 1px 2px 0 oklch(0.5 0.06 160 / 0.18)",
						}
			}
			title={title}
		>
			<span className="truncate">{title}</span>
		</div>
	);
}

export function LessonsCalendar({
	bookings,
	instructors,
	schoolId,
	durationMin,
	students,
	onChanged,
}: {
	bookings: Booking[];
	instructors: Instructor[];
	schoolId: string;
	durationMin: number;
	students: EnrolledStudent[];
	/** Refresh after a popover creates / cancels / confirms a lesson. */
	onChanged: () => void;
}) {
	const { t, i18n } = useTranslation();
	// schedule-x locale (day/month names, view labels) follows the app language.
	const sxLocale = i18n.language.startsWith("it")
		? "it-IT"
		: i18n.language.startsWith("ar")
			? "ar-EG"
			: "en-US";
	const [expanded, setExpanded] = useState(false);
	const [popover, setPopover] = useState<PopoverState>(null);
	const lastPointer = useRef({ x: 0, y: 0 });
	const wrapperRef = useRef<HTMLDivElement>(null);
	const didScrollRef = useRef(false);
	const eventsService = useMemo(() => createEventsServicePlugin(), []);
	const currentTime = useMemo(() => createCurrentTimePlugin(), []);
	// Stable reference: ScheduleXCalendar re-renders the whole grid (resetting scroll)
	// whenever this prop's identity changes, so it must never be a fresh literal.
	const customComponents = useMemo(
		() => ({ timeGridEvent: EventBox, monthGridEvent: EventBox }),
		[],
	);

	const colorFor = useMemo(() => {
		const map = new Map<string, string>();
		instructors.forEach((ins, i) => {
			map.set(ins.id, instructorColor(ins.color, i));
		});
		return (id: string | null) => (id && map.get(id)) || UNASSIGNED_COLOR;
	}, [instructors]);

	const events = useMemo<SxEvent[]>(
		() =>
			bookings
				.filter((b) => b.status === "confirmed" || b.status === "pending")
				.map((b) => {
					const pending = b.status === "pending";
					const name =
						instructors.find((i) => i.id === b.instructor_id)?.name ??
						t("booking.school.unassigned");
					return {
						id: b.id,
						title: name,
						color: pending ? PENDING : colorFor(b.instructor_id),
						pending,
						start: toZoned(b.starts_at),
						end: toZoned(b.ends_at),
					};
				}),
		[bookings, instructors, colorFor, t],
	);

	const weekView = useMemo(() => createViewWeek(), []);
	const calendar = useNextCalendarApp(
		{
			views: [weekView, createViewDay(), createViewMonthGrid()],
			defaultView: weekView.name,
			events: events as never,
			locale: sxLocale,
			timezone: TZ,
			weekOptions: { gridHeight: GRID_HEIGHT },
			callbacks: {
				// Keep week + month available on phones too. By default schedule-x
				// drops every view whose hasSmallScreenCompat is false (week and
				// month-grid) below ~700px and force-switches to day. Pinning this to
				// false keeps all three views in the switcher at every width; the grid
				// itself stays usable via its own scroll.
				isCalendarSmall: () => false,
				onClickDateTime: (dateTime: Temporal.ZonedDateTime) => {
					// snap the clicked instant down to the nearest 15 minutes
					const snapped = dateTime.round({
						smallestUnit: "minute",
						roundingIncrement: 15,
						roundingMode: "floor",
					});
					setPopover({
						kind: "new",
						anchor: { ...lastPointer.current },
						startIso: snapped.toInstant().toString(),
					});
				},
				onEventClick: (calendarEvent: { id: string }) => {
					setPopover({
						kind: "event",
						anchor: { ...lastPointer.current },
						bookingId: calendarEvent.id,
					});
				},
			},
		} as never,
		[eventsService, currentTime, sxLocale],
	);

	useEffect(() => {
		if (calendar) eventsService.set(events as never);
	}, [calendar, events, eventsService]);

	// Scroll the red now-line into view ONCE after the grid mounts (no continuous
	// autoscroll). The schedule-x DOM appears a tick later, so retry a few frames.
	useEffect(() => {
		if (!calendar || didScrollRef.current) return;
		let raf = 0;
		let tries = 0;
		const tick = () => {
			const root = wrapperRef.current;
			const container = root?.querySelector<HTMLElement>(".sx__view-container");
			const nowLine = root?.querySelector<HTMLElement>(
				".sx__current-time-indicator",
			);
			if (container && nowLine) {
				const offset =
					nowLine.getBoundingClientRect().top -
					container.getBoundingClientRect().top;
				// place the red line ~1/3 down from the top of the visible grid
				container.scrollTop += offset - container.clientHeight / 3;
				didScrollRef.current = true;
				return;
			}
			// fallback: approximate by hour if the indicator isn't mounted yet
			if (container && tries > 12) {
				container.scrollTop = Math.max(0, romeHour() - 1) * (GRID_HEIGHT / 24);
				didScrollRef.current = true;
				return;
			}
			if (tries++ < 20) raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [calendar]);

	// Lock body scroll + close on Escape while expanded.
	useEffect(() => {
		if (!expanded) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setExpanded(false);
		};
		window.addEventListener("keydown", onKey);
		return () => {
			document.body.style.overflow = prev;
			window.removeEventListener("keydown", onKey);
		};
	}, [expanded]);

	const pendingCount = bookings.filter((b) => b.status === "pending").length;

	// Map schedule-x's Material-ish theme onto brand tokens.
	const sxTheme = {
		"--sx-color-background": "var(--color-bg-raised)",
		"--sx-color-surface": "var(--color-bg-raised)",
		"--sx-color-surface-container": "var(--color-bg)",
		"--sx-color-surface-container-low": "var(--color-bg)",
		"--sx-color-surface-container-high": "var(--color-bg-sunken)",
		"--sx-color-on-background": "var(--color-ink)",
		"--sx-color-on-surface": "var(--color-ink)",
		"--sx-internal-color-text": "var(--color-ink)",
		"--sx-color-primary": "var(--color-brand)",
		"--sx-color-on-primary": "#fff",
		"--sx-color-primary-container": "var(--color-brand-soft)",
		"--sx-color-on-primary-container": "var(--color-brand-ink)",
		"--sx-color-outline": "var(--color-line)",
		"--sx-color-outline-variant": "var(--color-line)",
		"--sx-border": "1px solid var(--color-line)",
		"--sx-internal-color-light-gray": "var(--color-bg-sunken)",
		"--sx-rounding-small": "0.5rem",
		"--sx-rounding-extra-small": "0.375rem",
		fontFamily: "inherit",
	} as React.CSSProperties;

	return (
		<section
			className={
				expanded
					? "fixed inset-0 z-[100] flex flex-col bg-bg-raised"
					: "overflow-hidden rounded-[1.5rem] border border-line bg-bg-raised shadow-[0_6px_18px_-4px_oklch(0.55_0.05_160/0.10)]"
			}
		>
			<header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
				<h2 className="text-md font-extrabold tracking-tight text-ink">
					{t("booking.school.calendar")}
				</h2>
				<div className="flex items-center gap-4 text-xs font-medium text-ink-muted">
					<span className="flex items-center gap-1.5">
						<span className="h-2.5 w-2.5 rounded-full bg-brand" />
						{t("booking.school.legendConfirmed")}
					</span>
					<span className="flex items-center gap-1.5">
						<span
							className="h-2.5 w-2.5 rounded-full border-[1.5px] border-dashed"
							style={{ borderColor: PENDING }}
						/>
						{t("booking.school.legendPending")}
						{pendingCount > 0 && (
							<span className="rounded-full bg-warning/20 px-1.5 py-0.5 text-[0.65rem] font-bold text-ink">
								{pendingCount}
							</span>
						)}
					</span>
					<button
						type="button"
						onClick={() => setExpanded((v) => !v)}
						aria-label={t(
							expanded ? "booking.school.collapse" : "booking.school.expand",
						)}
						title={t(
							expanded ? "booking.school.collapse" : "booking.school.expand",
						)}
						className="grid h-8 w-8 place-items-center rounded-md border border-line text-ink-muted transition-colors hover:border-brand hover:text-brand"
					>
						{expanded ? (
							<Minimize2 size={15} aria-hidden />
						) : (
							<Maximize2 size={15} aria-hidden />
						)}
					</button>
				</div>
			</header>
			<div
				ref={wrapperRef}
				onPointerDownCapture={(e) => {
					lastPointer.current = { x: e.clientX, y: e.clientY };
				}}
				className={
					expanded
						? "sx-fill min-h-0 flex-1 px-2 pb-2"
						: "sx-fill h-[640px] px-2 pb-2"
				}
				style={sxTheme}
			>
				<ScheduleXCalendar
					calendarApp={calendar}
					customComponents={customComponents}
				/>
			</div>

			{popover?.kind === "new" && (
				<AppointmentFormPopover
					anchor={popover.anchor}
					schoolId={schoolId}
					startIso={popover.startIso}
					instructors={instructors.filter((i) => i.active)}
					students={students}
					onClose={() => setPopover(null)}
					onSaved={() => {
						setPopover(null);
						onChanged();
					}}
				/>
			)}
			{popover?.kind === "edit" &&
				(() => {
					const b = bookings.find((x) => x.id === popover.bookingId);
					if (!b) return null;
					return (
						<AppointmentFormPopover
							anchor={popover.anchor}
							schoolId={schoolId}
							startIso={b.starts_at}
							bookingId={b.id}
							initialStudentId={b.student_id}
							initialInstructorId={b.instructor_id ?? ""}
							instructors={instructors.filter((i) => i.active)}
							students={students}
							onClose={() => setPopover(null)}
							onSaved={() => {
								setPopover(null);
								onChanged();
							}}
						/>
					);
				})()}
			{popover?.kind === "event" &&
				(() => {
					const b = bookings.find((x) => x.id === popover.bookingId);
					if (!b) return null;
					const idx = instructors.findIndex((i) => i.id === b.instructor_id);
					return (
						<EventDetailsPopover
							anchor={popover.anchor}
							booking={b}
							instructorIndex={idx < 0 ? 0 : idx}
							instructors={instructors}
							students={students}
							durationMin={durationMin}
							onClose={() => setPopover(null)}
							onChanged={() => {
								setPopover(null);
								onChanged();
							}}
							onEdit={() =>
								setPopover({
									kind: "edit",
									anchor: popover.anchor,
									bookingId: b.id,
								})
							}
						/>
					);
				})()}
		</section>
	);
}
