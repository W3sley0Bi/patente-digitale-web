import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";

vi.mock("@/hooks/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("@/hooks/useProfile", () => ({ useProfile: vi.fn() }));

import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

function Wrap({ element }: { element: React.ReactNode }) {
  return (
    <MemoryRouter initialEntries={["/protected"]}>
      <Routes>
        <Route path="/protected" element={element} />
        <Route path="/login" element={<div>Login page</div>} />
        <Route path="/driving-school/dashboard" element={<div>DS dashboard</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ user: null, session: null, loading: false, signOut: async () => {} });
    vi.mocked(useProfile).mockReturnValue({ profile: null, role: null, approved: false, loading: false, error: null });
  });

  it("redirects to /login when not authenticated", () => {
    render(<Wrap element={<ProtectedRoute requiredRole="student"><div>Secret</div></ProtectedRoute>} />);
    expect(screen.getByText("Login page")).toBeInTheDocument();
    expect(screen.queryByText("Secret")).not.toBeInTheDocument();
  });

  it("renders children when role matches", () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: "u1" } as never, session: {} as never, loading: false, signOut: async () => {} });
    vi.mocked(useProfile).mockReturnValue({ profile: null, role: "student", approved: true, loading: false, error: null });
    render(<Wrap element={<ProtectedRoute requiredRole="student"><div>Secret</div></ProtectedRoute>} />);
    expect(screen.getByText("Secret")).toBeInTheDocument();
  });

  it("redirects when authenticated but wrong role", () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: "u1" } as never, session: {} as never, loading: false, signOut: async () => {} });
    vi.mocked(useProfile).mockReturnValue({ profile: null, role: "autoscuola", approved: true, loading: false, error: null });
    render(<Wrap element={<ProtectedRoute requiredRole="student"><div>Secret</div></ProtectedRoute>} />);
    expect(screen.queryByText("Secret")).not.toBeInTheDocument();
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("redirects to /driving-school/dashboard when approved=false and requireApproved=true", () => {
    vi.mocked(useAuth).mockReturnValue({ user: { id: "u1" } as never, session: {} as never, loading: false, signOut: async () => {} });
    vi.mocked(useProfile).mockReturnValue({ profile: null, role: "autoscuola", approved: false, loading: false, error: null });
    render(<Wrap element={<ProtectedRoute requiredRole="autoscuola" requireApproved><div>Editor</div></ProtectedRoute>} />);
    expect(screen.queryByText("Editor")).not.toBeInTheDocument();
    expect(screen.getByText("DS dashboard")).toBeInTheDocument();
  });
});
