import { cn } from "@/lib/utils";
import mascotLogo from "@/assets/mascot-logo.png";

interface MascotProps {
	size?: "sm" | "md" | "lg";
	className?: string;
}

export function Mascot({ size = "md", className }: MascotProps) {
	const sizes = {
		sm: "h-8 w-8",
		md: "h-10 w-10",
		lg: "h-20 w-20 md:h-24 md:w-24",
	};

	return (
		<div
			className={cn(
				"relative overflow-hidden",
				sizes[size],
				className,
			)}
		>
			<img
				src={mascotLogo}
				alt="Patentino"
				className="h-full w-full object-contain"
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
