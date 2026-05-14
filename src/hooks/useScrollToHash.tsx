import { useEffect } from "react";
import { useLocation } from "react-router";

export function ScrollToHash() {
	const location = useLocation();

	useEffect(() => {
		if (location.hash) {
			const id = location.hash.replace("#", "");
			const timer = setTimeout(() => {
				const element = document.getElementById(id);
				if (element) {
					element.scrollIntoView({ behavior: "smooth" });
				}
			}, 250);
			return () => clearTimeout(timer);
		} else {
			window.scrollTo({ top: 0, left: 0, behavior: "instant" });
		}
	}, [location.pathname, location.hash]);

	return null;
}
