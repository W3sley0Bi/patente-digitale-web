export const REGIONS = [
	"Abruzzo",
	"Basilicata",
	"Calabria",
	"Campania",
	"Emilia-Romagna",
	"Friuli-Venezia Giulia",
	"Lazio",
	"Liguria",
	"Lombardia",
	"Marche",
	"Molise",
	"Piemonte",
	"Puglia",
	"Sardegna",
	"Sicilia",
	"Toscana",
	"Trentino-Alto Adige",
	"Umbria",
	"Valle d'Aosta",
	"Veneto",
] as const;

export type Region = (typeof REGIONS)[number];

// Geographic centroids for each region [lat, lng].
// Used for coordinate-based region detection: assigns a school to its nearest region centroid.
const REGION_CENTROIDS: Record<Region, [number, number]> = {
	Piemonte: [44.8, 8.05],
	"Valle d'Aosta": [45.74, 7.32],
	Lombardia: [45.55, 10.1],
	"Trentino-Alto Adige": [46.4, 11.15],
	Veneto: [45.55, 11.85],
	"Friuli-Venezia Giulia": [46.1, 13.15],
	Liguria: [44.32, 8.55],
	"Emilia-Romagna": [44.55, 10.9],
	Toscana: [43.35, 11.1],
	Umbria: [43.05, 12.6],
	Marche: [43.4, 13.1],
	Lazio: [41.9, 12.65],
	Abruzzo: [42.1, 13.9],
	Molise: [41.65, 14.65],
	Campania: [40.85, 15.0],
	Puglia: [40.6, 16.6],
	Basilicata: [40.5, 16.1],
	Calabria: [38.9, 16.25],
	Sicilia: [37.55, 14.05],
	Sardegna: [40.05, 9.05],
};

// Rough bounding box for all of Italy (used to early-exit for off-map points)
const ITALY_BOUNDS = { latMin: 35.5, latMax: 47.5, lngMin: 6.6, lngMax: 18.6 };

/**
 * Returns the region for a [lat, lng] coordinate pair.
 * Uses nearest-centroid assignment — works for all schools regardless of OSM tag quality.
 */
export function getRegionForCoords(
	lat: number,
	lng: number,
): Region | undefined {
	if (
		lat < ITALY_BOUNDS.latMin ||
		lat > ITALY_BOUNDS.latMax ||
		lng < ITALY_BOUNDS.lngMin ||
		lng > ITALY_BOUNDS.lngMax
	)
		return undefined;

	let closest: Region | undefined;
	let minDist = Infinity;

	for (const [region, [cLat, cLng]] of Object.entries(REGION_CENTROIDS) as [
		Region,
		[number, number],
	][]) {
		const dist = (lat - cLat) ** 2 + (lng - cLng) ** 2;
		if (dist < minDist) {
			minDist = dist;
			closest = region;
		}
	}

	return closest;
}
