import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router";
import { LayoutDashboard, BookOpen, LogOut, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";

function dicebearUrl(seed: string) {
	return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&radius=50`;
}

export function UserMenu({ onClose }: { onClose?: () => void }) {
	const { t } = useTranslation();
	const navigate = useNavigate();
	const { user, signOut } = useAuth();
	const { role } = useProfile();
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	const dashboardHref =
		role === "autoscuola" ? "/driving-school/dashboard" : "/student/dashboard";

	const handleLogout = async () => {
		setOpen(false);
		onClose?.();
		await signOut();
		navigate("/");
	};

	if (!user) {
		return (
			<Link to="/login" onClick={onClose}>
				<Button variant="ghost" size="sm" className="gap-1.5">
					<User className="h-4 w-4" />
					{t("landing.nav.signIn")}
				</Button>
			</Link>
		);
	}

	const seed = user.email ?? user.id;

	// When rendered inside the mobile drawer, show menu items inline to avoid
	// dropdown clipping caused by the Sheet's overflow-hidden container.
	if (onClose) {
		return (
			<div className="flex flex-col">
				<Link
					to={dashboardHref}
					onClick={onClose}
					className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-brand-soft/30 hover:text-brand transition-colors rounded-lg"
				>
					<LayoutDashboard size={15} className="text-ink-muted" />
					{t("landing.nav.dashboard")}
				</Link>
				<Link
					to="/quiz"
					onClick={onClose}
					className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-brand-soft/30 hover:text-brand transition-colors rounded-lg"
				>
					<BookOpen size={15} className="text-ink-muted" />
					{t("landing.nav.quizOnline")}
				</Link>
				<button
					type="button"
					onClick={handleLogout}
					className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-red-50 hover:text-red-600 transition-colors rounded-lg"
				>
					<LogOut size={15} className="text-ink-muted" />
					{t("landing.nav.logout")}
				</button>
			</div>
		);
	}

	return (
		<div className="relative" ref={ref}>
			<button
				type="button"
				onClick={() => setOpen((o) => !o)}
				className="flex items-center justify-center h-8 w-8 rounded-full overflow-hidden opacity-90 hover:opacity-100 transition-opacity focus:outline-none"
				aria-label="User menu"
			>
				<img src={dicebearUrl(seed)} alt="avatar" className="h-6 w-6" />
			</button>

			{open && (
				<div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl border border-line bg-bg shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100">
					<div className="py-1">
						<Link
							to={dashboardHref}
							onClick={() => { setOpen(false); onClose?.(); }}
							className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-brand-soft/30 hover:text-brand transition-colors"
						>
							<LayoutDashboard size={15} className="text-ink-muted" />
							{t("landing.nav.dashboard")}
						</Link>
						<Link
							to="/quiz"
							onClick={() => { setOpen(false); onClose?.(); }}
							className="flex items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-brand-soft/30 hover:text-brand transition-colors"
						>
							<BookOpen size={15} className="text-ink-muted" />
							{t("landing.nav.quizOnline")}
						</Link>
					</div>

					<div className="border-t border-line py-1">
						<button
							type="button"
							onClick={handleLogout}
							className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-ink hover:bg-red-50 hover:text-red-600 transition-colors"
						>
							<LogOut size={15} className="text-ink-muted" />
							{t("landing.nav.logout")}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
