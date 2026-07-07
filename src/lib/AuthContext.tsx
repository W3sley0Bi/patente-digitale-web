import type { Session, User } from "@supabase/supabase-js";
import {
	createContext,
	type ReactNode,
	useCallback,
	useContext,
	useEffect,
	useState,
} from "react";
import { supabase } from "@/lib/supabase";

interface Profile {
	id: string;
	role: "student" | "autoscuola";
	approved: boolean;
	full_name: string | null;
	phone: string | null;
}

interface AuthState {
	session: Session | null;
	user: User | null;
	authLoading: boolean;
	profile: Profile | null;
	role: "student" | "autoscuola" | null;
	approved: boolean;
	profileLoading: boolean;
	profileError: string | null;
	refreshProfile: () => Promise<void>;
	signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
	const [session, setSession] = useState<Session | null>(null);
	const [authLoading, setAuthLoading] = useState(true);
	const [profile, setProfile] = useState<Profile | null>(null);
	const [profileLoading, setProfileLoading] = useState(true);
	const [profileError, setProfileError] = useState<string | null>(null);

	// Single onAuthStateChange subscription for the whole app.
	// It fires immediately with the current session AND handles URL hash exchange.
	// On mobile, the tab can be backgrounded (e.g. user taps a magic link from
	// the mail app) mid-exchange, so this callback can be delayed indefinitely.
	// getSession() below acts as a fallback that re-resolves once the tab is
	// foregrounded again, instead of leaving authLoading stuck forever.
	useEffect(() => {
		let resolved = false;
		const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
			resolved = true;
			setSession(s);
			setAuthLoading(false);
		});

		const resolveFromSession = () => {
			if (resolved) return;
			void supabase.auth.getSession().then(({ data }) => {
				if (resolved) return;
				resolved = true;
				setSession(data.session);
				setAuthLoading(false);
			});
		};

		const onVisible = () => {
			if (document.visibilityState === "visible") resolveFromSession();
		};
		document.addEventListener("visibilitychange", onVisible);
		const timeoutId = window.setTimeout(resolveFromSession, 5000);

		return () => {
			listener.subscription.unsubscribe();
			document.removeEventListener("visibilitychange", onVisible);
			window.clearTimeout(timeoutId);
		};
	}, []);

	const user = session?.user ?? null;

	// Fetch profile whenever the user changes. Reset profileLoading on every fetch
	// so consumers (ProtectedRoute) never see role=null with profileLoading=false.
	const fetchProfile = useCallback(async (userId: string) => {
		setProfileLoading(true);
		setProfileError(null);
		// Backgrounded/throttled mobile tabs can stall this request indefinitely
		// (e.g. after returning from a magic-link tap) — cap it so the UI
		// never gets stuck showing a spinner forever.
		const timeout = new Promise<never>((_, reject) =>
			setTimeout(() => reject(new Error("Profile fetch timed out")), 10000),
		);
		try {
			const { data, error } = await Promise.race([
				supabase.from("profiles").select("*").eq("id", userId).single(),
				timeout,
			]);
			if (error) setProfileError(error.message);
			setProfile((data as Profile) ?? null);
		} catch (err) {
			setProfileError(err instanceof Error ? err.message : "Unknown error");
		} finally {
			setProfileLoading(false);
		}
	}, []);

	useEffect(() => {
		if (authLoading) return;
		if (!user) {
			setProfile(null);
			setProfileLoading(false);
			return;
		}
		void fetchProfile(user.id);
	}, [user, authLoading, fetchProfile]);

	const refreshProfile = useCallback(async () => {
		if (user) await fetchProfile(user.id);
	}, [user, fetchProfile]);

	const signOut = useCallback(async () => {
		await supabase.auth.signOut();
	}, []);

	const value: AuthState = {
		session,
		user,
		authLoading,
		profile,
		role: profile?.role ?? null,
		approved: profile?.approved ?? false,
		profileLoading: authLoading || profileLoading,
		profileError,
		refreshProfile,
		signOut,
	};

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthState {
	const ctx = useContext(AuthContext);
	if (!ctx)
		throw new Error("useAuthContext must be used inside <AuthProvider>");
	return ctx;
}
