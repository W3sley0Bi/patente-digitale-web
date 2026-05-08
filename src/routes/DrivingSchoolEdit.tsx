import { useEffect, useState } from "react";
import { Link } from "react-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { SchoolEditor } from "@/components/driving-school/SchoolEditor";
import type { SchoolEditorData } from "@/components/driving-school/SchoolEditor";

export default function DrivingSchoolEdit() {
  const { user } = useAuth();
  const [data, setData] = useState<SchoolEditorData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("claimed_schools")
      .select("*")
      .eq("user_id", user.id)
      .single()
      .then(({ data: row }) => {
        setData(row as SchoolEditorData | null);
        setLoading(false);
      });
  }, [user]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/driving-school/dashboard" className="text-sm underline text-ink-muted">
          &larr; Dashboard
        </Link>
        <h1 className="text-2xl font-bold">Edit your listing</h1>
      </div>

      {user && data ? (
        <SchoolEditor initial={data} userId={user.id} />
      ) : (
        <p className="text-ink-muted text-sm">
          No school data found. Contact{" "}
          <a href="mailto:support@patentedigitale.it" className="underline">support</a>.
        </p>
      )}
    </div>
  );
}
