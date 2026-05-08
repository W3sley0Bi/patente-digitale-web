import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
import { ClaimSearch } from "@/components/driving-school/ClaimSearch";

const mockFeatures = [
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [12.5, 41.9] },
    properties: { _placeId: "place-1", name: "Autoscuola Roma Centro", city: "Roma", website: "https://www.romacentro.it" },
  },
  {
    type: "Feature",
    geometry: { type: "Point", coordinates: [9.1, 45.4] },
    properties: { _placeId: "place-2", name: "Autoscuola Napoli Sud", city: "Napoli", website: null },
  },
];

vi.stubGlobal(
  "fetch",
  vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ type: "FeatureCollection", features: mockFeatures }),
  })
);

describe("ClaimSearch", () => {
  it("renders a search input", () => {
    render(<ClaimSearch onSelect={vi.fn()} />);
    expect(screen.getByPlaceholderText("school.search.placeholder")).toBeInTheDocument();
  });

  it("shows results matching the query", async () => {
    render(<ClaimSearch onSelect={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("school.search.placeholder"), { target: { value: "roma" } });
    await waitFor(() => expect(screen.getByText("Autoscuola Roma Centro")).toBeInTheDocument());
  });

  it("does not show results that don't match", async () => {
    render(<ClaimSearch onSelect={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("school.search.placeholder"), { target: { value: "roma" } });
    await waitFor(() => expect(screen.queryByText("Autoscuola Napoli Sud")).not.toBeInTheDocument());
  });

  it("calls onSelect with school data on click", async () => {
    const onSelect = vi.fn();
    render(<ClaimSearch onSelect={onSelect} />);
    fireEvent.change(screen.getByPlaceholderText("school.search.placeholder"), { target: { value: "roma" } });
    await waitFor(() => screen.getByText("Autoscuola Roma Centro"));
    fireEvent.click(screen.getByText("Autoscuola Roma Centro"));
    expect(onSelect).toHaveBeenCalledWith({
      _placeId: "place-1",
      name: "Autoscuola Roma Centro",
      city: "Roma",
      website: "https://www.romacentro.it",
    });
  });
});
