// Italian patente categories, ordered by how common they are for an autoscuola's
// student base. Used by the school student-editor and the student profile.
// Free-text in the DB; this list just drives the picker UI.
export const PATENTE_CATEGORIES = [
	"AM",
	"A1",
	"A2",
	"A",
	"B1",
	"B",
	"BE",
	"B96",
	"C1",
	"C",
	"CE",
	"D1",
	"D",
	"DE",
] as const;

export type PatenteCategory = (typeof PATENTE_CATEGORIES)[number];
