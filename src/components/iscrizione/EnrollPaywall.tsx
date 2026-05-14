import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { X, ArrowRight, CreditCard, LogOut, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

interface EnrollPaywallProps {
	open: boolean;
	onClose: () => void;
	schoolName: string;
	licenceCode: string;
	displayPrice: string;
	returnTo: string;
}

export function EnrollPaywall({
	open,
	onClose,
	schoolName,
	licenceCode,
	displayPrice,
	returnTo,
}: EnrollPaywallProps) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { user, loading: authLoading, signOut } = useAuth();
	const { role, loading: profileLoading } = useProfile();

	// Close on Escape
	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [open, onClose]);

	// Body scroll lock
	useEffect(() => {
		if (!open) return;
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			document.body.style.overflow = prev;
		};
	}, [open]);

	if (!open) return null;

	const isLoading = authLoading || profileLoading;
	const nextParam = encodeURIComponent(returnTo);
	const signupHref = `/login?tab=signup&next=${nextParam}`;
	const loginHref = `/login?next=${nextParam}`;

	const handleSignOut = async () => {
		await signOut();
		navigate(signupHref);
	};

	return (
		<div
			className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm"
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
			role="dialog"
			aria-modal="true"
		>
			<div className="relative w-full max-w-md rounded-2xl bg-bg-raised shadow-xl border border-line">
				{/* Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-line">
					<div className="flex items-center gap-2">
						<div className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1">
							<span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
							<span className="font-sans text-[10px] font-black uppercase tracking-widest text-accent-ink">
								Anteprima
							</span>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						aria-label={t("iscrizione.paywall.closeLabel")}
						className="text-ink-faint hover:text-ink transition-colors"
					>
						<X className="h-5 w-5" />
					</button>
				</div>

				{/* Body */}
				<div className="px-5 py-6 md:px-7 md:py-7">
					{isLoading ? (
						<div className="flex items-center justify-center py-8">
							<div className="h-6 w-6 animate-pulse rounded-full bg-brand/20" />
						</div>
					) : !user ? (
						<GuestState
							onSignup={() => navigate(signupHref)}
							onLogin={() => navigate(loginHref)}
							schoolName={schoolName}
						/>
					) : role === "autoscuola" ? (
						<AutoscuolaState onSignOut={handleSignOut} />
					) : (
						<StudentState
							schoolName={schoolName}
							licenceCode={licenceCode}
							displayPrice={displayPrice}
						/>
					)}
				</div>
			</div>
		</div>
	);
}

function GuestState({
	onSignup,
	onLogin,
	schoolName,
}: {
	onSignup: () => void;
	onLogin: () => void;
	schoolName: string;
}) {
	const { t } = useTranslation();
	return (
		<div className="flex flex-col gap-5">
			<div className="flex items-start gap-3">
				<div className="shrink-0 h-10 w-10 rounded-xl bg-brand-soft flex items-center justify-center">
					<UserPlus className="h-5 w-5 text-brand" />
				</div>
				<div>
					<h3 className="font-sans text-base font-black text-ink">
						{t("iscrizione.paywall.guest.heading")}
					</h3>
					<p className="mt-1 font-sans text-sm text-ink-muted leading-relaxed">
						{t("iscrizione.paywall.guest.body", { name: schoolName })}
					</p>
				</div>
			</div>
			<div className="flex flex-col gap-2 mt-2">
				<button
					type="button"
					onClick={onSignup}
					className="inline-flex items-center justify-center gap-2 h-11 w-full rounded-pill bg-brand text-white font-sans text-sm font-bold hover:bg-brand-hover transition-colors shadow-cta"
				>
					{t("iscrizione.paywall.guest.primaryCta")}
					<ArrowRight className="h-4 w-4" />
				</button>
				<button
					type="button"
					onClick={onLogin}
					className="font-sans text-xs font-bold text-ink-muted hover:text-brand transition-colors py-2"
				>
					{t("iscrizione.paywall.guest.secondaryCta")}
				</button>
			</div>
		</div>
	);
}

function AutoscuolaState({ onSignOut }: { onSignOut: () => void }) {
	const { t } = useTranslation();
	return (
		<div className="flex flex-col gap-5">
			<div className="flex items-start gap-3">
				<div className="shrink-0 h-10 w-10 rounded-xl bg-accent-soft flex items-center justify-center">
					<LogOut className="h-5 w-5 text-accent-ink" />
				</div>
				<div>
					<h3 className="font-sans text-base font-black text-ink">
						{t("iscrizione.paywall.autoscuola.heading")}
					</h3>
					<p className="mt-1 font-sans text-sm text-ink-muted leading-relaxed">
						{t("iscrizione.paywall.autoscuola.body")}
					</p>
				</div>
			</div>
			<button
				type="button"
				onClick={onSignOut}
				className="inline-flex items-center justify-center gap-2 h-11 w-full rounded-pill bg-brand text-white font-sans text-sm font-bold hover:bg-brand-hover transition-colors shadow-cta"
			>
				<LogOut className="h-4 w-4" />
				{t("iscrizione.paywall.autoscuola.primaryCta")}
			</button>
		</div>
	);
}

function StudentState({
	schoolName,
	licenceCode,
	displayPrice,
}: {
	schoolName: string;
	licenceCode: string;
	displayPrice: string;
}) {
	const { t } = useTranslation();
	return (
		<div className="flex flex-col gap-5">
			<div className="flex items-start gap-3">
				<div className="shrink-0 h-10 w-10 rounded-xl bg-brand-soft flex items-center justify-center">
					<CreditCard className="h-5 w-5 text-brand" />
				</div>
				<div>
					<h3 className="font-sans text-base font-black text-ink">
						{t("iscrizione.paywall.student.heading")}
					</h3>
					<p className="mt-1 font-sans text-sm text-ink-muted leading-relaxed">
						{t("iscrizione.paywall.student.body")}
					</p>
				</div>
			</div>

			<div className="rounded-xl border border-line bg-bg-sunken/30 p-4">
				<p className="font-sans text-xs text-ink-faint">
					{t("iscrizione.paywall.student.summary", {
						name: schoolName,
						code: licenceCode,
					})}
				</p>
				<div className="mt-3 flex items-baseline justify-between">
					<span className="font-sans text-xs font-bold uppercase tracking-widest text-ink-muted">
						{t("iscrizione.paywall.student.totalLabel")}
					</span>
					<span className="font-sans text-2xl font-black text-brand leading-none">
						{displayPrice}
					</span>
				</div>
			</div>

			<div className="flex items-center justify-between gap-3 pt-1">
				<span className="font-sans text-[10px] text-ink-faint italic">
					{t("iscrizione.paywall.student.mockLabel")}
				</span>
				<button
					type="button"
					data-mockup-cta="paywall-continue"
					disabled
					className="inline-flex items-center gap-1.5 rounded-md border border-line bg-bg-sunken px-3 py-1.5 font-sans text-xs font-bold text-ink-faint cursor-not-allowed"
				>
					{t("iscrizione.paywall.student.primaryCta")}
				</button>
			</div>
		</div>
	);
}
