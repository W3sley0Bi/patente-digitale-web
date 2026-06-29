import { useAuthContext } from "@/lib/AuthContext";

interface Profile {
	id: string;
	role: "student" | "autoscuola";
	approved: boolean;
	full_name: string | null;
	phone: string | null;
	calendar_feed_token: string | null;
	calendar_auto: boolean | null;
}

interface UseProfileReturn {
	profile: Profile | null;
	role: "student" | "autoscuola" | null;
	approved: boolean;
	loading: boolean;
	error: string | null;
	refresh: () => Promise<void>;
}

export function useProfile(): UseProfileReturn {
	const {
		profile,
		role,
		approved,
		profileLoading,
		profileError,
		refreshProfile,
	} = useAuthContext();
	// AuthContext selects `*` from profiles, so calendar_feed_token / calendar_auto
	// are present at runtime even though its narrower Profile type omits them.
	return {
		profile: profile as unknown as Profile | null,
		role,
		approved,
		loading: profileLoading,
		error: profileError,
		refresh: refreshProfile,
	};
}
