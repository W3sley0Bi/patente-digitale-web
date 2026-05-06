import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCerca } from "@/hooks/useCerca";

const MOCK_GEOJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [12.49, 41.89] },
      properties: {
        name: "Autoscuola Roma Centro",
        city: "Roma",
        zip: "00100",
        region: "Lazio",
        address: "Via Nazionale 1",
        phone: "",
        website: "",
      },
    },
    {
      type: "Feature",
      geometry: { type: "Point", coordinates: [9.19, 45.46] },
      properties: {
        name: "Autoscuola Milano Nord",
        city: "Milano",
        zip: "20100",
        region: "Lombardia",
        address: "Corso Buenos Aires 5",
        phone: "",
        website: "",
      },
    },
  ],
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: async () => MOCK_GEOJSON,
  } as Response));
});

describe("useCerca", () => {
  it("starts loading, then returns all schools when query is empty", async () => {
    const { result } = renderHook(() => useCerca());
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.results).toHaveLength(2);
  });

  it("filters by city name", async () => {
    const { result } = renderHook(() => useCerca());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setQuery("Milano"));
    await waitFor(() =>
      expect(result.current.results.some((s) => s.city === "Milano")).toBe(true)
    );
    expect(result.current.results.every((s) => s.city !== "Roma")).toBe(true);
  });

  it("setSelected updates selected", async () => {
    const { result } = renderHook(() => useCerca());
    await waitFor(() => expect(result.current.loading).toBe(false));
    const first = result.current.results[0];
    act(() => result.current.setSelected(first));
    expect(result.current.selected?.id).toBe(first.id);
  });

  it("sets error when fetch fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response));
    const { result } = renderHook(() => useCerca());
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
});
