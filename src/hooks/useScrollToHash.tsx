import { useEffect } from "react";
import { useLocation } from "react-router";

export function ScrollToHash() {
	const location = useLocation();

	useEffect(() => {
		if (location.hash) {
			const id = location.hash.replace("#", "");
			
			// Small delay to ensure the page has rendered and sections are mounted
			const timer = setTimeout(() => {
				const element = document.getElementById(id);
				if (element) {
					element.scrollIntoView({ behavior: "smooth" });
				}
			}, 250);

			return () => clearTimeout(timer);
		}
	}, [location]);

	return null;
}
