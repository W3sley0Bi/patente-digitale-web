import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
	addInstructor,
	listInstructors,
	setInstructorActive,
} from "@/lib/booking/api";
import type { Instructor } from "@/lib/booking/types";

export function InstructorsManager({ schoolId }: { schoolId: string }) {
	const { t } = useTranslation();
	const [items, setItems] = useState<Instructor[]>([]);
	const [name, setName] = useState("");
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
	};
	const toggle = async (i: Instructor) => {
		await setInstructorActive(i.id, !i.active);
		await load();
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
					<li
						key={i.id}
						className="flex items-center justify-between py-2 text-sm"
					>
						<span
							className={i.active ? "text-ink" : "text-ink-faint line-through"}
						>
							{i.name}
						</span>
						<button
							type="button"
							onClick={() => toggle(i)}
							className="text-xs text-ink-muted hover:text-brand"
						>
							{i.active ? "✓" : "—"}
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}
