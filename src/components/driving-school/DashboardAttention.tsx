import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";

export interface AttentionItem {
	id: string;
	type: "enrollment" | "booking";
	name: string;
	createdAt: string; // ISO
	href: string;
}

export function DashboardAttention({ items }: { items: AttentionItem[] }) {
	const { t, i18n } = useTranslation();
	const visible = items.slice(0, 5);
	const overflow = items.slice(5);

	return (
		<div className="mt-6 rounded-2xl border border-line bg-bg-raised p-6">
			<p className="text-xs font-bold uppercase tracking-wide text-ink-muted">
				{t("school.dashboard.attention.title")}
			</p>
			{visible.length === 0 ? (
				<p className="mt-2 text-sm text-ink-muted">
					{t("school.dashboard.attention.empty")}
				</p>
			) : (
				<ul className="mt-3 divide-y divide-line">
					{visible.map((item) => (
						<li key={`${item.type}-${item.id}`}>
							<Link
								to={item.href}
								className="flex items-center justify-between gap-3 py-2.5 text-sm transition-colors hover:text-brand"
							>
								<span className="min-w-0 truncate">
									<span className="font-semibold">{item.name}</span>{" "}
									<span className="text-ink-muted">
										{t(`school.dashboard.attention.type.${item.type}`)}
									</span>
								</span>
								<span className="shrink-0 text-xs text-ink-faint">
									{new Date(item.createdAt).toLocaleDateString(i18n.language, {
										day: "numeric",
										month: "short",
									})}
								</span>
							</Link>
						</li>
					))}
				</ul>
			)}
			{overflow.length > 0 && (
				<Link
					to={overflow[0].href}
					className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
				>
					{t("school.dashboard.attention.viewAll")}
					<ArrowRight size={12} aria-hidden="true" />
				</Link>
			)}
		</div>
	);
}
