// Brand-tuned instructor palette (OKLCH, aligned to DESIGN.md hues).
// Shared by the schedule calendar and the instructor colour picker so a swatch
// chosen in the manager renders identically on the calendar.
export const INSTRUCTOR_PALETTE = [
	"oklch(0.62 0.16 152)", // brand green
	"oklch(0.62 0.12 230)", // info blue
	"oklch(0.70 0.15 75)", // amber
	"oklch(0.58 0.16 300)", // violet
	"oklch(0.62 0.18 350)", // pink
	"oklch(0.60 0.13 200)", // teal
	"oklch(0.62 0.15 130)", // lime-green
	"oklch(0.60 0.16 40)", // terracotta
];

export const UNASSIGNED_COLOR = "oklch(0.55 0.02 160)"; // tinted neutral

/** Resolve an instructor's calendar colour: explicit colour, else palette by index. */
export const instructorColor = (
	color: string | null | undefined,
	index: number,
): string => color || INSTRUCTOR_PALETTE[index % INSTRUCTOR_PALETTE.length];
