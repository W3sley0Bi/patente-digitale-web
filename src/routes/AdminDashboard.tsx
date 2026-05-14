import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Nav } from "@/components/nav/Nav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PendingSchool {
  id: string;
  name: string;
  city: string;
  address: string;
  email: string;
  created_at: string;
  piva: string;
}

export default function AdminDashboard() {
  const [schools, setSchools] = useState<PendingSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPending = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("driving_schools")
      .select("id, name, city, address, email, created_at, piva")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching pending schools:", error);
    } else {
      setSchools(data as PendingSchool[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    const { error } = await supabase.rpc("approve_claim", { p_school_id: id });
    if (error) {
      alert(error.message);
    } else {
      setSchools((prev) => prev.filter((s) => s.id !== id));
    }
    setProcessingId(null);
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Reason for rejection:");
    if (reason === null) return;

    setProcessingId(id);
    const { error } = await supabase.rpc("reject_claim", { p_school_id: id, p_reason: reason });
    if (error) {
      alert(error.message);
    } else {
      setSchools((prev) => prev.filter((s) => s.id !== id));
    }
    setProcessingId(null);
  };

  return (
    <div className="min-h-screen bg-bg text-ink">
      <Nav />
      <main className="max-w-5xl mx-auto p-8">
        <header className="mb-8">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-ink-muted">Manage incoming driving school claims.</p>
        </header>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="h-8 w-8 animate-pulse rounded-full bg-brand/20" />
          </div>
        ) : schools.length === 0 ? (
          <div className="text-center p-12 bg-white rounded-xl border border-line">
            <p className="text-ink-muted">No pending claims found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-line overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg border-b border-line">
                <tr>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-ink-muted">School</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-ink-muted">Contact</th>
                  <th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-ink-muted">Requested</th>
                  <th className="px-6 py-4 text-right font-semibold uppercase tracking-wider text-xs text-ink-muted">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {schools.map((school) => (
                  <tr key={school.id} className="hover:bg-bg-soft/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-ink">{school.name}</div>
                      <div className="text-xs text-ink-muted">{school.address}, {school.city}</div>
                      {school.piva && (
                        <div className="mt-1">
                          <Badge variant="outline" className="text-[10px] py-0">P.IVA: {school.piva}</Badge>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-ink">{school.email}</div>
                    </td>
                    <td className="px-6 py-4 text-ink-muted">
                      {new Date(school.created_at).toLocaleDateString("it-IT", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleReject(school.id)}
                          disabled={!!processingId}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(school.id)}
                          disabled={!!processingId}
                        >
                          {processingId === school.id ? "..." : "Approve"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
