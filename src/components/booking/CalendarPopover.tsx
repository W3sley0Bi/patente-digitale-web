import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Google-Calendar-style popover. On desktop it anchors next to the clicked
 * point (flipping to stay on-screen); on narrow screens it drops to a bottom
 * sheet. Transparent backdrop + Esc close it.
 */
export function CalendarPopover({
	anchor,
	onClose,
	children,
}: {
	anchor: { x: number; y: number };
	onClose: () => void;
	children: React.ReactNode;
}) {
	const ref = useRef<HTMLDivElement>(null);
	const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
	const [mobile, setMobile] = useState(false);

	useLayoutEffect(() => {
		const isMobile = window.innerWidth < 640;
		setMobile(isMobile);
		if (isMobile) {
			setPos(null);
			return;
		}
		const el = ref.current;
		if (!el) return;
		const r = el.getBoundingClientRect();
		const m = 8;
		let left = anchor.x + 12;
		let top = anchor.y + 12;
		if (left + r.width > window.innerWidth - m) left = anchor.x - r.width - 12; // flip left
		if (left < m) left = m;
		if (top + r.height > window.innerHeight - m)
			top = window.innerHeight - r.height - m; // clamp up
		if (top < m) top = m;
		setPos({ top, left });
	}, [anchor]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [onClose]);

	return (
		<>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: click-away backdrop; Esc also closes */}
			<div
				className="fixed inset-0 z-[120]"
				onMouseDown={onClose}
				role="presentation"
			/>
			{/* biome-ignore lint/a11y/noStaticElementInteractions: stop backdrop close on inner click */}
			<div
				ref={ref}
				onMouseDown={(e) => e.stopPropagation()}
				className={
					mobile
						? "fixed inset-x-0 bottom-0 z-[121] rounded-t-2xl border border-line bg-bg-raised p-5 shadow-[0_-8px_30px_-8px_oklch(0.5_0.06_160/0.25)]"
						: "fixed z-[121] w-80 rounded-xl border border-line bg-bg-raised p-4 shadow-[0_12px_30px_-8px_oklch(0.5_0.06_160/0.25)]"
				}
				style={
					mobile
						? undefined
						: {
								top: pos?.top ?? anchor.y,
								left: pos?.left ?? anchor.x,
								visibility: pos ? "visible" : "hidden",
							}
				}
			>
				{children}
			</div>
		</>
	);
}
