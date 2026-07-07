const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

export interface PlaceSuggestion {
	id: string;
	label: string;
	lat: number;
	lng: number;
}

interface MapboxFeature {
	id?: string;
	properties: {
		mapbox_id?: string;
		full_address?: string;
		name?: string;
		place_formatted?: string;
		coordinates?: { longitude: number; latitude: number };
	};
	geometry: { coordinates: [number, number] };
}

function toSuggestion(f: MapboxFeature): PlaceSuggestion {
	const [lng, lat] = f.geometry.coordinates;
	return {
		id: f.properties.mapbox_id ?? f.id ?? `${lat},${lng}`,
		label:
			f.properties.full_address ??
			f.properties.place_formatted ??
			f.properties.name ??
			"",
		lat: f.properties.coordinates?.latitude ?? lat,
		lng: f.properties.coordinates?.longitude ?? lng,
	};
}

/** Forward-geocode autocomplete: text query -> ranked place/address suggestions in Italy. */
export async function searchPlaces(
	query: string,
	signal?: AbortSignal,
): Promise<PlaceSuggestion[]> {
	if (!query.trim() || !MAPBOX_TOKEN) return [];

	const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
	url.searchParams.set("q", query);
	url.searchParams.set("access_token", MAPBOX_TOKEN);
	url.searchParams.set("country", "it");
	url.searchParams.set("language", "it");
	url.searchParams.set("autocomplete", "true");
	url.searchParams.set("limit", "6");
	url.searchParams.set("types", "place,locality,postcode,address,street");

	const res = await fetch(url, { signal });
	if (!res.ok) throw new Error(`Mapbox geocode failed: ${res.status}`);
	const data = (await res.json()) as { features: MapboxFeature[] };
	return (data.features ?? []).map(toSuggestion);
}

/** Reverse-geocode coordinates -> a human-readable place label (e.g. "Roma"). */
export async function reverseGeocode(
	lat: number,
	lng: number,
	signal?: AbortSignal,
): Promise<string> {
	if (!MAPBOX_TOKEN) return "";

	const url = new URL("https://api.mapbox.com/search/geocode/v6/reverse");
	url.searchParams.set("longitude", String(lng));
	url.searchParams.set("latitude", String(lat));
	url.searchParams.set("access_token", MAPBOX_TOKEN);
	url.searchParams.set("language", "it");
	url.searchParams.set("types", "place");

	const res = await fetch(url, { signal });
	if (!res.ok) throw new Error(`Mapbox reverse geocode failed: ${res.status}`);
	const data = (await res.json()) as { features: MapboxFeature[] };
	const f = data.features?.[0];
	return f ? toSuggestion(f).label : "";
}
