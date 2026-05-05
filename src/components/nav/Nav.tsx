import { MapPin, Menu, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { Mascot, Wordmark } from "../brand/Brand";
import { LangSwitch } from "./LangSwitch";

const NAV_LINKS = [
	{ href: "#how-it-works", label: "landing.nav.howItWorks" },
	{ href: "#autoscuole", label: "landing.nav.autoscuole" },
	{ href: "#partner", label: "landing.nav.partners" },
	{ href: "#faq", label: "landing.nav.faq" },
];

export function Nav() {
	const { t } = useTranslation();
	const [isScrolled, setIsScrolled] = useState(false);

	useEffect(() => {
		// Use IntersectionObserver instead of scroll listener for performance
		const observer = new IntersectionObserver(
			([entry]) => {
				setIsScrolled(!entry.isIntersecting);
			},
			{ threshold: [1], rootMargin: "-8px 0px 0px 0px" },
		);

		const sentinel = document.createElement("div");
		sentinel.style.position = "absolute";
		sentinel.style.top = "0";
		sentinel.style.height = "1px";
		sentinel.style.width = "1px";
		sentinel.style.pointerEvents = "none";
		document.body.prepend(sentinel);

		observer.observe(sentinel);

		return () => {
			observer.disconnect();
			sentinel.remove();
		};
	}, []);

	return (
		<header
			className={`fixed top-0 z-50 w-full transition-all duration-300 ${
				isScrolled ? "bg-bg/90 shadow-sm backdrop-blur-md" : "bg-transparent"
			}`}
		>
			<nav className="mx-auto flex h-20 max-w-(--container-wide) items-center justify-between px-4 lg:px-8">
				{/* Logo */}
				<Link to="/" className="flex items-center gap-2.5">
					<Mascot size="sm" />
					<Wordmark />
				</Link>

				{/* Desktop links */}
				<div className="hidden items-center gap-8 md:flex">
					{NAV_LINKS.map((link) => (
						<a
							key={link.href}
							href={link.href}
							className="font-sans text-sm font-medium text-ink-muted transition-colors hover:text-brand"
						>
							{t(link.label)}
						</a>
					))}
				</div>

				{/* Desktop actions */}
				<div className="hidden items-center gap-3 md:flex">
					<LangSwitch />
					<Link to="/accedi">
						<Button variant="ghost" size="sm" className="gap-1.5">
							<User className="h-4 w-4" />
							{t("landing.nav.signIn")}
						</Button>
					</Link>
					<Link to="/cerca">
						<Button
							size="sm"
							className="gap-1.5 rounded-pill bg-brand text-white hover:bg-brand-hover shadow-cta font-semibold"
						>
							<MapPin className="h-4 w-4" />
							{t("landing.nav.findSchool")}
						</Button>
					</Link>
				</div>

				{/* Mobile burger */}
				<div className="flex items-center md:hidden">
					<Sheet>
						<SheetTrigger
							render={
								<Button variant="ghost" size="icon">
									<Menu className="h-5 w-5" />
									<span className="sr-only">Apri menu</span>
								</Button>
							}
						/>

						<SheetContent
							side="right"
							showCloseButton={false}
							className="flex flex-col gap-0 p-0 w-[min(320px,88vw)] bg-bg"
						>
							<SheetTitle className="sr-only">Menu</SheetTitle>

							{/* Drawer header */}
							<div className="flex items-center justify-between border-b border-line px-5 py-4">
								<Link to="/" className="flex items-center gap-2.5">
									<Mascot size="sm" />
									<Wordmark />
								</Link>
							</div>

							{/* Nav links */}
							<nav className="flex flex-col flex-1 overflow-y-auto">
								{NAV_LINKS.map((link) => (
									<a
										key={link.href}
										href={link.href}
										className="flex items-center px-5 py-4 font-sans text-base font-semibold text-ink border-b border-line/60 hover:bg-brand-soft/30 hover:text-brand transition-colors"
									>
										{t(link.label)}
									</a>
								))}
							</nav>

							{/* Drawer footer */}
							<div className="border-t border-line px-5 py-5 flex flex-col gap-3">
								<div className="flex items-center justify-between">
									<span className="font-sans text-xs uppercase tracking-widest text-ink-faint">
										Lingua
									</span>
									<LangSwitch />
								</div>
								<Link
									to="/accedi"
									className="flex items-center gap-2 font-sans text-sm text-ink-muted hover:text-ink transition-colors py-1"
								>
									<User className="h-4 w-4" />
									{t("landing.nav.signIn")}
								</Link>
								<Link to="/cerca">
									<Button className="w-full gap-2 rounded-pill bg-brand text-white hover:bg-brand-hover shadow-cta h-12 font-bold text-base">
										<MapPin className="h-4 w-4" />
										{t("landing.nav.findSchool")}
									</Button>
								</Link>
							</div>
						</SheetContent>
					</Sheet>
				</div>
			</nav>
		</header>
	);
}
