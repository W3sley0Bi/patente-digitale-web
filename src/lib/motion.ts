import type { Variants } from "framer-motion";

export const easeOutExpo = [0.16, 1, 0.3, 1] as const;

export const revealVariants: Variants = {
	hidden: { opacity: 0, y: 12 },
	visible: {
		opacity: 1,
		y: 0,
		transition: {
			duration: 0.6,
			ease: easeOutExpo,
		},
	},
};

export const staggerContainer: Variants = {
	visible: {
		transition: {
			staggerChildren: 0.1,
		},
	},
};
