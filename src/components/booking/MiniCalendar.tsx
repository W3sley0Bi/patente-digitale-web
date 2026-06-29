import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

const pad = (n: number) => String(n).padStart(2, "0");
const toISO = (y: number, m: number, d: number) =>
	`${y}-${pad(m + 1)}-${pad(d)}`;

/** Dependency-free month calendar. Monday-first, disables days before minISO. */
export function MiniCalendar({
	value,
	onChange,
	minISO,
}: {
	value: string; // selected day, YYYY-MM-DD
	onChange: (iso: string) => void;
	minISO: string; // earliest selectable day, YYYY-MM-DD
}) {
	const { t, i18n } = useTranslation();
	const sel = new Date(`${value}T00:00:00`);
	const [view, setView] = useState({ y: sel.getFullYear(), m: sel.getMonth() });

	const min = new Date(`${minISO}T00:00:00`);
	const canPrev =
		view.y > min.getFullYear() ||
		(view.y === min.getFullYear() && view.m > min.getMonth());

	// Monday-first weekday headers (2024-01-01 is a Monday)
	const weekdays = useMemo(
		() =>
			Array.from({ length: 7 }, (_, i) =>
				new Date(2024, 0, 1 + i).toLocaleDateString(i18n.language, {
					weekday: "short",
				}),
			),
		[i18n.language],
	);

	const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString(
		i18n.language,
		{ month: "long", year: "numeric" },
	);

	const cells = useMemo(() => {
		const first = new Date(view.y, view.m, 1);
		const lead = (first.getDay() + 6) % 7; // shift so Monday = 0
		const count = new Date(view.y, view.m + 1, 0).getDate();
		const arr: (number | null)[] = [];
		for (let i = 0; i < lead; i++) arr.push(null);
		for (let d = 1; d <= count; d++) arr.push(d);
		while (arr.length % 7 !== 0) arr.push(null);
		return arr;
	}, [view]);

	const shift = (delta: number) =>
		setView((v) => {
			const d = new Date(v.y, v.m + delta, 1);
			return { y: d.getFullYear(), m: d.getMonth() };
		});

	return (
		<div className="rounded-xl border border-line bg-bg p-3">
			<div className="flex items-center justify-between">
				<button
					type="button"
					onClick={() => shift(-1)}
					disabled={!canPrev}
					aria-label={t("booking.book.prevMonth")}
					className="grid h-7 w-7 place-items-center rounded-md text-ink-muted transition-colors hover:bg-bg-sunken disabled:opacity-30"
				>
					<ChevronLeft size={16} aria-hidden />
				</button>
				<span className="text-sm font-bold capitalize text-ink">
					{monthLabel}
				</span>
				<button
					type="button"
					onClick={() => shift(1)}
					aria-label={t("booking.book.nextMonth")}
					className="grid h-7 w-7 place-items-center rounded-md text-ink-muted transition-colors hover:bg-bg-sunken"
				>
					<ChevronRight size={16} aria-hidden />
				</button>
			</div>

			<div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-ink-faint">
				{weekdays.map((w, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: fixed weekday positions
					<span key={i}>{w}</span>
				))}
			</div>

			<div className="mt-1 grid grid-cols-7 gap-1">
				{cells.map((d, idx) => {
					if (d === null)
						// biome-ignore lint/suspicious/noArrayIndexKey: padding cells have no id
						return <span key={`e${idx}`} />;
					const iso = toISO(view.y, view.m, d);
					const disabled = iso < minISO;
					const selected = iso === value;
					return (
						<button
							key={iso}
							type="button"
							disabled={disabled}
							onClick={() => onChange(iso)}
							className={`aspect-square rounded-md text-sm transition-colors ${
								selected
									? "bg-brand font-bold text-white"
									: disabled
										? "cursor-default text-ink-faint/40"
										: "text-ink hover:bg-brand-soft"
							}`}
						>
							{d}
						</button>
					);
				})}
			</div>
		</div>
	);
}
