import {
	CalendarSync,
	Check,
	Copy,
	Pencil,
	Plus,
	Power,
	Trash2,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	type AvailabilityRow,
	addInstructor,
	deleteInstructor,
	listInstructorAvailability,
	listInstructors,
	renameInstructor,
	setInstructorActive,
	setInstructorAvailability,
	setInstructorColor,
} from "@/lib/booking/api";
import { INSTRUCTOR_PALETTE, instructorColor } from "@/lib/booking/colors";
import type { Instructor } from "@/lib/booking/types";

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const FIRST_RANGE = { start: "09:00", end: "13:00" };
const NEXT_RANGE = { start: "14:00", end: "18:00" };
const trimTime = (t: string) => t.slice(0, 5); // "HH:MM:SS" → "HH:MM"
// name column + 7 weekday columns
const GRID_COLS = "minmax(11rem,1.3fr) repeat(7, minmax(4.25rem,1fr))";

type Range = { start: string; end: string };
type Grid = Record<string, Record<number, Range[]>>; // instructorId → weekday → ranges

export function InstructorsManager({
	schoolId,
	onChange,
}: {
	schoolId: string;
	onChange?: () => void;
}) {
	const { t } = useTranslation();
	const [items, setItems] = useState<Instructor[]>([]);
	const [grid, setGrid] = useState<Grid>({});
	const [dirty, setDirty] = useState<Set<string>>(new Set());
	const [name, setName] = useState("");
	const [editId, setEditId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [editCell, setEditCell] = useState<{ iid: string; d: number } | null>(
		null,
	);
	const [copyFrom, setCopyFrom] = useState<string | null>(null);
	const [colorOpen, setColorOpen] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);

	const load = async () => {
		const list = await listInstructors(schoolId).catch(
			() => [] as Instructor[],
		);
		setItems(list);
		const entries = await Promise.all(
			list.map(async (i) => {
				const rows = await listInstructorAvailability(i.id).catch(
					() => [] as AvailabilityRow[],
				);
				const days: Record<number, Range[]> = {};
				for (const r of rows)
					(days[r.weekday] ??= []).push({
						start: trimTime(r.start_time),
						end: trimTime(r.end_time),
					});
				for (const d of Object.keys(days))
					days[+d].sort((a, b) => a.start.localeCompare(b.start));
				return [i.id, days] as const;
			}),
		);
		setGrid(Object.fromEntries(entries));
		setDirty(new Set());
	};
	useEffect(() => {
		void load();
	}, [schoolId]);

	const markDirty = (iid: string) => {
		setSaved(false);
		setDirty((s) => new Set(s).add(iid));
	};
	const dayRanges = (iid: string, d: number): Range[] => grid[iid]?.[d] ?? [];
	const writeDay = (iid: string, d: number, arr: Range[]) => {
		markDirty(iid);
		setGrid((g) => {
			const days = { ...(g[iid] ?? {}) };
			if (arr.length) days[d] = arr;
			else delete days[d];
			return { ...g, [iid]: days };
		});
	};
	const addRange = (iid: string, d: number) => {
		const arr = dayRanges(iid, d);
		writeDay(iid, d, [
			...arr,
			arr.length ? { ...NEXT_RANGE } : { ...FIRST_RANGE },
		]);
	};
	const updateRange = (
		iid: string,
		d: number,
		idx: number,
		patch: Partial<Range>,
	) =>
		writeDay(
			iid,
			d,
			dayRanges(iid, d).map((r, i) => (i === idx ? { ...r, ...patch } : r)),
		);
	const removeRange = (iid: string, d: number, idx: number) =>
		writeDay(
			iid,
			d,
			dayRanges(iid, d).filter((_, i) => i !== idx),
		);
	const copyToWeek = (iid: string, d: number) => {
		const arr = dayRanges(iid, d);
		if (!arr.length) return;
		markDirty(iid);
		setGrid((g) => ({
			...g,
			[iid]: Object.fromEntries(
				WEEKDAYS.map((w) => [w, arr.map((r) => ({ ...r }))]),
			),
		}));
	};
	const copyToInstructor = (fromId: string, toId: string) => {
		markDirty(toId);
		setGrid((g) => {
			const src = g[fromId] ?? {};
			const clone: Record<number, Range[]> = {};
			for (const k of Object.keys(src))
				clone[+k] = src[+k].map((r) => ({ ...r }));
			return { ...g, [toId]: clone };
		});
		setCopyFrom(null);
	};

	const add = async () => {
		if (!name.trim()) return;
		await addInstructor(schoolId, name.trim());
		setName("");
		await load();
		onChange?.();
	};
	const toggle = async (i: Instructor) => {
		await setInstructorActive(i.id, !i.active);
		await load();
		onChange?.();
	};
	const startEdit = (i: Instructor) => {
		setEditId(i.id);
		setEditName(i.name);
	};
	const pickColor = async (i: Instructor, color: string) => {
		setColorOpen(null);
		await setInstructorColor(i.id, color);
		await load();
		onChange?.();
	};
	const saveEdit = async () => {
		if (editId && editName.trim()) {
			await renameInstructor(editId, editName.trim());
			await load();
			onChange?.();
		}
		setEditId(null);
	};
	const remove = async (i: Instructor) => {
		if (!window.confirm(t("booking.school.confirmDelete", { name: i.name })))
			return;
		await deleteInstructor(i.id);
		if (editCell?.iid === i.id) setEditCell(null);
		await load();
		onChange?.();
	};

	const saveHours = async () => {
		setSaving(true);
		try {
			await Promise.all(
				[...dirty].map((iid) => {
					const days = grid[iid] ?? {};
					const rows: AvailabilityRow[] = WEEKDAYS.flatMap((d) =>
						(days[d] ?? [])
							.filter((r) => r.start && r.end && r.start < r.end)
							.map((r) => ({
								weekday: d,
								start_time: r.start,
								end_time: r.end,
							})),
					);
					return setInstructorAvailability(iid, rows);
				}),
			);
			setDirty(new Set());
			setSaved(true);
			onChange?.();
		} finally {
			setSaving(false);
		}
	};

	const iconBtn =
		"grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink-muted transition-colors hover:bg-bg-sunken";

	return (
		<div className="rounded-[1.5rem] border border-line bg-bg-raised p-5">
			<h3 className="text-base font-bold tracking-tight text-ink">
				{t("booking.school.scheduleTitle")}
			</h3>
			<p className="mt-1 max-w-[60ch] text-xs text-ink-muted">
				{t("booking.school.scheduleHint")}
			</p>

			<div className="mt-4 flex max-w-xs gap-1.5">
				<input
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && add()}
					placeholder={t("booking.school.instructorName")}
					className="min-w-0 flex-1 rounded-md border border-line bg-bg px-2.5 py-1.5 text-xs focus:border-brand focus:outline-none"
				/>
				<button
					type="button"
					onClick={add}
					aria-label={t("booking.school.addInstructor")}
					className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-brand text-white transition-colors hover:bg-brand-hover"
				>
					<Plus size={16} aria-hidden />
				</button>
			</div>

			{items.length === 0 ? (
				<p className="mt-4 text-sm text-ink-faint">
					{t("booking.school.noInstructors")}
				</p>
			) : (
				<div className="mt-4 overflow-x-auto">
					<div className="min-w-[720px]">
						{/* header */}
						<div
							className="grid items-center gap-1 border-b border-line pb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint"
							style={{ gridTemplateColumns: GRID_COLS }}
						>
							<span />
							{WEEKDAYS.map((d) => (
								<span key={d} className="text-center">
									{t(`booking.school.weekday.${d}`)}
								</span>
							))}
						</div>

						{/* one row per instructor */}
						{items.map((i, ii) => (
							<div
								key={i.id}
								className="grid items-stretch gap-1 border-b border-line/60 py-1.5"
								style={{ gridTemplateColumns: GRID_COLS }}
							>
								{/* name + controls */}
								<div className="flex min-w-0 flex-col justify-center gap-1 pr-3">
									{editId === i.id ? (
										<input
											value={editName}
											onChange={(e) => setEditName(e.target.value)}
											onKeyDown={(e) => e.key === "Enter" && saveEdit()}
											onBlur={saveEdit}
											// biome-ignore lint/a11y/noAutofocus: inline rename UX
											autoFocus
											className="w-full rounded border border-line bg-bg px-2 py-1 text-sm focus:border-brand focus:outline-none"
										/>
									) : copyFrom === i.id ? (
										<select
											// biome-ignore lint/a11y/noAutofocus: inline copy UX
											autoFocus
											defaultValue=""
											onBlur={() => setCopyFrom(null)}
											onChange={(e) =>
												e.target.value && copyToInstructor(i.id, e.target.value)
											}
											className="w-full rounded border border-brand bg-bg px-1 py-1 text-xs focus:outline-none"
										>
											<option value="" disabled>
												{t("booking.school.copyToInstructor")}
											</option>
											{items
												.filter((o) => o.id !== i.id)
												.map((o) => (
													<option key={o.id} value={o.id}>
														{o.name}
													</option>
												))}
										</select>
									) : (
										<>
											<div className="flex items-center gap-1.5">
												<button
													type="button"
													onClick={() =>
														setColorOpen((v) => (v === i.id ? null : i.id))
													}
													title={t("booking.school.color")}
													aria-label={t("booking.school.color")}
													className="h-4 w-4 shrink-0 rounded-full border border-line/60 transition-transform hover:scale-110"
													style={{
														backgroundColor: instructorColor(i.color, ii),
													}}
												/>
												<span
													className={`min-w-0 flex-1 truncate text-sm font-semibold ${
														i.active
															? "text-ink"
															: "text-ink-faint line-through"
													}`}
													title={i.name}
												>
													{i.name}
												</span>
											</div>
											{colorOpen === i.id && (
												<div className="flex flex-wrap gap-1.5 py-1">
													{INSTRUCTOR_PALETTE.map((c) => {
														const selected = instructorColor(i.color, ii) === c;
														return (
															<button
																key={c}
																type="button"
																onClick={() => pickColor(i, c)}
																aria-label={c}
																className={`h-5 w-5 rounded-full transition-transform hover:scale-110 ${
																	selected
																		? "ring-2 ring-ink ring-offset-1 ring-offset-bg-raised"
																		: ""
																}`}
																style={{ backgroundColor: c }}
															/>
														);
													})}
												</div>
											)}
											<div className="flex items-center gap-0.5">
												{items.length > 1 && (
													<button
														type="button"
														onClick={() => setCopyFrom(i.id)}
														title={t("booking.school.copyToInstructor")}
														aria-label={t("booking.school.copyToInstructor")}
														className={`${iconBtn} hover:text-brand`}
													>
														<Copy size={14} aria-hidden />
													</button>
												)}
												<button
													type="button"
													onClick={() => startEdit(i)}
													title={t("booking.school.rename")}
													aria-label={t("booking.school.rename")}
													className={`${iconBtn} hover:text-brand`}
												>
													<Pencil size={14} aria-hidden />
												</button>
												<button
													type="button"
													onClick={() => toggle(i)}
													title={t("booking.school.instructorActive")}
													aria-label={t("booking.school.instructorActive")}
													aria-pressed={i.active}
													className={`${iconBtn} ${
														i.active ? "text-brand" : "hover:text-brand"
													}`}
												>
													<Power size={14} aria-hidden />
												</button>
												<button
													type="button"
													onClick={() => remove(i)}
													title={t("booking.school.delete")}
													aria-label={t("booking.school.delete")}
													className={`${iconBtn} hover:bg-accent-soft hover:text-accent`}
												>
													<Trash2 size={14} aria-hidden />
												</button>
											</div>
										</>
									)}
								</div>

								{/* day cells */}
								{WEEKDAYS.map((d) => {
									const arr = grid[i.id]?.[d] ?? [];
									const isEdit = editCell?.iid === i.id && editCell.d === d;
									if (isEdit) {
										return (
											<div
												key={d}
												className="flex flex-col gap-1 rounded-md border border-brand bg-bg p-1"
											>
												{arr.map((r, idx) => (
													<div
														// biome-ignore lint/suspicious/noArrayIndexKey: ranges are positional
														key={idx}
														className="flex flex-col gap-0.5 border-b border-line/40 pb-1 last:border-0 last:pb-0"
													>
														<div className="flex items-center gap-1">
															<input
																type="time"
																step={900}
																value={r.start}
																onChange={(e) =>
																	updateRange(i.id, d, idx, {
																		start: e.target.value,
																	})
																}
																className="min-w-0 flex-1 rounded border border-line bg-bg-raised px-1 py-0.5 text-[11px]"
															/>
															<button
																type="button"
																onClick={() => removeRange(i.id, d, idx)}
																title={t("booking.school.removeRange")}
																aria-label={t("booking.school.removeRange")}
																className="shrink-0 text-ink-faint hover:text-red-600"
															>
																<X size={12} aria-hidden />
															</button>
														</div>
														<input
															type="time"
															step={900}
															value={r.end}
															onChange={(e) =>
																updateRange(i.id, d, idx, {
																	end: e.target.value,
																})
															}
															className="rounded border border-line bg-bg-raised px-1 py-0.5 text-[11px]"
														/>
													</div>
												))}
												<button
													type="button"
													onClick={() => addRange(i.id, d)}
													className="text-left text-[11px] font-medium text-brand hover:underline"
												>
													+ {t("booking.school.addRange")}
												</button>
												<div className="flex items-center justify-between border-t border-line/40 pt-1">
													<button
														type="button"
														onClick={() => copyToWeek(i.id, d)}
														title={t("booking.school.copyToWeek")}
														aria-label={t("booking.school.copyToWeek")}
														className="text-ink-muted hover:text-brand"
													>
														<CalendarSync size={13} aria-hidden />
													</button>
													<button
														type="button"
														onClick={() => setEditCell(null)}
														title={t("booking.school.done")}
														aria-label={t("booking.school.done")}
														className="text-brand hover:text-brand-hover"
													>
														<Check size={13} aria-hidden />
													</button>
												</div>
											</div>
										);
									}
									return (
										<button
											key={d}
											type="button"
											onClick={() => {
												if (arr.length === 0) addRange(i.id, d);
												setEditCell({ iid: i.id, d });
											}}
											className={`flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-1.5 text-center text-[11px] leading-tight transition-colors ${
												arr.length
													? "border-transparent bg-brand-soft font-semibold text-brand-ink"
													: "border-line text-ink-faint hover:border-brand hover:text-brand"
											}`}
										>
											{arr.length ? (
												arr.map((r, idx) => (
													// biome-ignore lint/suspicious/noArrayIndexKey: ranges are positional
													<span key={idx} className="whitespace-nowrap">
														{r.start}–{r.end}
													</span>
												))
											) : (
												<span>—</span>
											)}
										</button>
									);
								})}
							</div>
						))}
					</div>
				</div>
			)}

			{items.length > 0 && (
				<button
					type="button"
					onClick={saveHours}
					disabled={saving || dirty.size === 0}
					className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
				>
					{saved && dirty.size === 0 ? "✓ " : ""}
					{t("booking.school.save")}
				</button>
			)}
		</div>
	);
}
