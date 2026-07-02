import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}));

vi.mock("@/lib/booking/api", () => ({
  listSchoolBookings: vi.fn(),
  listInstructors: vi.fn(),
  confirmBooking: vi.fn(),
  declineBooking: vi.fn(),
}));

import { RequestsInbox } from "@/components/booking/RequestsInbox";
import {
  listSchoolBookings,
  listInstructors,
} from "@/lib/booking/api";
import type { Booking, Instructor } from "@/lib/booking/types";

const instructors: Instructor[] = [
  {
    id: "instr-1",
    school_id: "school-1",
    name: "Mario Rossi",
    active: true,
    color: null,
    created_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "instr-2",
    school_id: "school-1",
    name: "Luigi Verdi",
    active: true,
    color: null,
    created_at: "2026-01-01T00:00:00Z",
  },
];

function makeBooking(overrides: Partial<Booking>): Booking {
  return {
    id: "booking-1",
    school_id: "school-1",
    student_id: "student-1",
    instructor_id: null,
    preferred_instructor_id: null,
    starts_at: "2026-07-10T09:00:00Z",
    duration_min: 60,
    ends_at: "2026-07-10T10:00:00Z",
    status: "pending",
    cancelled_by: null,
    cancel_reason: null,
    licence_code: null,
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-01T00:00:00Z",
    decided_at: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(listInstructors).mockResolvedValue(instructors);
});

describe("RequestsInbox preferred instructor preselection", () => {
  it("preselects the dropdown with the student's preferred instructor", async () => {
    vi.mocked(listSchoolBookings).mockResolvedValue([
      makeBooking({ id: "booking-1", preferred_instructor_id: "instr-2" }),
    ]);

    render(<RequestsInbox schoolId="school-1" />);

    await waitFor(() =>
      expect(screen.getByRole("combobox")).toHaveValue("instr-2")
    );
  });

  it("leaves the dropdown empty when there is no preference", async () => {
    vi.mocked(listSchoolBookings).mockResolvedValue([
      makeBooking({ id: "booking-1", preferred_instructor_id: null }),
    ]);

    render(<RequestsInbox schoolId="school-1" />);

    await waitFor(() => screen.getByRole("combobox"));
    expect(screen.getByRole("combobox")).toHaveValue("");
  });

  it("falls back to empty when the preferred instructor is no longer active", async () => {
    vi.mocked(listSchoolBookings).mockResolvedValue([
      makeBooking({ id: "booking-1", preferred_instructor_id: "instr-inactive" }),
    ]);

    render(<RequestsInbox schoolId="school-1" />);

    await waitFor(() => screen.getByRole("combobox"));
    expect(screen.getByRole("combobox")).toHaveValue("");
  });

  it("does not clobber a manual pick on a later reload", async () => {
    vi.mocked(listSchoolBookings).mockResolvedValue([
      makeBooking({ id: "booking-1", preferred_instructor_id: "instr-2" }),
      makeBooking({ id: "booking-2", preferred_instructor_id: null }),
    ]);

    const { rerender } = render(
      <RequestsInbox schoolId="school-1" refreshKey={0} />
    );
    await waitFor(() => expect(screen.getAllByRole("combobox")).toHaveLength(2));

    const [select1] = screen.getAllByRole("combobox");
    fireEvent.change(select1, { target: { value: "instr-1" } });
    expect(select1).toHaveValue("instr-1");

    // simulate a reload (e.g. after confirming/declining another booking)
    vi.mocked(listSchoolBookings).mockResolvedValue([
      makeBooking({ id: "booking-1", preferred_instructor_id: "instr-2" }),
    ]);
    rerender(<RequestsInbox schoolId="school-1" refreshKey={1} />);

    await waitFor(() => expect(screen.getAllByRole("combobox")).toHaveLength(1));
    expect(screen.getByRole("combobox")).toHaveValue("instr-1");
  });
});
