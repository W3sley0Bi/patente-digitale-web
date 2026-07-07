import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { loadAllSchools } from "@/lib/loadSchools";

export interface SchoolMatch {
	_placeId: string;
	name: string;
	city: string;
	website: string | null;
	address: string | null;
	phone: string | null;
	region: string | null;
	zip: string | null;
	lat: number | null;
	lng: number | null;
	openingHours: string[] | null;
}

interface ClaimSearchProps {
	onSelect: (school: SchoolMatch) => void;
}

export function ClaimSearch({ onSelect }: ClaimSearchProps) {
	const { t } = useTranslation();
	const [query, setQuery] = useState("");
	const [all, setAll] = useState<SchoolMatch[]>([]);
	const [results, setResults] = useState<SchoolMatch[]>([]);
	const loaded = useRef(false);

	useEffect(() => {
		if (loaded.current) return;
		loaded.current = true;
		loadAllSchools().then((schools) => {
			setAll(
				schools.map((s) => ({
					_placeId: s._placeId ?? "",
					name: s.name,
					city: s.city,
					website: s.website ?? null,
					address: s.address ?? null,
					phone: s.phone ?? null,
					region: s.region ?? null,
					zip: s.zip ?? null,
					lat: s.latlng[0] ?? null,
					lng: s.latlng[1] ?? null,
					openingHours: s.openingHours ?? null,
				})),
			);
		});
	}, []);

	useEffect(() => {
		if (!query.trim()) {
			setResults([]);
			return;
		}
		const lower = query.toLowerCase();
		setResults(
			all
				.filter(
					(s) =>
						s.name.toLowerCase().includes(lower) ||
						s.city.toLowerCase().includes(lower),
				)
				.slice(0, 8),
		);
	}, [query, all]);

	return (
		<div className="flex flex-col gap-2">
			<input
				type="text"
				placeholder={t("school.search.placeholder")}
				value={query}
				onChange={(e) => setQuery(e.target.value)}
				className="border rounded px-3 py-2 text-sm"
			/>
			{results.length > 0 && (
				<ul className="border rounded divide-y max-h-64 overflow-y-auto">
					{results.map((s) => (
						<li
							key={s._placeId || s.name}
							onClick={() => onSelect(s)}
							onKeyDown={(e) => e.key === "Enter" && onSelect(s)}
							role="option"
							aria-selected={false}
							tabIndex={0}
							className="px-3 py-2 cursor-pointer hover:bg-bg-raised text-sm"
						>
							<div className="font-medium">{s.name}</div>
							<div className="text-ink-muted text-xs">{s.city}</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
