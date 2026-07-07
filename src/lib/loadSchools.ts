import {
	type NormalizedSchool,
	normalizeSchool,
	type SchoolsGeoJSON,
} from "@/lib/geojson";
import { getRegionForCoords } from "@/lib/italyGeo";
import { mergeDelta } from "@/lib/mergeDelta";
import { supabase } from "@/lib/supabase";

/** Loads the static geojson dataset merged with self-registered schools from Supabase. */
export async function loadAllSchools(): Promise<NormalizedSchool[]> {
	const [geojson, delta] = await Promise.all([
		fetch("/data/autoscuole.geojson").then((res) => {
			if (!res.ok) throw new Error(`Failed to load schools: ${res.status}`);
			return res.json() as Promise<SchoolsGeoJSON>;
		}),
		supabase
			.from("driving_schools")
			.select("*")
			.eq("status", "accepted")
			.then(({ data }) => data ?? []),
	]);

	const normalized = geojson.features.map((f) => {
		const s = normalizeSchool(f);
		return {
			...s,
			region: s.region || getRegionForCoords(s.latlng[0], s.latlng[1]) || "",
		};
	});

	return mergeDelta(normalized, delta);
}
