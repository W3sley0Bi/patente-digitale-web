import {
	Check,
	ChevronRight,
	Languages,
	LayoutDashboard,
	LogOut,
	User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";

const LANGUAGES = [
	{ code: "it", label: "Italiano", flag: "🇮🇹" },
	{ code: "en", label: "English", flag: "🇬🇧" },
	{ code: "ar", label: "العربية", flag: "🇸🇦" },
];

function dicebearUrl(seed: string) {
	return `https://api.dicebear.com/9.x/thumbs/svg?seed=${encodeURIComponent(seed)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf&radius=50`;
}

export function UserMenu() {
	const { t, i18n } = useTranslation();
	const navigate = useNavigate();
	const { user, signOut } = useAuth();
	const { role } = useProfile();
	const isMobile = useIsMobile();
	const [open, setOpen] = useState(false);
	const [langOpen, setLangOpen] = useState(false);
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

	useEffect(() => {
		if (!open) setLangOpen(false);
	}, [open]);

	const changeLanguage = (code: string) => {
		i18n.changeLanguage(code);
		setLangOpen(false);
		setOpen(false);
	};

	const location = useLocation();
	const dashboardHref =
		role === "autoscuola" ? "/app/driving-school" : "/app/student";
	const isInApp = location.pathname.startsWith("/app");
	const switchHref = isInApp ? "/" : dashboardHref;
	const switchLabel = isInApp
		? t("landing.nav.goToWebsite")
		: t("landing.nav.goToApp");

	const handleLogout = async () => {
		setOpen(false);
		await signOut();
		navigate("/");
	};

	if (!user) {
		return (
			<Link to="/app/login">
				<Button variant="ghost" size="sm" className="gap-1.5">
					<User className="h-4 w-4" />
					{t("landing.nav.signIn")}
				</Button>
			</Link>
		);
	}

	const seed = user.email ?? user.id;
	const currentLang =
		LANGUAGES.find((lang) => lang.code === i18n.language) ?? LANGUAGES[0];

	const avatarButton = (
		<button
			type="button"
			onClick={() => setOpen((o) => !o)}
			className="flex items-center justify-center h-8 w-8 rounded-full overflow-hidden opacity-90 hover:opacity-100 transition-opacity focus:outline-none"
			aria-label="User menu"
		>
			<img src={dicebearUrl(seed)} alt="avatar" className="h-6 w-6" />
		</button>
	);

	if (isMobile) {
		return (
			<>
				{avatarButton}
				<Sheet open={open} onOpenChange={setOpen}>
					<SheetContent
						side="bottom"
						className="flex flex-col gap-0 p-0 rounded-t-2xl"
					>
						<SheetTitle className="sr-only">
							{t("landing.nav.signIn")}
						</SheetTitle>
						<div className="flex flex-col py-2">
							<Link
								to={switchHref}
								onClick={() => setOpen(false)}
								className="flex items-center gap-3 px-5 py-4 text-base font-medium leading-none text-ink border-b border-line/60 hover:bg-brand-soft/30 hover:text-brand transition-colors"
							>
								<LayoutDashboard size={18} className="text-ink-muted" />
								{switchLabel}
							</Link>

							<button
								type="button"
								onClick={() => setLangOpen((o) => !o)}
								className="flex w-full items-center justify-between gap-3 px-5 py-4 text-base font-medium leading-none text-ink border-b border-line/60 hover:bg-brand-soft/30 hover:text-brand transition-colors"
							>
								<span className="flex items-center gap-3">
									<Languages size={18} className="text-ink-muted" />
									{t("landing.nav.language")}
								</span>
								<span className="flex items-center gap-1.5 text-ink-muted">
									<span className="text-base leading-none">
										{currentLang.flag}
									</span>
									<span className="text-sm uppercase leading-none">
										{currentLang.code}
									</span>
									<ChevronRight
										size={16}
										className={cn(
											"transition-transform",
											langOpen && "rotate-90",
										)}
									/>
								</span>
							</button>
							{langOpen && (
								<div className="flex flex-col border-b border-line/60 bg-brand-soft/10">
									{LANGUAGES.map((lang) => (
										<button
											key={lang.code}
											type="button"
											onClick={() => changeLanguage(lang.code)}
											className="flex items-center justify-between gap-3 px-5 py-3 text-sm leading-none text-ink hover:bg-brand-soft/30 hover:text-brand transition-colors"
										>
											<span className="flex items-center gap-3">
												<span className="w-[18px] text-center text-base leading-none">
													{lang.flag}
												</span>
												{lang.label}
											</span>
											{i18n.language === lang.code && (
												<Check size={16} className="text-brand" />
											)}
										</button>
									))}
								</div>
							)}

							<button
								type="button"
								onClick={handleLogout}
								className="flex w-full items-center gap-3 px-5 py-4 text-base font-medium leading-none text-ink hover:bg-red-50 hover:text-red-600 transition-colors"
							>
								<LogOut size={18} className="text-ink-muted" />
								{t("landing.nav.logout")}
							</button>
						</div>
					</SheetContent>
				</Sheet>
			</>
		);
	}

	return (
		<div className="relative" ref={ref}>
			{avatarButton}

			{open && (
				<div className="absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-xl border border-line bg-bg shadow-lg z-50 animate-in fade-in zoom-in-95 duration-100">
					<div className="py-1">
						<Link
							to={switchHref}
							onClick={() => setOpen(false)}
							className="flex items-center gap-3 px-4 py-2.5 text-sm leading-none text-ink hover:bg-brand-soft/30 hover:text-brand transition-colors"
						>
							<LayoutDashboard size={15} className="text-ink-muted" />
							{switchLabel}
						</Link>

						<button
							type="button"
							onClick={() => setLangOpen((o) => !o)}
							className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-sm leading-none text-ink hover:bg-brand-soft/30 hover:text-brand transition-colors"
						>
							<span className="flex items-center gap-3">
								<Languages size={15} className="text-ink-muted" />
								{t("landing.nav.language")}
							</span>
							<span className="flex items-center gap-1 text-ink-muted">
								<span className="text-sm leading-none">{currentLang.flag}</span>
								<span className="text-xs uppercase leading-none">
									{currentLang.code}
								</span>
								<ChevronRight
									size={14}
									className={cn(
										"transition-transform",
										langOpen && "rotate-90",
									)}
								/>
							</span>
						</button>
						{langOpen && (
							<div className="flex flex-col bg-brand-soft/10">
								{LANGUAGES.map((lang) => (
									<button
										key={lang.code}
										type="button"
										onClick={() => changeLanguage(lang.code)}
										className="flex items-center justify-between gap-3 px-4 py-2 text-sm leading-none text-ink hover:bg-brand-soft/30 hover:text-brand transition-colors"
									>
										<span className="flex items-center gap-3">
											<span className="w-[15px] text-center text-sm leading-none">
												{lang.flag}
											</span>
											{lang.label}
										</span>
										{i18n.language === lang.code && (
											<Check size={14} className="text-brand" />
										)}
									</button>
								))}
							</div>
						)}
					</div>

					<div className="border-t border-line py-1">
						<button
							type="button"
							onClick={handleLogout}
							className="flex w-full items-center gap-3 px-4 py-2.5 text-sm leading-none text-ink hover:bg-red-50 hover:text-red-600 transition-colors"
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
