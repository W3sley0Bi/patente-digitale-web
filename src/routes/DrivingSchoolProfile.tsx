import { Pencil } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { DrivingSchoolLayout } from "@/components/driving-school/DrivingSchoolLayout";
import { Button } from "@/components/ui/button";
import { useSchoolProfile } from "@/hooks/useSchoolProfile";

const sectionHeader =
	"text-sm font-bold uppercase tracking-wider text-ink-faint mb-3";
const labelSpan = "text-xs font-medium text-ink-muted uppercase tracking-wide";

function Field({ label, value }: { label: string; value?: string | number | null }) {
	if (value === null || value === undefined || value === "") return null;
	return (
		<div className="flex flex-col gap-0.5 text-sm">
			<span className={labelSpan}>{label}</span>
			<span>{value}</span>
		</div>
	);
}

export default function DrivingSchoolProfile() {
	const { t } = useTranslation();
	const { data, loading } = useSchoolProfile();

	if (loading) {
		return (
			<DrivingSchoolLayout>
				<div className="flex items-center justify-center py-20">
					<div className="h-6 w-6 animate-pulse rounded-full bg-brand/20" />
				</div>
			</DrivingSchoolLayout>
		);
	}

	if (!data) {
		return (
			<DrivingSchoolLayout>
				<h1 className="text-2xl font-bold mb-6">{t("school.profile.title")}</h1>
				<p className="text-ink-muted text-sm">
					{t("school.edit.noData")}{" "}
					<a href="mailto:support@patentedigitale.it" className="underline">
						{t("school.edit.support")}
					</a>
					.
				</p>
			</DrivingSchoolLayout>
		);
	}

	const licenses = Array.isArray(data.licenses) ? data.licenses : [];
	const prices = data.prices ?? {};
	const social = data.social ?? {};
	const hours = Array.isArray(data.opening_hours) ? data.opening_hours : [];

	return (
		<DrivingSchoolLayout>
			<div className="mb-6 flex items-center justify-between gap-4">
				<h1 className="text-2xl font-bold">{t("school.profile.title")}</h1>
				<Button render={<Link to="/app/driving-school/profile/edit" />}>
					<Pencil size={14} />
					{t("school.profile.edit")}
				</Button>
			</div>

			<div className="flex flex-col gap-8">
				<section>
					<h2 className={sectionHeader}>{t("school.editor.sections.identity")}</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field label={t("school.editor.fields.name")} value={data.name} />
						<Field label={t("school.editor.fields.piva")} value={data.piva} />
						<Field
							label={t("school.editor.fields.founded_year")}
							value={data.founded_year}
						/>
					</div>
					{data.description && (
						<p className="mt-4 text-sm whitespace-pre-wrap">{data.description}</p>
					)}
				</section>

				<section>
					<h2 className={sectionHeader}>{t("school.editor.sections.contacts")}</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field label={t("school.editor.fields.phone")} value={data.phone} />
						<Field label={t("school.editor.fields.mobile")} value={data.mobile} />
						<Field label={t("school.editor.fields.email")} value={data.email} />
						<Field
							label={t("school.editor.fields.whatsapp_business")}
							value={data.whatsapp_business}
						/>
						<Field
							label={t("school.editor.fields.website")}
							value={data.website}
						/>
					</div>
				</section>

				<section>
					<h2 className={sectionHeader}>{t("school.editor.sections.address")}</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<Field label={t("school.editor.fields.address")} value={data.address} />
						<Field label={t("school.editor.fields.city")} value={data.city} />
						<Field label={t("school.editor.fields.zip")} value={data.zip} />
						<Field label={t("school.editor.fields.region")} value={data.region} />
					</div>
				</section>

				{hours.length > 0 && (
					<section>
						<h2 className={sectionHeader}>{t("school.editor.sections.hours")}</h2>
						<ul className="flex flex-col gap-1 text-sm">
							{hours.map((h) => (
								<li key={h}>{h}</li>
							))}
						</ul>
					</section>
				)}

				{licenses.length > 0 && (
					<section>
						<h2 className={sectionHeader}>
							{t("school.editor.sections.licenses")}
						</h2>
						<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
							{licenses.map((l) => (
								<Field
									key={l}
									label={l}
									value={
										typeof prices[l] === "number" ? `€${prices[l]}` : "—"
									}
								/>
							))}
						</div>
					</section>
				)}

				{Object.keys(social).length > 0 && (
					<section>
						<h2 className={sectionHeader}>{t("school.editor.sections.social")}</h2>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{Object.entries(social).map(([key, value]) => (
								<Field
									key={key}
									label={t(`school.editor.fields.social_${key}`)}
									value={value}
								/>
							))}
						</div>
					</section>
				)}
			</div>
		</DrivingSchoolLayout>
	);
}
