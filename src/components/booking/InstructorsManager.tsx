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
} from "@/lib/booking/api";
import type { Instructor } from "@/lib/booking/types";

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];
const trimTime = (t: string) => t.slice(0, 5); // "HH:MM:SS" → "HH:MM"

function InstructorHours({ instructorId }: { instructorId: string }) {
	const { t } = useTranslation();
	// one [start,end] range per weekday; empty string = closed that day
	const [hours, setHours] = useState<
		Record<number, { start: string; end: string }>
	>({});
	const [saving, setSaving] = useState(false);
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		listInstructorAvailability(instructorId)
			.then((rows) => {
				const map: Record<number, { start: string; end: string }> = {};
				for (const r of rows)
					map[r.weekday] = {
						start: trimTime(r.start_time),
						end: trimTime(r.end_time),
					};
				setHours(map);
			})
			.catch(() => {});
	}, [instructorId]);

	const setDay = (d: number, key: "start" | "end", val: string) => {
		setSaved(false);
		setHours((h) => ({
			...h,
			[d]: { start: h[d]?.start ?? "", end: h[d]?.end ?? "", [key]: val },
		}));
	};
	const clearDay = (d: number) => {
		setSaved(false);
		setHours((h) => {
			const { [d]: _drop, ...rest } = h;
			return rest;
		});
	};

	const save = async () => {
		setSaving(true);
		const rows: AvailabilityRow[] = WEEKDAYS.flatMap((d) => {
			const r = hours[d];
			return r?.start && r?.end && r.start < r.end
				? [{ weekday: d, start_time: r.start, end_time: r.end }]
				: [];
		});
		try {
			await setInstructorAvailability(instructorId, rows);
			setSaved(true);
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="mt-2 rounded-lg border border-line bg-bg p-3">
			<ul className="space-y-1.5">
				{WEEKDAYS.map((d) => {
					const r = hours[d];
					return (
						<li key={d} className="flex items-center gap-2 text-xs">
							<span className="w-10 text-ink-muted">
								{t(`booking.school.weekday.${d}`)}
							</span>
							{r ? (
								<>
									<input
										type="time"
										step={900}
										value={r.start}
										onChange={(e) => setDay(d, "start", e.target.value)}
										className="rounded border border-line bg-bg-raised px-1.5 py-0.5"
									/>
									<span className="text-ink-faint">–</span>
									<input
										type="time"
										step={900}
										value={r.end}
										onChange={(e) => setDay(d, "end", e.target.value)}
										className="rounded border border-line bg-bg-raised px-1.5 py-0.5"
									/>
									<button
										type="button"
										onClick={() => clearDay(d)}
										className="ml-1 text-ink-faint hover:text-red-600"
										aria-label={t("booking.school.removeRange")}
									>
										✕
									</button>
								</>
							) : (
								<button
									type="button"
									onClick={() => setDay(d, "start", "09:00")}
									className="text-brand hover:underline"
								>
									{t("booking.school.closed")} — {t("booking.school.addRange")}
								</button>
							)}
						</li>
					);
				})}
			</ul>
			<button
				type="button"
				onClick={save}
				disabled={saving}
				className="mt-3 rounded-md bg-brand px-3 py-1 text-xs font-bold text-white disabled:opacity-50"
			>
				{saved ? "✓ " : ""}
				{t("booking.school.save")}
			</button>
		</div>
	);
}

export function InstructorsManager({
	schoolId,
	onChange,
}: {
	schoolId: string;
	onChange?: () => void;
}) {
	const { t } = useTranslation();
	const [items, setItems] = useState<Instructor[]>([]);
	const [name, setName] = useState("");
	const [editId, setEditId] = useState<string | null>(null);
	const [editName, setEditName] = useState("");
	const [openId, setOpenId] = useState<string | null>(null);

	const load = () =>
		listInstructors(schoolId)
			.then(setItems)
			.catch(() => setItems([]));
	useEffect(() => {
		void load();
	}, [schoolId]);

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
		if (openId === i.id) setOpenId(null);
		await load();
		onChange?.();
	};

	return (
		<div className="rounded-2xl border border-line bg-bg-raised p-6">
			<h3 className="font-sans text-lg font-black text-ink">
				{t("booking.school.instructors")}
			</h3>
			<div className="mt-4 flex gap-2">
				<input
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder={t("booking.school.instructorName")}
					className="flex-1 rounded-md border border-line bg-bg px-3 py-1.5 text-sm"
				/>
				<button
					type="button"
					onClick={add}
					className="rounded-md bg-brand px-4 py-1.5 text-sm font-bold text-white"
				>
					{t("booking.school.addInstructor")}
				</button>
			</div>
			<ul className="mt-4 divide-y divide-line">
				{items.map((i) => (
					<li key={i.id} className="py-2 text-sm">
						<div className="flex items-center justify-between gap-2">
							{editId === i.id ? (
								<input
									value={editName}
									onChange={(e) => setEditName(e.target.value)}
									onKeyDown={(e) => e.key === "Enter" && saveEdit()}
									onBlur={saveEdit}
									// biome-ignore lint/a11y/noAutofocus: inline rename UX
									autoFocus
									className="flex-1 rounded border border-line bg-bg px-2 py-0.5 text-sm"
								/>
							) : (
								<span
									className={
										i.active ? "text-ink" : "text-ink-faint line-through"
									}
								>
									{i.name}
								</span>
							)}
							<span className="flex items-center gap-2 text-xs">
								<button
									type="button"
									onClick={() => setOpenId(openId === i.id ? null : i.id)}
									className="text-ink-muted hover:text-brand"
								>
									{t("booking.school.instructorHours")}
								</button>
								<button
									type="button"
									onClick={() => startEdit(i)}
									className="text-ink-muted hover:text-brand"
								>
									{t("booking.school.rename")}
								</button>
								<button
									type="button"
									onClick={() => toggle(i)}
									className="text-ink-muted hover:text-brand"
									title={t("booking.school.enabledLabel")}
								>
									{i.active ? "✓" : "—"}
								</button>
								<button
									type="button"
									onClick={() => remove(i)}
									className="text-ink-muted hover:text-red-600"
								>
									{t("booking.school.delete")}
								</button>
							</span>
						</div>
						{openId === i.id && <InstructorHours instructorId={i.id} />}
					</li>
				))}
			</ul>
		</div>
	);
}
