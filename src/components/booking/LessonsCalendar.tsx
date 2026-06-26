import {
	createViewDay,
	createViewMonthGrid,
	createViewWeek,
} from "@schedule-x/calendar";
import { createEventsServicePlugin } from "@schedule-x/events-service";
import { ScheduleXCalendar, useNextCalendarApp } from "@schedule-x/react";
import { useEffect, useMemo } from "react";
import "@schedule-x/theme-default/dist/index.css";
import type { Booking, Instructor } from "@/lib/booking/types";

// Schedule-X v4 events use Temporal.ZonedDateTime (global, polyfilled in main.tsx).
const TZ = Temporal.Now.timeZoneId();
const toZoned = (iso: string) =>
	Temporal.Instant.from(iso).toZonedDateTimeISO(TZ);

const PALETTE = [
	"#1c7c54",
	"#2563eb",
	"#d97706",
	"#9333ea",
	"#dc2626",
	"#0891b2",
	"#db2777",
	"#65a30d",
];
const UNASSIGNED = "unassigned";
const PENDING = "pending";

interface CalendarColor {
	colorName: string;
	lightColors: { main: string; container: string; onContainer: string };
	darkColors: { main: string; container: string; onContainer: string };
}

type SxEvent = {
	id: string;
	title: string;
	calendarId: string;
	start: unknown;
	end: unknown;
};

/** Outlook-style event renderer: confirmed = solid instructor colour, pending = dashed + translucent. */
function makeEventComponent(colorOf: (calendarId: string) => string) {
	return function EventBox({ calendarEvent }: { calendarEvent: SxEvent }) {
		const pending = calendarEvent.calendarId === PENDING;
		const color = colorOf(calendarEvent.calendarId);
		return (
			<div
				className="flex h-full w-full flex-col overflow-hidden rounded-md px-1.5 py-1 text-xs font-semibold leading-tight"
				style={
					pending
						? {
								color,
								backgroundColor: `${color}22`,
								border: `1.5px dashed ${color}`,
							}
						: { color: "#fff", backgroundColor: color }
				}
				title={calendarEvent.title}
			>
				<span className="truncate">{calendarEvent.title}</span>
			</div>
		);
	};
}

export function LessonsCalendar({
	bookings,
	instructors,
}: {
	bookings: Booking[];
	instructors: Instructor[];
}) {
	const eventsService = useMemo(() => createEventsServicePlugin(), []);

	const colorMap = useMemo(() => {
		const m: Record<string, string> = {
			[UNASSIGNED]: "#64748b",
			[PENDING]: "#d97706",
		};
		instructors.forEach((ins, i) => {
			m[ins.id] = PALETTE[i % PALETTE.length];
		});
		return m;
	}, [instructors]);

	const calendars = useMemo(() => {
		const map: Record<string, CalendarColor> = {};
		const add = (id: string, c: string) => {
			map[id] = {
				colorName: id,
				lightColors: { main: c, container: c, onContainer: "#ffffff" },
				darkColors: { main: c, container: c, onContainer: "#ffffff" },
			};
		};
		instructors.forEach((ins, i) => {
			add(ins.id, PALETTE[i % PALETTE.length]);
		});
		add(UNASSIGNED, "#64748b");
		add(PENDING, "#d97706");
		return map;
	}, [instructors]);

	const events = useMemo<SxEvent[]>(
		() =>
			bookings
				.filter((b) => b.status === "confirmed" || b.status === "pending")
				.map((b) => {
					const pending = b.status === "pending";
					const name =
						instructors.find((i) => i.id === b.instructor_id)?.name ?? "Guida";
					return {
						id: b.id,
						title: pending ? `⧖ ${name}` : name,
						start: toZoned(b.starts_at),
						end: toZoned(b.ends_at),
						calendarId: pending ? PENDING : (b.instructor_id ?? UNASSIGNED),
					};
				}),
		[bookings, instructors],
	);

	const weekView = useMemo(() => createViewWeek(), []);
	const calendar = useNextCalendarApp(
		{
			views: [weekView, createViewDay(), createViewMonthGrid()],
			defaultView: weekView.name,
			events: events as never,
			calendars,
			dayBoundaries: { start: "06:00", end: "22:00" },
			weekOptions: { gridHeight: 2400 },
		},
		[eventsService],
	);

	// keep events in sync as bookings/instructors load or change
	useEffect(() => {
		if (calendar) eventsService.set(events as never);
	}, [calendar, events, eventsService]);

	const EventBox = useMemo(
		() => makeEventComponent((id) => colorMap[id] ?? "#64748b"),
		[colorMap],
	);

	return (
		<div className="sx-react-calendar-wrapper h-[75vh] min-h-[600px] rounded-2xl border border-line bg-bg-raised p-2">
			<ScheduleXCalendar
				calendarApp={calendar}
				customComponents={{ timeGridEvent: EventBox, monthGridEvent: EventBox }}
			/>
		</div>
	);
}
