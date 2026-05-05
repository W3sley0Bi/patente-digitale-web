import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionEyebrowProps {
	children: ReactNode;
	className?: string;
}

export function SectionEyebrow({ children, className }: SectionEyebrowProps) {
	return (
		<span
			className={cn(
				"font-sans text-xs font-bold uppercase tracking-widest text-brand-ink mb-4 block",
				className,
			)}
		>
			{children}
		</span>
	);
}
