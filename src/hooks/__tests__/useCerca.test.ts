import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCerca } from "@/hooks/useCerca";

const MOCK_GEOJSON = {
	type: "FeatureCollection",
	features: [
		{
			type: "Feature",
			geometry: { type: "Point", coordinates: [12.49, 41.89] },
			properties: {
				_placeId: "place-roma-centro",
				name: "Autoscuola Roma Centro",
				city: "Roma",
				zip: "00100",
				region: "",
				address: "Via Nazionale 1",
				phone: "",
				website: "",
			},
		},
		{
			type: "Feature",
			geometry: { type: "Point", coordinates: [9.19, 45.46] },
			properties: {
				_placeId: "place-milano-nord",
				name: "Autoscuola Milano Nord",
				city: "Milano",
				zip: "20100",
				region: "",
				address: "Corso Buenos Aires 5",
				phone: "",
				website: "",
			},
		},
	],
};

const wrapper = ({ children }: { children: React.ReactNode }) =>
	createElement(MemoryRouter, null, children);

beforeEach(() => {
	vi.stubGlobal(
		"fetch",
		vi.fn().mockResolvedValue({
			ok: true,
			json: async () => MOCK_GEOJSON,
		} as Response),
	);
});

describe("useCerca", () => {
	it("starts loading, then returns all schools when no filters", async () => {
		const { result } = renderHook(() => useCerca(), { wrapper });
		expect(result.current.loading).toBe(true);
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.results).toHaveLength(2);
	});

	it("filters by city name", async () => {
		const { result } = renderHook(() => useCerca(), { wrapper });
		await waitFor(() => expect(result.current.loading).toBe(false));
		act(() => result.current.setCity("Milano"));
		await waitFor(() =>
			expect(result.current.results.some((s) => s.city === "Milano")).toBe(
				true,
			),
		);
		expect(result.current.results.every((s) => s.city !== "Roma")).toBe(true);
	});

	it("setSelected updates selected", async () => {
		const { result } = renderHook(() => useCerca(), { wrapper });
		await waitFor(() => expect(result.current.loading).toBe(false));
		const first = result.current.results[0];
		act(() => result.current.setSelected(first));
		expect(result.current.selected?.id).toBe(first.id);
	});

	it("sets error when fetch fails", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: false, status: 500 } as Response),
		);
		const { result } = renderHook(() => useCerca(), { wrapper });
		await waitFor(() => expect(result.current.error).toBeTruthy());
	});
});

describe("useCerca placeId auto-select", () => {
	const placeIdWrapper = ({ children }: { children: React.ReactNode }) =>
		createElement(
			MemoryRouter,
			{ initialEntries: ["/search?placeId=place-roma-centro"] },
			children,
		);

	it("auto-selects the school matching ?placeId= once results load", async () => {
		const { result } = renderHook(() => useCerca(), {
			wrapper: placeIdWrapper,
		});
		await waitFor(() => expect(result.current.loading).toBe(false));
		await waitFor(() =>
			expect(result.current.selected?._placeId).toBe("place-roma-centro"),
		);
	});

	it("does not select anything when placeId doesn't match any school", async () => {
		const noMatchWrapper = ({ children }: { children: React.ReactNode }) =>
			createElement(
				MemoryRouter,
				{ initialEntries: ["/search?placeId=does-not-exist"] },
				children,
			);
		const { result } = renderHook(() => useCerca(), {
			wrapper: noMatchWrapper,
		});
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.selected).toBeNull();
	});

	it("preserves a selection made before schools finish loading", async () => {
		const { result } = renderHook(() => useCerca(), {
			wrapper: placeIdWrapper,
		});
		const otherSchool = {
			...MOCK_GEOJSON.features[1].properties,
			latlng: [45.46, 9.19] as [number, number],
			id: "other",
		};
		act(() => result.current.setSelected(otherSchool as never));
		await waitFor(() => expect(result.current.loading).toBe(false));
		expect(result.current.selected?._placeId).toBe("place-milano-nord");
	});

	it("lets the user deselect the auto-selected school and keeps it deselected", async () => {
		const { result } = renderHook(() => useCerca(), {
			wrapper: placeIdWrapper,
		});
		await waitFor(() => expect(result.current.loading).toBe(false));
		await waitFor(() =>
			expect(result.current.selected?._placeId).toBe("place-roma-centro"),
		);

		act(() => result.current.setSelected(null));
		expect(result.current.selected).toBeNull();

		// Wait a tick to ensure the auto-select effect doesn't re-fire and re-select.
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(result.current.selected).toBeNull();
	});
});
