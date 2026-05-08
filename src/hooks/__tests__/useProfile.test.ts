import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const mockSingle = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ single: mockSingle }),
      }),
    }),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";

describe("useProfile", () => {
  beforeEach(() => {
    mockSingle.mockResolvedValue({
      data: { id: "u1", role: "student", approved: true, full_name: "Mario" },
      error: null,
    });
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "u1" } as never,
      session: {} as never,
      loading: false,
      signOut: async () => {},
    });
  });

  it("returns role and approved from profiles table", async () => {
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBe("student");
    expect(result.current.approved).toBe(true);
  });

  it("returns null role when no user is logged in", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signOut: async () => {},
    });
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.role).toBeNull();
  });
});
