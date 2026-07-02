export interface SchoolProperties {
	_placeId?: string;
	name: string;
	city: string;
	zip: string;
	region: string;
	address: string;
	phone: string;
	email?: string;
	website: string;
	partner?: boolean;
	enrollment_enabled?: boolean;
	slug?: string;
	rating?: number | null;
	userRatingCount?: number | null;
	businessStatus?: string;
	googleMapsUri?: string;
	openingHours?: string[];
	licenses?: string[];
	prices?: Record<string, string> | null;
}

export interface SchoolFeature {
	type: "Feature";
	geometry: {
		type: "Point";
		coordinates: [number, number]; // [lng, lat]
	};
	properties: SchoolProperties;
}

export interface SchoolsGeoJSON {
	type: "FeatureCollection";
	features: SchoolFeature[];
}

export interface NormalizedSchool extends SchoolProperties {
	latlng: [number, number]; // [lat, lng] — Leaflet order
	id: string; // unique key: `${lat},${lng}`
}

function normalizeOpeningHours(
	openingHours: unknown,
): string[] | undefined {
	if (Array.isArray(openingHours)) return openingHours;
	if (typeof openingHours === "string") {
		try {
			const parsed = JSON.parse(openingHours);
			if (Array.isArray(parsed)) return parsed;
		} catch {
			// fall through — malformed upstream data, drop it
		}
	}
	return undefined;
}

export function normalizeSchool(feature: SchoolFeature): NormalizedSchool {
	const [lng, lat] = feature.geometry.coordinates;
	return {
		...feature.properties,
		name: feature.properties.name || "Autoscuola",
		openingHours: normalizeOpeningHours(feature.properties.openingHours),
		latlng: [lat, lng],
		id:
			feature.properties._placeId || `${lat},${lng}:${feature.properties.name}`,
	};
}
