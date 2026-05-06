import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { revealVariants } from "@/lib/motion";

interface RevealProps {
	children: ReactNode;
	delay?: number;
	className?: string;
}

const isSSR = typeof window === "undefined";

export function Reveal({ children, delay = 0, className }: RevealProps) {
	if (isSSR) return <div className={className}>{children}</div>;

	return (
		<motion.div
			initial="hidden"
			whileInView="visible"
			viewport={{ once: true, margin: "-15%" }}
			variants={{
				...revealVariants,
				visible: {
					...revealVariants.visible,
					transition: {
						duration: 0.6,
						ease: [0.16, 1, 0.3, 1],
						delay,
					},
				},
			}}
			className={className}
		>
			{children}
		</motion.div>
	);
}
