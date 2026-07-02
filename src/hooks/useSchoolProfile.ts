import { useEffect, useState } from "react";
import type { SchoolEditorData } from "@/components/driving-school/SchoolEditor";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
	typeof v === "object" && v !== null && !Array.isArray(v);

// Some rows have opening_hours stored as a double-encoded JSON string
// (a jsonb scalar holding the stringified array) rather than a real array.
function normalizeOpeningHours(value: unknown): string[] {
	if (Array.isArray(value)) return value as string[];
	if (typeof value === "string") {
		try {
			const parsed = JSON.parse(value);
			if (Array.isArray(parsed)) return parsed;
		} catch {
			// fall through — malformed data, drop it
		}
	}
	return [];
}

function normalizeRow(row: Record<string, unknown>): SchoolEditorData {
	const pricesRaw = row.prices;
	const prices: Record<string, number> = {};
	if (isPlainObject(pricesRaw)) {
		for (const [k, v] of Object.entries(pricesRaw)) {
			const n = typeof v === "number" ? v : Number(v);
			if (Number.isFinite(n)) prices[k] = n;
		}
	}
	const socialRaw = row.social;
	const social: Record<string, string> = {};
	if (isPlainObject(socialRaw)) {
		for (const [k, v] of Object.entries(socialRaw)) {
			if (typeof v === "string") social[k] = v;
		}
	}
	return {
		...(row as unknown as SchoolEditorData),
		opening_hours: normalizeOpeningHours(row.opening_hours),
		licenses: Array.isArray(row.licenses) ? (row.licenses as string[]) : [],
		prices,
		social,
	};
}

export function useSchoolProfile() {
	const { user } = useAuth();
	const [data, setData] = useState<SchoolEditorData | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (!user) return;
		supabase
			.from("driving_schools")
			.select("*")
			.eq("user_id", user.id)
			.single()
			.then(({ data: row }) => {
				setData(row ? normalizeRow(row as Record<string, unknown>) : null);
				setLoading(false);
			});
	}, [user]);

	return { data, loading, userId: user?.id };
}
