import { useEffect, useState } from "react";
import { Link } from "react-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { DashboardPending } from "@/components/driving-school/DashboardPending";
import { buttonVariants } from "@/components/ui/button";

interface ClaimRow {
  status: "pending" | "approved" | "rejected";
  school_name: string;
}

export default function DrivingSchoolDashboard() {
  const { user } = useAuth();
  const { approved } = useProfile();
  const [claim, setClaim] = useState<ClaimRow | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("pending_claims")
      .select("status, school_name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setClaim(data as ClaimRow);
      });
  }, [user]);

  if (!approved) {
    const pendingStatus = claim?.status === "rejected" ? "rejected" : "pending";
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <DashboardPending status={pendingStatus} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">{claim?.school_name ?? "Your driving school"}</h1>
      <p className="text-ink-muted mt-1 text-sm">Manage your listing on patentedigitale.it</p>
      <div className="mt-6">
        <Link to="/driving-school/dashboard/edit" className={buttonVariants()}>
          Edit my listing
        </Link>
      </div>
    </div>
  );
}
