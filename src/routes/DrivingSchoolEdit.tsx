import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import { DrivingSchoolLayout } from "@/components/driving-school/DrivingSchoolLayout";
import { SchoolEditor } from "@/components/driving-school/SchoolEditor";
import { useSchoolProfile } from "@/hooks/useSchoolProfile";

export default function DrivingSchoolEdit() {
	const { t } = useTranslation();
	const { data, loading, userId } = useSchoolProfile();
	const navigate = useNavigate();

	if (loading) {
		return (
			<DrivingSchoolLayout>
				<div className="flex items-center justify-center py-20">
					<div className="h-6 w-6 animate-pulse rounded-full bg-brand/20" />
				</div>
			</DrivingSchoolLayout>
		);
	}

	return (
		<DrivingSchoolLayout>
			<Link
				to="/app/driving-school/profile"
				className="mb-4 inline-block text-xs text-ink-muted hover:text-ink"
			>
				{t("school.edit.backToProfile")}
			</Link>
			<h1 className="text-2xl font-bold mb-6">{t("school.edit.title")}</h1>
			{userId && data ? (
				<SchoolEditor
					initial={data}
					userId={userId}
					onSaved={() => navigate("/app/driving-school/profile")}
				/>
			) : (
				<p className="text-ink-muted text-sm">
					{t("school.edit.noData")}{" "}
					<a href="mailto:support@patentedigitale.it" className="underline">
						{t("school.edit.support")}
					</a>
					.
				</p>
			)}
		</DrivingSchoolLayout>
	);
}
