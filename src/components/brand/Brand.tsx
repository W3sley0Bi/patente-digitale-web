import autoscuolaManagerIcon from "@/assets/autoscuola-manager-icon.png";
import mascotLogo from "@/assets/mascot-logo.png";
import { cn } from "@/lib/utils";

interface MascotProps {
	size?: "sm" | "md" | "lg";
	className?: string;
	variant?: "default" | "autoscuola";
}

export function Mascot({ size = "md", className, variant = "default" }: MascotProps) {
	const sizes = {
		sm: "h-8 w-8",
		md: "h-10 w-10",
		lg: "h-20 w-20 md:h-24 md:w-24",
	};

	const isAutoscuola = variant === "autoscuola";

	return (
		<div
			className={cn(
				"relative overflow-hidden",
				isAutoscuola && "rounded-2xl bg-white",
				sizes[size],
				className,
			)}
		>
			<img
				src={isAutoscuola ? autoscuolaManagerIcon : mascotLogo}
				alt={isAutoscuola ? "Autoscuola Manager" : "Patentino"}
				className="h-full w-full object-contain"
			/>
		</div>
	);
}

export function Wordmark({
	className,
	variant = "default",
}: {
	className?: string;
	variant?: "default" | "autoscuola";
}) {
	if (variant === "autoscuola") {
		return (
			<span className={cn("flex flex-col leading-tight", className)}>
				<span className="font-sans text-lg font-bold tracking-tight text-ink">
					Autoscuola Manager
				</span>
				<span className="text-[0.65em] font-normal text-muted-foreground">
					by patentedigitale.it
				</span>
			</span>
		);
	}

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
