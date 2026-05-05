import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Mascot } from "../brand/Brand";
import { Nav } from "../nav/Nav";
import { Button } from "../ui/button";
import { Footer } from "./Footer";

export function PlaceholderPage() {
	const { t } = useTranslation();

	return (
		<div className="min-h-screen bg-bg text-ink flex flex-col">
			<Nav />
			<main className="flex-grow flex items-center justify-center pt-32 pb-20">
				<div className="mx-auto max-w-(--container-default) px-4 text-center flex flex-col items-center gap-8">
					<Mascot size="lg" className="animate-bounce" />
					<div className="flex flex-col gap-4">
						<h1 className="font-sans text-xl font-black tracking-tight md:text-2xl">
							{t("placeholders.title")}
						</h1>
						<p className="font-sans text-md text-ink-muted max-w-[48ch]">
							{t("placeholders.subtitle")}
						</p>
					</div>
					<Link to="/">
						<Button variant="ghost" className="gap-2 font-bold">
							<ArrowLeft className="h-4 w-4" />
							{t("placeholders.backHome")}
						</Button>
					</Link>
				</div>
			</main>
			<Footer />
		</div>
	);
}
