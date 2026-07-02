import { useEffect, useState } from "react";

const MOBILE_QUERY = "(max-width: 767px)";

function safeMatchMedia(query: string) {
	if (typeof window === "undefined" || !window.matchMedia) return null;
	try {
		return window.matchMedia(query);
	} catch {
		return null;
	}
}

export function useIsMobile() {
	const [isMobile, setIsMobile] = useState(
		() => safeMatchMedia(MOBILE_QUERY)?.matches ?? false,
	);

	useEffect(() => {
		const mql = safeMatchMedia(MOBILE_QUERY);
		if (!mql) return;
		const handleChange = () => setIsMobile(mql.matches);
		mql.addEventListener("change", handleChange);
		return () => mql.removeEventListener("change", handleChange);
	}, []);

	return isMobile;
}
