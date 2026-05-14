import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MockupTestProps {
	name: string;
	children: ReactNode;
	badge?: boolean;
	className?: string;
}

export function MockupTest({ name, children, badge = true, className }: MockupTestProps) {
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (typeof window === "undefined") return;
		track("impression", name);
	}, [name]);

	const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
		const target = (e.target as HTMLElement).closest("[data-mockup-cta]");
		if (!target) return;
		const cta = target.getAttribute("data-mockup-cta") || "";
		track("click", name, { cta });
	};

	return (
		<div
			ref={ref}
			data-mockup-test={name}
			className={cn("relative", className)}
			onClick={handleClick}
		>
			{badge && (
				<div className="pointer-events-none absolute top-3 right-3 z-20 inline-flex items-center gap-1.5 rounded-full bg-accent-soft border border-accent/20 px-2.5 py-1 shadow-sm">
					<span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
					<span className="font-sans text-[10px] font-black uppercase tracking-widest text-accent-ink">
						Anteprima
					</span>
				</div>
			)}
			{children}
		</div>
	);
}

function track(event: "impression" | "click", name: string, meta?: Record<string, unknown>) {
	if (typeof window === "undefined") return;
	const payload = { event, name, ...(meta || {}), ts: Date.now() };
	console.info(`[mockup-test:${event}]`, payload);
	// Future: forward to analytics (PostHog, Plausible, etc.)
	// window.posthog?.capture(`mockup_test_${event}`, payload);
}
