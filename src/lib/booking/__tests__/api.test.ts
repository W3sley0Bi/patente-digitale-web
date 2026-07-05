import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Student } from "../types";

const mkStudent = (over: Partial<Student>): Student => ({
	id: "e",
	school_id: "s",
	auth_user_id: "u",
	full_name: null,
	email: null,
	phone: null,
	status: "pending",
	source: "self",
	licence_code: null,
	created_at: "",
	decided_at: null,
	...over,
});

let queryResult: { data: Student[] | null; error: unknown };

const rpcMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase", () => ({
	supabase: {
		from: () => ({
			select: () => ({
				in: () => Promise.resolve(queryResult),
			}),
		}),
		rpc: (...args: unknown[]) => rpcMock(...args),
	},
}));

import {
	addStudentManual,
	claimStudentRecord,
	getMyEnrollment,
	removeStudent,
} from "../api";

beforeEach(() => {
	rpcMock.mockReset();
	rpcMock.mockResolvedValue({ data: null, error: null });
});

describe("getMyEnrollment", () => {
	it("prefers an active record over a stale pending one, regardless of row order", async () => {
		const pending = mkStudent({
			id: "p1",
			school_id: "school-c",
			status: "pending",
		});
		const active = mkStudent({
			id: "a1",
			school_id: "school-b",
			status: "active",
		});

		// Row order is arbitrary (no ORDER BY on the query) — pending listed first.
		queryResult = { data: [pending, active], error: null };
		expect(await getMyEnrollment()).toEqual(active);

		// Also correct when active happens to come first.
		queryResult = { data: [active, pending], error: null };
		expect(await getMyEnrollment()).toEqual(active);
	});

	it("falls back to a pending record when no active one exists", async () => {
		const pending = mkStudent({ id: "p1", status: "pending" });
		queryResult = { data: [pending], error: null };
		expect(await getMyEnrollment()).toEqual(pending);
	});

	it("returns null when there are no matching rows", async () => {
		queryResult = { data: [], error: null };
		expect(await getMyEnrollment()).toBeNull();
	});
});

describe("addStudentManual", () => {
	it("maps fields to rpc params, defaulting optionals to null", async () => {
		rpcMock.mockResolvedValue({ data: "new-id", error: null });
		const id = await addStudentManual("school-1", {
			full_name: "Mario Rossi",
			email: "mario@example.com",
		});
		expect(id).toBe("new-id");
		expect(rpcMock).toHaveBeenCalledWith("add_student_manual", {
			p_school_id: "school-1",
			p_full_name: "Mario Rossi",
			p_email: "mario@example.com",
			p_phone: null,
			p_licence_code: null,
		});
	});

	it("passes phone and licence when provided", async () => {
		await addStudentManual("school-1", {
			full_name: "Mario Rossi",
			email: "mario@example.com",
			phone: "333 1234567",
			licence_code: "B",
		});
		expect(rpcMock).toHaveBeenCalledWith("add_student_manual", {
			p_school_id: "school-1",
			p_full_name: "Mario Rossi",
			p_email: "mario@example.com",
			p_phone: "333 1234567",
			p_licence_code: "B",
		});
	});

	it("throws the rpc error", async () => {
		rpcMock.mockResolvedValue({
			data: null,
			error: new Error("student_email_exists"),
		});
		await expect(
			addStudentManual("school-1", {
				full_name: "Mario Rossi",
				email: "mario@example.com",
			}),
		).rejects.toThrow("student_email_exists");
	});
});

describe("claimStudentRecord", () => {
	it("passes the token", async () => {
		rpcMock.mockResolvedValue({ data: "student-id", error: null });
		const id = await claimStudentRecord("tok-1");
		expect(id).toBe("student-id");
		expect(rpcMock).toHaveBeenCalledWith("claim_student_record", {
			p_token: "tok-1",
		});
	});
});

describe("removeStudent", () => {
	it("passes the student id", async () => {
		await removeStudent("student-1");
		expect(rpcMock).toHaveBeenCalledWith("remove_student", {
			p_student_id: "student-1",
		});
	});
});
