export interface GeocodeResult {
  city: string;
  zip: string;
  countryCode: string;
}

export async function reverseGeocode(lat: number, lon: number): Promise<GeocodeResult> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=it`;
  const res = await fetch(url, {
    headers: { "User-Agent": "patentedigitale.it/1.0" },
  });
  if (!res.ok) throw new Error("geocode failed");
  const data = await res.json();
  return {
    city:
      data.address?.city ??
      data.address?.town ??
      data.address?.municipality ??
      data.address?.village ??
      "",
    zip: data.address?.postcode ?? "",
    countryCode: data.address?.country_code ?? "",
  };
}
