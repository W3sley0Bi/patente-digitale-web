import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/AuthContext", () => ({
  useAuthContext: vi.fn(),
}));

import { useProfile } from "@/hooks/useProfile";
import { useAuthContext } from "@/lib/AuthContext";

describe("useProfile", () => {
  it("returns role and approved from auth context", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      session: null,
      user: { id: "u1" } as never,
      authLoading: false,
      profile: { id: "u1", role: "student", approved: true, full_name: "Mario" },
      role: "student",
      approved: true,
      profileLoading: false,
      profileError: null,
      refreshProfile: async () => {},
      signOut: async () => {},
    });
    const r = useProfile();
    expect(r.role).toBe("student");
    expect(r.approved).toBe(true);
    expect(r.loading).toBe(false);
  });

  it("returns null role when no user is logged in", () => {
    vi.mocked(useAuthContext).mockReturnValue({
      session: null,
      user: null,
      authLoading: false,
      profile: null,
      role: null,
      approved: false,
      profileLoading: false,
      profileError: null,
      refreshProfile: async () => {},
      signOut: async () => {},
    });
    const r = useProfile();
    expect(r.role).toBeNull();
  });
});
