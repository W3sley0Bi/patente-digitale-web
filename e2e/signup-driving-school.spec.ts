import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { waitForSupabaseLink } from "./helpers/imap";

// ─── Constants ───────────────────────────────────────────────────────────────
const TEST_EMAIL = process.env.E2E_EMAIL_USER!; // automated-test@patentedigitale.it
const TEST_PASSWORD = "TestPassword123!";
const TEST_FULL_NAME = "Mario Rossi E2E";
const TEST_SCHOOL_NAME = "Autoscuola E2E Test";
const BASE_URL = "http://localhost:5173";

// ─── Admin client ────────────────────────────────────────────────────────────
function adminClient() {
	const url = process.env.VITE_SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) throw new Error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
	return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function deleteTestUser() {
	const supabase = adminClient();
	const { data } = await supabase.auth.admin.listUsers({ perPage: 1000 });
	const user = data?.users?.find((u) => u.email === TEST_EMAIL);
	if (user) await supabase.auth.admin.deleteUser(user.id);
}

// ─── Hooks ───────────────────────────────────────────────────────────────────
test.beforeEach(async () => {
	await deleteTestUser();
});

test.afterEach(async () => {
	await deleteTestUser();
});

// ─── Tests ───────────────────────────────────────────────────────────────────

test("driving school — create account + claim — reaches dashboard", async ({ page }) => {
	// ── 1. Start signup flow ──────────────────────────────────────────────────
	await page.goto("/signup/driving-school");
	await expect(page.getByRole("heading", { name: "Claim your driving school" })).toBeVisible();

	await page.getByText("My school isn't listed").click();

	// ── 2. Create account ─────────────────────────────────────────────────────
	await expect(page.getByText("First, create your account:")).toBeVisible();

	await page.getByLabel("Email").fill(TEST_EMAIL);
	await page.getByLabel("Password").fill(TEST_PASSWORD);

	// Record the time just before triggering the email so we only match new emails
	const signupTime = new Date();
	await page.getByRole("button", { name: "Create account" }).click();

	// ── 3. Handle email confirmation ──────────────────────────────────────────
	// If "Confirm email" is enabled in Supabase, AuthForm shows a "check your email"
	// message and we need to follow the link. If disabled, it proceeds directly.
	const confirmPrompt = page.getByText(/magic link sent|check your inbox/i);
	const detailsStep = page.getByLabel("Your full name");

	const outcome = await Promise.race([
		confirmPrompt.waitFor({ timeout: 8_000 }).then(() => "email" as const),
		detailsStep.waitFor({ timeout: 8_000 }).then(() => "details" as const),
	]).catch(() => "timeout" as const);

	if (outcome === "email") {
		// Poll IMAP for the confirmation link, swap redirect_to to localhost
		const confirmUrl = await waitForSupabaseLink(
			signupTime,
			`${BASE_URL}/signup/driving-school`,
		);

		// Follow the link — Supabase confirms the user and redirects back here
		await page.goto(confirmUrl);

		// ClaimForm detects the now-authenticated user and skips to details step
		await expect(page.getByLabel("Your full name")).toBeVisible({ timeout: 8_000 });
	} else if (outcome === "timeout") {
		throw new Error("Neither email confirmation prompt nor details step appeared after signup");
	}

	// ── 4. Fill claim details ─────────────────────────────────────────────────
	await page.getByLabel("Your full name").fill(TEST_FULL_NAME);
	await page.getByLabel("School name").fill(TEST_SCHOOL_NAME);
	await page.getByRole("button", { name: "Submit claim" }).click();

	// ── 5. Confirm submission and navigate to dashboard ───────────────────────
	await expect(page.getByText("Claim submitted!")).toBeVisible({ timeout: 8_000 });
	await page.getByRole("button", { name: "Go to your dashboard" }).click();

	// ── 6. Assert dashboard ───────────────────────────────────────────────────
	await expect(page).toHaveURL(/\/driving-school\/dashboard/, { timeout: 10_000 });
});
