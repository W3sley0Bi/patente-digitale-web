import { Headset, Menu, User, X, Mail, MessageCircle } from "lucide-react";
import { useEffect, useState, useRef } from "react";
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
	{ href: "/#how-it-works", label: "landing.nav.howItWorks" },
	{ href: "/#partner", label: "landing.nav.partners" },
	{ href: "/cerca", label: "landing.nav.findSchool" },
	{ href: "/#faq", label: "landing.nav.faq" },
];

export function Nav() {
	const { t } = useTranslation();
	const [isScrolled, setIsScrolled] = useState(false);
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const [isContactOpen, setIsContactOpen] = useState(false);
	const contactRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (
				contactRef.current &&
				!contactRef.current.contains(event.target as Node)
			) {
				setIsContactOpen(false);
			}
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	useEffect(() => {
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

	const NavLink = ({ href, label }: { href: string; label: string }) => {
		const isInternal = href.startsWith("/");
		const className = "font-sans text-sm font-medium text-ink-muted transition-colors hover:text-brand";

		if (isInternal) {
			return (
				<Link to={href} className={className}>
					{t(label)}
				</Link>
			);
		}

		return (
			<a href={href} className={className}>
				{t(label)}
			</a>
		);
	};

	const MobileNavLink = ({ href, label }: { href: string; label: string }) => {
		const isInternal = href.startsWith("/");
		const className = "flex items-center px-5 py-4 font-sans text-base font-semibold text-ink border-b border-line/60 hover:bg-brand-soft/30 hover:text-brand transition-colors";

		if (isInternal) {
			return (
				<Link
					to={href}
					onClick={() => setIsMenuOpen(false)}
					className={className}
				>
					{t(label)}
				</Link>
			);
		}

		return (
			<a
				href={href}
				onClick={() => setIsMenuOpen(false)}
				className={className}
			>
				{t(label)}
			</a>
		);
	};

	const ContactDropdown = () => (
		<div className="relative" ref={contactRef}>
			<button
				type="button"
				onClick={() => setIsContactOpen(!isContactOpen)}
				className="flex items-center justify-center p-2 text-ink-muted hover:text-brand transition-colors outline-none"
				title={t("landing.nav.contact")}
			>
				<Headset className="h-5 w-5" />
			</button>

			{isContactOpen && (
				<div className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-lg border border-line bg-bg-raised shadow-lg animate-in fade-in zoom-in-95 duration-100 z-50">
					<div className="py-1">
						<a
							href="mailto:supporto@patentedigitale.it"
							onClick={() => setIsContactOpen(false)}
							className="flex w-full items-center gap-3 px-4 py-2.5 text-left font-sans text-sm text-ink transition-colors hover:bg-brand-soft/30 hover:text-brand"
						>
							<Mail size={16} />
							<span>Email</span>
						</a>
						<button
							type="button"
							className="flex w-full items-center gap-3 px-4 py-2.5 text-left font-sans text-sm text-ink transition-colors hover:bg-brand-soft/30 hover:text-brand"
						>
							<MessageCircle size={16} />
							<span>WhatsApp</span>
						</button>
					</div>
				</div>
			)}
		</div>
	);

	return (
		<header
			className={`fixed top-0 z-[60] w-full transition-all duration-300 ${
				isScrolled || isMenuOpen ? "bg-bg/90 shadow-sm backdrop-blur-md" : "bg-transparent"
			}`}
		>
			<nav className="mx-auto flex h-20 max-w-(--container-wide) items-center justify-between px-4 lg:px-8">
				{/* Logo */}
				<Link
					to="/"
					onClick={() => setIsMenuOpen(false)}
					className="flex items-center gap-2.5"
				>
					<Mascot size="sm" />
					<Wordmark />
				</Link>

				{/* Desktop links */}
				<div className="hidden items-center gap-8 md:flex">
					{NAV_LINKS.map((link) => (
						<NavLink key={link.href} {...link} />
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
					<ContactDropdown />
				</div>

				{/* Mobile actions */}
				<div className="flex items-center gap-1 md:hidden">
					<Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
						<SheetTrigger render={<Button variant="ghost" size="icon" className="relative z-[60]" />}>
							{isMenuOpen ? (
								<X className="h-5 w-5" />
							) : (
								<Menu className="h-5 w-5" />
							)}
							<span className="sr-only">
								{isMenuOpen ? "Chiudi menu" : "Apri menu"}
							</span>
						</SheetTrigger>

						<SheetContent
							side="right"
							showCloseButton={false}
							className="flex flex-col gap-0 p-0 w-[min(320px,88vw)] bg-bg"
						>
							<SheetTitle className="sr-only">Menu</SheetTitle>

							{/* Drawer header */}
							<div className="flex items-center justify-between border-b border-line px-5 py-4 h-20">
								<Link
									to="/"
									onClick={() => setIsMenuOpen(false)}
									className="flex items-center gap-2.5"
								>
									<Mascot size="sm" />
									<Wordmark />
								</Link>
							</div>

							{/* Nav links */}
							<nav className="flex flex-col flex-1 overflow-y-auto">
								{NAV_LINKS.map((link) => (
									<MobileNavLink key={link.href} {...link} />
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
									onClick={() => setIsMenuOpen(false)}
									className="flex items-center gap-2 font-sans text-sm text-ink-muted hover:text-ink transition-colors py-1"
								>
									<User className="h-4 w-4" />
									{t("landing.nav.signIn")}
								</Link>
							</div>
						</SheetContent>
					</Sheet>
					<ContactDropdown />
				</div>
			</nav>
		</header>
	);
}
