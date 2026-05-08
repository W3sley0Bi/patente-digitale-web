export interface SchoolProperties {
  _placeId?: string;
  name: string;
  city: string;
  zip: string;
  region: string;
  address: string;
  phone: string;
  website: string;
  partner?: boolean;
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

export function normalizeSchool(feature: SchoolFeature): NormalizedSchool {
  const [lng, lat] = feature.geometry.coordinates;
  return {
    ...feature.properties,
    name: feature.properties.name || "Autoscuola",
    latlng: [lat, lng],
    id: `${lat},${lng}`,
  };
}
