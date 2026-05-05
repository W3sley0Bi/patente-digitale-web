import { cn } from "@/lib/utils";

interface MascotProps {
	size?: "sm" | "md" | "lg";
	className?: string;
}

export function Mascot({ size = "md", className }: MascotProps) {
	const sizes = {
		sm: "h-10 w-10",
		md: "h-12 w-12",
		lg: "h-24 w-24 md:h-32 md:w-32",
	};

	return (
		<div
			className={cn(
				"relative overflow-hidden rounded-full border-2 border-brand shadow-sm bg-bg-raised",
				sizes[size],
				className,
			)}
		>
			<img
				src="/mascot-logo.jpg"
				alt="Patentino"
				className="h-full w-full object-cover"
			/>
		</div>
	);
}

export function Wordmark({ className }: { className?: string }) {
	return (
		<span
			className={cn(
				"font-sans text-lg font-bold tracking-tight text-ink",
				className,
			)}
		>
			Patentedigitale.it
		</span>
	);
}
