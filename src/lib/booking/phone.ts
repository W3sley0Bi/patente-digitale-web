// Light-sanity phone validation. Deliberately lenient: the international-student
// persona (PRODUCT.md) means foreign numbers must pass, so we don't enforce an
// Italian pattern. We only reject clearly-bogus input.
//
// Rules: a leading "+" or digit, then digits/spaces/dashes/dots/parentheses, with
// a total digit count in the E.164-plausible range (6–15).
export function isValidPhone(input: string): boolean {
	const v = input.trim();
	if (!v) return false;
	if (!/^[+\d][\d\s().-]*$/.test(v)) return false;
	const digits = v.replace(/\D/g, "");
	return digits.length >= 6 && digits.length <= 15;
}
