# Admin Claim Expand Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make pending-claim rows in `AdminDashboard.tsx` expandable inline, revealing every field the school submitted (VAT, zip, region, website, place ID, coordinates, opening hours) beyond the current summary columns.

**Architecture:** Single-file change to `src/routes/AdminDashboard.tsx` — widen the Supabase select, extend the `PendingSchool` type, add `expandedId` state, render a toggle chevron + conditional detail row. No new components, no DB/schema changes.

**Tech Stack:** React 19, TypeScript, Vitest + React Testing Library, Supabase JS client.

---

### Task 1: Widen the data fetched for pending claims

**Files:**
- Modify: `src/routes/AdminDashboard.tsx:1-36`
- Test: `src/routes/__tests__/AdminDashboard.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `src/routes/__tests__/AdminDashboard.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/nav/Nav", () => ({ Nav: () => null }));

const approveClaim = vi.fn();
const rejectClaim = vi.fn();
const selectSpy = vi.fn();
const mockSchoolRow = {
	id: "school-1",
	name: "Autoscuola Torino 2",
	city: "Torino",
	address: "Corso Monte Cucco, 24",
	email: "pefona1733@buloan.com",
	created_at: "2026-07-09T12:29:00.000Z",
	piva: "IT01234567890",
	zip: "10139",
	region: "TO",
	website: "https://autoscuolatorino2.it",
	place_id: "ChIJabc123",
	lat: 45.0703,
	lng: 7.6869,
	opening_hours: ["Mon-Fri 09:00-18:00"],
};

vi.mock("@/lib/supabase", () => ({
	supabase: {
		from: () => ({
			select: (columns: string) => {
				selectSpy(columns);
				return {
					eq: () => ({
						order: () =>
							Promise.resolve({ data: [mockSchoolRow], error: null }),
					}),
				};
			},
		}),
		rpc: (name: string, args: unknown) => {
			if (name === "approve_claim") return approveClaim(args);
			if (name === "reject_claim") return rejectClaim(args);
			return Promise.resolve({ error: null });
		},
	},
}));

import AdminDashboard from "@/routes/AdminDashboard";

