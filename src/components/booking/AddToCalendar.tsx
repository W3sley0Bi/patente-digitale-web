import { CalendarPlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { effectiveStatus } from "@/lib/booking/helpers";
import type { Booking } from "@/lib/booking/types";
import {
	buildIcsEvent,
	downloadIcs,
	googleCalendarUrl,
} from "@/lib/calendar/ics";

export interface AddToCalendarProps {
	booking: Booking;
	schoolName?: string;
	instructorName?: string;
	className?: string;
}

/**
 * One-tap "add this lesson" control for a single booking.
 * Renders nothing unless the effective status is confirmed or completed.
 * Google → opens the create-event URL in a new tab.
 * Apple / iCloud → downloads a single-event .ics file.
 */
export function AddToCalendar({
	booking,
	schoolName,
	instructorName,
	className,
}: AddToCalendarProps) {
	const { t } = useTranslation();

	const status = effectiveStatus(booking);
	if (status !== "confirmed" && status !== "completed") return null;

	const start = new Date(booking.starts_at);
	const end = new Date(booking.ends_at);

	// "Guida — {school}" / "Guida" when no school is known.
	const title = schoolName
		? t("calendar.event.titleWithSchool", { school: schoolName })
		: t("calendar.event.title");

	const descriptionParts: string[] = [];
	if (instructorName)
		descriptionParts.push(
			t("calendar.event.instructor", { name: instructorName }),
		);
	descriptionParts.push(t("calendar.event.bookedVia"));
	const description = descriptionParts.join("\n");

	const handleGoogle = () => {
		const url = googleCalendarUrl({
			start,
			end,
			title,
			details: description,
			location: schoolName,
		});
		window.open(url, "_blank", "noopener,noreferrer");
	};

	const handleApple = () => {
		const ics = buildIcsEvent({
			uid: `booking-${booking.id}@patentedigitale.it`,
			start,
			end,
			title,
			description,
			location: schoolName,
		});
		downloadIcs(`guida-${booking.id}`, ics);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button variant="ghost" size="sm" className={className}>
						<CalendarPlus aria-hidden="true" />
						{t("calendar.add.trigger")}
					</Button>
				}
			/>
			<DropdownMenuContent>
				<DropdownMenuItem onClick={handleGoogle}>
					{t("calendar.add.google")}
				</DropdownMenuItem>
				<DropdownMenuItem onClick={handleApple}>
					{t("calendar.add.apple")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