describe("AdminDashboard claim detail", () => {
	it("fetches the extra detail columns needed for the expanded view", async () => {
		render(<AdminDashboard />);
		await screen.findByText("Autoscuola Torino 2");

		expect(selectSpy).toHaveBeenCalledTimes(1);
		const requestedColumns = selectSpy.mock.calls[0][0] as string;
		for (const col of [
			"zip",
			"region",
			"website",
			"place_id",
			"lat",
			"lng",
			"opening_hours",
		]) {
			expect(requestedColumns).toContain(col);
		}
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/routes/__tests__/AdminDashboard.test.tsx`
Expected: FAIL — `requestedColumns` is `"id, name, city, address, email, created_at, piva"`, so the `toContain("zip")` assertion (and the others) fail.

- [ ] **Step 3: Widen the select statement**

In `src/routes/AdminDashboard.tsx`, find:

```tsx
		const { data, error } = await supabase
			.from("driving_schools")
			.select("id, name, city, address, email, created_at, piva")
			.eq("status", "pending")
			.order("created_at", { ascending: true });
```

Replace with:

```tsx
		const { data, error } = await supabase
			.from("driving_schools")
			.select(
				"id, name, city, address, email, created_at, piva, zip, region, website, place_id, lat, lng, opening_hours",
			)
			.eq("status", "pending")
			.order("created_at", { ascending: true });
```

- [ ] **Step 4: Extend the `PendingSchool` interface**

Find:

```tsx
interface PendingSchool {
	id: string;
	name: string;
	city: string;
	address: string;
	email: string;
	created_at: string;
	piva: string;
}
```

Replace with:

```tsx
interface PendingSchool {
	id: string;
	name: string;
	city: string;
	address: string;
	email: string;
	created_at: string;
	piva: string;
	zip: string | null;
	region: string | null;
	website: string | null;
	place_id: string | null;
	lat: number | null;
	lng: number | null;
	opening_hours: string[] | null;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/routes/__tests__/AdminDashboard.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/routes/AdminDashboard.tsx src/routes/__tests__/AdminDashboard.test.tsx
git commit -m "feat(admin): fetch full claim fields for driving school claims"
```

---

### Task 2: Add expand/collapse state and detail row

**Files:**
- Modify: `src/routes/AdminDashboard.tsx`
- Test: `src/routes/__tests__/AdminDashboard.test.tsx`

- [ ] **Step 1: Write the failing test**

Add to `src/routes/__tests__/AdminDashboard.test.tsx` (inside the existing `describe` block, after the first `it`):

```tsx
	it("reveals the full claim detail when the row is clicked", async () => {
		render(<AdminDashboard />);
		const row = await screen.findByText("Autoscuola Torino 2");

		expect(screen.queryByText("ChIJabc123")).not.toBeInTheDocument();

		row.closest("tr")?.click();

		expect(await screen.findByText("ChIJabc123")).toBeInTheDocument();
		expect(screen.getByText("10139")).toBeInTheDocument();
		expect(screen.getByText("TO")).toBeInTheDocument();
		expect(screen.getByText("45.0703, 7.6869")).toBeInTheDocument();
		expect(screen.getByText("Mon-Fri 09:00-18:00")).toBeInTheDocument();
		expect(
			screen.getByRole("link", { name: "https://autoscuolatorino2.it" }),
		).toHaveAttribute("href", "https://autoscuolatorino2.it");

		row.closest("tr")?.click();
		expect(screen.queryByText("ChIJabc123")).not.toBeInTheDocument();
	});

	it("does not toggle the row when Approve or Reject is clicked", async () => {
		render(<AdminDashboard />);
		await screen.findByText("Autoscuola Torino 2");

		screen.getByRole("button", { name: "Approve" }).click();

		expect(screen.queryByText("ChIJabc123")).not.toBeInTheDocument();
	});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/routes/__tests__/AdminDashboard.test.tsx`
Expected: FAIL — clicking the row does nothing yet, so "ChIJabc123" never appears; test times out on `findByText`.

- [ ] **Step 3: Add expand state and row click handler**

In `src/routes/AdminDashboard.tsx`, find:

```tsx
	const [schools, setSchools] = useState<PendingSchool[]>([]);
	const [loading, setLoading] = useState(true);
	const [processingId, setProcessingId] = useState<string | null>(null);
```

Replace with:

```tsx
	const [schools, setSchools] = useState<PendingSchool[]>([]);
	const [loading, setLoading] = useState(true);
	const [processingId, setProcessingId] = useState<string | null>(null);
	const [expandedId, setExpandedId] = useState<string | null>(null);
```

- [ ] **Step 4: Import the chevron icon**

Find:

```tsx
import { useEffect, useState } from "react";
```

Add a lucide-react import right after it:

```tsx
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
```

- [ ] **Step 5: Wire up row click + stopPropagation on actions, and render the detail row**

Find the `<tr>` block (the `schools.map` body) starting at:

```tsx
								{schools.map((school) => (
									<tr
										key={school.id}
										className="hover:bg-bg-soft/50 transition-colors"
									>
										<td className="px-6 py-4">
											<div className="font-medium text-ink">{school.name}</div>
```

Replace the whole `schools.map((school) => (...))` block — from `{schools.map((school) => (` through its closing `))}` — with:

```tsx
								{schools.map((school) => {
									const isExpanded = expandedId === school.id;
									return (
										<>
											<tr
												key={school.id}
												onClick={() =>
													setExpandedId(isExpanded ? null : school.id)
												}
												className="hover:bg-bg-soft/50 transition-colors cursor-pointer"
											>
												<td className="px-6 py-4">
													<div className="flex items-start gap-2">
														<ChevronDown
															className={`h-4 w-4 mt-1 shrink-0 text-ink-muted transition-transform ${
																isExpanded ? "rotate-180" : ""
															}`}
															aria-hidden="true"
														/>
														<div>
															<div className="font-medium text-ink">
																{school.name}
															</div>
															<div className="text-xs text-ink-muted">
																{school.address}, {school.city}
															</div>
															{school.piva && (
																<div className="mt-1">
																	<Badge
																		variant="outline"
																		className="text-[10px] py-0"
																	>
																		P.IVA: {school.piva}
																	</Badge>
																</div>
															)}
														</div>
													</div>
												</td>
												<td className="px-6 py-4">
													<div className="text-ink">{school.email}</div>
												</td>
												<td className="px-6 py-4 text-ink-muted">
													{new Date(school.created_at).toLocaleDateString(
														"it-IT",
														{
															day: "numeric",
															month: "short",
															year: "2-digit",
															hour: "2-digit",
															minute: "2-digit",
														},
													)}
												</td>
												<td className="px-6 py-4 text-right">
													<div className="flex justify-end gap-2">
														<Button
															variant="ghost"
															size="sm"
															className="text-red-600 hover:text-red-700 hover:bg-red-50"
															onClick={(e) => {
																e.stopPropagation();
																handleReject(school.id);
															}}
															disabled={!!processingId}
														>
															Reject
														</Button>
														<Button
															size="sm"
															onClick={(e) => {
																e.stopPropagation();
																handleApprove(school.id);
															}}
															disabled={!!processingId}
														>
															{processingId === school.id ? "..." : "Approve"}
														</Button>
													</div>
												</td>
											</tr>
											{isExpanded && (
												<tr key={`${school.id}-detail`}>
													<td
														colSpan={4}
														className="px-6 py-4 bg-bg-soft/40 border-t border-line"
													>
														<dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
															<div>
																<dt className="text-xs uppercase tracking-wider text-ink-muted">
																	VAT
																</dt>
																<dd className="text-ink">
																	{school.piva || "Not provided"}
																</dd>
															</div>
															<div>
																<dt className="text-xs uppercase tracking-wider text-ink-muted">
																	Zip
																</dt>
																<dd className="text-ink">
																	{school.zip || "Not provided"}
																</dd>
															</div>
															<div>
																<dt className="text-xs uppercase tracking-wider text-ink-muted">
																	Region
																</dt>
																<dd className="text-ink">
																	{school.region || "Not provided"}
																</dd>
															</div>
															<div>
																<dt className="text-xs uppercase tracking-wider text-ink-muted">
																	Website
																</dt>
																<dd className="text-ink">
																	{school.website ? (
																		<a
																			href={school.website}
																			target="_blank"
																			rel="noreferrer"
																			className="underline hover:text-brand"
																		>
																			{school.website}
																		</a>
																	) : (
																		"Not provided"
																	)}
																</dd>
															</div>
															<div>
																<dt className="text-xs uppercase tracking-wider text-ink-muted">
																	Place ID
																</dt>
																<dd className="text-ink">
																	{school.place_id || "Not provided"}
																</dd>
															</div>
															<div>
																<dt className="text-xs uppercase tracking-wider text-ink-muted">
																	Coordinates
																</dt>
																<dd className="text-ink">
																	{school.lat != null && school.lng != null
																		? `${school.lat}, ${school.lng}`
																		: "Not provided"}
																</dd>
															</div>
															<div className="sm:col-span-2">
																<dt className="text-xs uppercase tracking-wider text-ink-muted">
																	Opening Hours
																</dt>
																<dd className="text-ink">
																	{school.opening_hours &&
																	school.opening_hours.length > 0 ? (
																		<ul className="list-disc list-inside">
																			{school.opening_hours.map((line) => (
																				<li key={line}>{line}</li>
																			))}
																		</ul>
																	) : (
																		"Not provided"
																	)}
																</dd>
															</div>
														</dl>
													</td>
												</tr>
											)}
										</>
									);
								})}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/routes/__tests__/AdminDashboard.test.tsx`
Expected: PASS — all 3 tests green.

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add src/routes/AdminDashboard.tsx src/routes/__tests__/AdminDashboard.test.tsx
git commit -m "feat(admin): expand claim row to show full submitted detail"
```

---

## Manual verification (post-implementation)

1. Run `npm run dev`, log in as an admin (see prior conversation for how to create one), go to `/admin`.
2. Confirm the table renders with a chevron before each school name.
3. Click a row — confirm it expands showing VAT/Zip/Region/Website/Place ID/Coordinates/Opening Hours, with "Not provided" for any missing field.
4. Click Approve or Reject on an expanded row — confirm the row does NOT toggle collaped/expanded as a side effect of the click, and the claim still processes (row disappears from the list on success).
5. Click the row again — confirm it collapses.
