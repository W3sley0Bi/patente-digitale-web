import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, Link } from "react-router";
import {
	Check,
	MapPin,
	ArrowLeft,
	ArrowRight,
	Phone,
	Smartphone,
	Mail,
	Globe,
	Clock,
	BadgeCheck,
	ExternalLink,
	X,
	ChevronLeft,
	ChevronRight,
	Plus,
	Minus,
	Sparkles,
} from "lucide-react";

function WhatsAppIcon({ className = "h-4 w-4" }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="currentColor"
			className={className}
			aria-hidden="true"
		>
			<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
		</svg>
	);
}
import { Nav } from "@/components/nav/Nav";
import { Footer } from "@/components/layout/Footer";
import { MockupTest } from "@/components/mockup-test/MockupTest";
import { EnrollPaywall } from "@/components/iscrizione/EnrollPaywall";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

interface DrivingSchoolRow {
	id: string;
	place_id: string | null;
	name: string | null;
	address: string | null;
	city: string | null;
	zip: string | null;
	region: string | null;
	phone: string | null;
	mobile: string | null;
	email: string | null;
	website: string | null;
	whatsapp_business: string | null;
	opening_hours: unknown;
	licenses: unknown;
	prices: unknown;
	lat: number | null;
	lng: number | null;
	instructor_count: number | null;
	description: string | null;
	founded_year: number | null;
	verified: boolean | null;
}

interface DrivingLicenceRow {
	id: string;
	licence_code: string;
	price: number | null;
}

// Mock per-licence content. Real DB doesn't have "what's included" / vehicles yet.
interface LicenceVariant {
	key: string;
	label: string;
	basePrice: number;
	includes: string[];
}

interface LicenceInfo {
	description: string;
	mockPrice: number;
	includes: string[];
	vehicles: Array<{ name: string; transmission: string }>;
	variants?: LicenceVariant[];
	transmissionOptions?: Array<"manual" | "auto">;
	transmissionDeltaAuto?: number;
	extraHoursPricePerHour?: number;
}

const MOCK_LICENCE_INFO: Record<string, LicenceInfo> = {
	AM: {
		description: "Ciclomotori 50cc · da 14 anni",
		mockPrice: 380,
		includes: ["Iscrizione", "Materiale di studio", "Lezioni di teoria", "Esame teoria", "Prova pratica"],
		vehicles: [{ name: "Piaggio Liberty 50", transmission: "automatica" }],
	},
	A1: {
		description: "Motocicli 125cc · da 16 anni",
		mockPrice: 480,
		includes: ["Iscrizione", "Materiale di studio", "Lezioni di teoria", "5 ore di guida", "Esame teoria", "Esame pratico"],
		vehicles: [{ name: "Honda CB 125F", transmission: "manuale" }],
	},
	A2: {
		description: "Motocicli fino a 35kW · da 18 anni",
		mockPrice: 620,
		includes: ["Iscrizione", "Materiale di studio", "Lezioni di teoria", "8 ore di guida", "Esame teoria", "Esame pratico"],
		vehicles: [{ name: "Yamaha MT-03", transmission: "manuale" }],
		variants: [
			{
				key: "standard",
				label: "Standard",
				basePrice: 620,
				includes: ["Iscrizione", "Materiale di studio", "Lezioni di teoria", "8 ore di guida", "Esame teoria", "Esame pratico"],
			},
			{
				key: "premium",
				label: "Premium",
				basePrice: 850,
				includes: ["Tutto in Standard", "14 ore di guida totali", "Garanzia ripetizione esame", "Supporto WhatsApp"],
			},
		],
		extraHoursPricePerHour: 28,
	},
	A: {
		description: "Motocicli senza limiti · da 24 anni o 20+A2",
		mockPrice: 750,
		includes: ["Iscrizione", "Materiale di studio", "Lezioni di teoria", "10 ore di guida", "Esame teoria", "Esame pratico"],
		vehicles: [{ name: "Kawasaki Z650", transmission: "manuale" }],
	},
	B: {
		description: "Auto fino a 3,5t · da 18 anni",
		mockPrice: 870,
		includes: [
			"Iscrizione e foglio rosa",
			"Materiali di studio digitali",
			"Lezioni di teoria",
			"6 ore di guida obbligatorie",
			"2 tentativi esame teoria",
			"Esame pratico",
		],
		vehicles: [
			{ name: "Fiat Panda", transmission: "manuale" },
			{ name: "Renault Clio", transmission: "automatica" },
		],
		variants: [
			{
				key: "standard",
				label: "Standard",
				basePrice: 870,
				includes: [
					"Iscrizione e foglio rosa",
					"Materiali di studio digitali",
					"Lezioni di teoria",
					"6 ore di guida obbligatorie",
					"2 tentativi esame teoria",
					"Esame pratico",
				],
			},
			{
				key: "premium",
				label: "Premium",
				basePrice: 1150,
				includes: [
					"Tutto in Standard",
					"12 ore di guida totali",
					"Simulazioni esame teoria illimitate",
					"Garanzia ripetizione esame",
					"Supporto WhatsApp",
				],
			},
			{
				key: "express",
				label: "Express",
				basePrice: 1450,
				includes: [
					"Tutto in Premium",
					"Lezioni di teoria intensive (4 settimane)",
					"18 ore di guida totali",
					"Prenotazione esami prioritaria",
				],
			},
		],
		transmissionOptions: ["manual", "auto"],
		transmissionDeltaAuto: 90,
		extraHoursPricePerHour: 32,
	},
	BE: {
		description: "Auto con rimorchio pesante",
		mockPrice: 580,
		includes: ["Iscrizione", "6 ore di guida", "Esame pratico"],
		vehicles: [{ name: "Fiat Ducato + rimorchio", transmission: "manuale" }],
	},
	C: {
		description: "Camion oltre 3,5t",
		mockPrice: 1850,
		includes: ["Iscrizione", "Materiale di studio", "Lezioni di teoria", "15 ore di guida", "Esami teoria + pratico"],
		vehicles: [{ name: "Iveco Eurocargo", transmission: "manuale" }],
	},
	CE: {
		description: "Camion con rimorchio",
		mockPrice: 2200,
		includes: ["Iscrizione", "Materiale di studio", "20 ore di guida", "Esami teoria + pratico"],
		vehicles: [{ name: "Iveco Eurocargo + rimorchio", transmission: "manuale" }],
	},
	D: {
		description: "Autobus oltre 9 posti",
		mockPrice: 2400,
		includes: ["Iscrizione", "Materiale di studio", "20 ore di guida", "Esami teoria + pratico"],
		vehicles: [{ name: "Iveco Daily Bus", transmission: "manuale" }],
	},
	CQC: {
		description: "Carta di qualificazione conducente",
		mockPrice: 950,
		includes: ["Iscrizione", "Lezioni in aula", "Materiali di studio", "Esame teoria"],
		vehicles: [],
	},
};

const DEFAULT_LICENCE_KEYS = ["B", "A1", "A2", "A", "CQC"];

const MOCK_PHOTOS: Array<{ url: string; alt: string }> = [
	{
		url: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=600&q=80",
		alt: "Volante e cruscotto",
	},
	{
		url: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=600&q=80",
		alt: "Strada italiana",
	},
	{
		url: "https://images.unsplash.com/photo-1517524008697-84bbe3c3fd98?auto=format&fit=crop&w=600&q=80",
		alt: "Studente al volante",
	},
	{
		url: "https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=600&q=80",
		alt: "Aula autoscuola",
	},
];

const DAY_NAMES: Array<[string, string]> = [
	["Lunedì", "Monday"],
	["Martedì", "Tuesday"],
	["Mercoledì", "Wednesday"],
	["Giovedì", "Thursday"],
	["Venerdì", "Friday"],
	["Sabato", "Saturday"],
	["Domenica", "Sunday"],
];

function getTodayIndex(): number {
	const d = new Date().getDay();
	return d === 0 ? 6 : d - 1;
}

function formatPriceEUR(price: number): string {
	try {
		return new Intl.NumberFormat("it-IT", {
			style: "currency",
			currency: "EUR",
			maximumFractionDigits: 0,
		}).format(price);
	} catch {
		return `${price} €`;
	}
}

function safeHostname(url: string): string {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
}

function ensureUrl(url: string): string {
	if (/^https?:\/\//i.test(url)) return url;
	return `https://${url}`;
}

export default function Iscrizione() {
	const { t } = useTranslation();
	const { user } = useAuth();
	const [params, setParams] = useSearchParams();

	const placeId = params.get("placeId") || "";
	const queryName = params.get("name") || "";
	const queryLicence = params.get("licence") || "";
	const queryRating = params.get("rating") ? Number(params.get("rating")) : null;
	const queryRatingCount = params.get("ratingCount") ? Number(params.get("ratingCount")) : null;
	const queryHours = useMemo<string[]>(() => {
		try {
			const raw = params.get("hours");
			if (!raw) return [];
			const parsed = JSON.parse(raw);
			return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
		} catch {
			return [];
		}
	}, [params.get("hours")]);

	const [school, setSchool] = useState<DrivingSchoolRow | null>(null);
	const [licences, setLicences] = useState<DrivingLicenceRow[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [paywallOpen, setPaywallOpen] = useState(false);

	useEffect(() => {
		let cancelled = false;

		async function run() {
			setLoading(true);
			try {
				if (!placeId) {
					if (!cancelled) {
						setSchool(null);
						setLicences([]);
					}
					return;
				}
				const { data: schoolRow, error: schoolErr } = await supabase
					.from("driving_schools")
					.select(
						"id, place_id, name, address, city, zip, region, phone, mobile, email, website, whatsapp_business, opening_hours, licenses, prices, lat, lng, instructor_count, description, founded_year, verified",
					)
					.eq("place_id", placeId)
					.maybeSingle();

				if (schoolErr) {
					console.warn("[iscrizione] driving_schools fetch failed", schoolErr);
				}

				if (cancelled) return;

				if (schoolRow) {
					setSchool(schoolRow as DrivingSchoolRow);
					const { data: licRows, error: licErr } = await supabase
						.from("driving_licences")
						.select("id, licence_code, price")
						.eq("school_id", (schoolRow as DrivingSchoolRow).id);
					if (licErr) {
						console.warn("[iscrizione] driving_licences fetch failed", licErr);
					}
					if (!cancelled && Array.isArray(licRows)) {
						setLicences(licRows as DrivingLicenceRow[]);
					}
				} else {
					setSchool(null);
					setLicences([]);
				}
			} catch (err) {
				console.warn("[iscrizione] unexpected fetch error", err);
				if (!cancelled) {
					setSchool(null);
					setLicences([]);
				}
			} finally {
				if (!cancelled) setLoading(false);
			}
		}

		run();
		return () => {
			cancelled = true;
		};
	}, [placeId]);

	const schoolName = useMemo(
		() => school?.name || queryName || t("iscrizione.defaultSchoolName"),
		[school?.name, queryName, t],
	);

	const openingHours = useMemo<string[]>(() => {
		const oh = school?.opening_hours;
		const fromDb = Array.isArray(oh) ? (oh.filter((v) => typeof v === "string") as string[]) : [];
		return fromDb.length > 0 ? fromDb : queryHours;
	}, [school?.opening_hours, queryHours]);

	const todayHours = useMemo(() => {
		if (openingHours.length === 0) return null;
		const idx = getTodayIndex();
		const [it, en] = DAY_NAMES[idx];
		return (
			openingHours.find((h) => h.startsWith(it) || h.startsWith(en)) ||
			openingHours[idx] ||
			null
		);
	}, [openingHours]);

	const geoPrices = useMemo<Array<[string, string]>>(() => {
		const p = school?.prices;
		if (!p || typeof p !== "object" || Array.isArray(p)) return [];
		return Object.entries(p as Record<string, unknown>)
			.filter(([, v]) => typeof v === "string" || typeof v === "number")
			.map(([k, v]) => [k, String(v)]);
	}, [school?.prices]);

	const cityRegion = useMemo(() => {
		const parts = [school?.city, school?.region].filter(Boolean);
		return parts.join(" · ");
	}, [school?.city, school?.region]);

	const mapsHref = useMemo(() => {
		if (school?.lat != null && school?.lng != null) {
			return `https://www.google.com/maps/search/?api=1&query=${school.lat},${school.lng}`;
		}
		const q = [school?.name, school?.address, school?.city].filter(Boolean).join(", ");
		if (!q) return null;
		return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
	}, [school?.lat, school?.lng, school?.name, school?.address, school?.city]);

	const hasContacts = !!(
		school?.phone ||
		school?.mobile ||
		school?.email ||
		school?.whatsapp_business ||
		school?.website ||
		school?.address
	);
	const isVerified = school?.verified === true;

	const availableLicences = useMemo<string[]>(() => {
		const fromSchool = Array.isArray(school?.licenses)
			? (school?.licenses as unknown[]).filter((v): v is string => typeof v === "string")
			: [];
		if (fromSchool.length > 0) return fromSchool.filter((l) => MOCK_LICENCE_INFO[l]);
		if (licences.length > 0) {
			return licences.map((l) => l.licence_code).filter((l) => MOCK_LICENCE_INFO[l]);
		}
		return DEFAULT_LICENCE_KEYS;
	}, [school?.licenses, licences]);

	// Selected licence syncs with URL ?licence= param so the auth round-trip preserves it.
	const selectedLicence =
		availableLicences.includes(queryLicence) && queryLicence
			? queryLicence
			: availableLicences[0] || "B";

	const setSelectedLicence = (code: string) => {
		const next = new URLSearchParams(params);
		next.set("licence", code);
		setParams(next, { replace: true });
	};

	const selectedInfo = MOCK_LICENCE_INFO[selectedLicence] || MOCK_LICENCE_INFO.B;

	// Variant + add-on local state. Reset when licence changes.
	const [variantKey, setVariantKey] = useState<string>("standard");
	const [transmission, setTransmission] = useState<"manual" | "auto">("manual");
	const [extraHours, setExtraHours] = useState<number>(0);
	const EXTRA_HOURS_MAX = 30;
	const PACK_THRESHOLD = 5;
	const PACK_DISCOUNT = 0.1;
	useEffect(() => {
		const firstVariant = selectedInfo.variants?.[0]?.key || "standard";
		setVariantKey(firstVariant);
		setTransmission("manual");
		setExtraHours(0);
	}, [selectedLicence, selectedInfo.variants]);

	const activeVariant: LicenceVariant | null =
		selectedInfo.variants?.find((v) => v.key === variantKey) ||
		selectedInfo.variants?.[0] ||
		null;

	const dbPrice = licences.find((l) => l.licence_code === selectedLicence)?.price;
	const geoPriceStr = geoPrices.find(([k]) => k === selectedLicence)?.[1];
	const geoPriceNum = geoPriceStr != null ? Number(String(geoPriceStr).replace(/[^\d.]/g, "")) : null;
	const priceIsReal = dbPrice != null || (geoPriceNum != null && Number.isFinite(geoPriceNum));
	const basePrice =
		dbPrice != null
			? dbPrice
			: geoPriceNum != null && Number.isFinite(geoPriceNum)
				? geoPriceNum
				: activeVariant?.basePrice ?? selectedInfo.mockPrice;

	const transmissionDelta =
		transmission === "auto" ? selectedInfo.transmissionDeltaAuto ?? 0 : 0;
	const hourlyRate = selectedInfo.extraHoursPricePerHour ?? 0;
	const extraHoursRaw = extraHours * hourlyRate;
	const hasPackDiscount = extraHours >= PACK_THRESHOLD && hourlyRate > 0;
	const extraHoursDelta = hasPackDiscount
		? Math.round(extraHoursRaw * (1 - PACK_DISCOUNT))
		: extraHoursRaw;
	const totalPrice = basePrice + transmissionDelta + extraHoursDelta;
	const displayPrice: string = formatPriceEUR(totalPrice);

	const variantIncludes = activeVariant?.includes ?? selectedInfo.includes;

	// Lightbox state for photo expand
	const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
	useEffect(() => {
		if (lightboxIndex === null) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setLightboxIndex(null);
			if (e.key === "ArrowLeft") setLightboxIndex((i) => (i === null ? null : (i - 1 + MOCK_PHOTOS.length) % MOCK_PHOTOS.length));
			if (e.key === "ArrowRight") setLightboxIndex((i) => (i === null ? null : (i + 1) % MOCK_PHOTOS.length));
		};
		window.addEventListener("keydown", onKey);
		const prev = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			window.removeEventListener("keydown", onKey);
			document.body.style.overflow = prev;
		};
	}, [lightboxIndex]);

	const returnTo = useMemo(() => {
		const sp = new URLSearchParams();
		if (placeId) sp.set("placeId", placeId);
		if (schoolName) sp.set("name", schoolName);
		sp.set("licence", selectedLicence);
		return `/iscrizione?${sp.toString()}`;
	}, [placeId, schoolName, selectedLicence]);

	if (loading) {
		return (
			<div className="min-h-screen bg-bg text-ink">
				<Nav />
				<main className="flex min-h-[60dvh] items-center justify-center">
					<div className="h-8 w-8 animate-pulse rounded-full bg-brand/20" />
				</main>
				<Footer />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-bg text-ink">
			<Nav />
			<main>
				<section className="pt-28 pb-12">
					<div className="mx-auto w-full max-w-(--container-default) px-4 lg:px-8">
						<Link
							to="/search"
							className="inline-flex items-center gap-1.5 font-sans text-xs text-ink-muted hover:text-ink transition-colors"
						>
							<ArrowLeft className="h-3.5 w-3.5" />
							{t("iscrizione.backToSearch")}
						</Link>

						{/* SCHOOL HEADER */}
						<div className="mt-6 flex flex-col gap-2">
							<div className="flex flex-wrap items-center gap-2">
								<h1 className="font-sans text-2xl font-black tracking-tight text-ink md:text-3xl">
									{schoolName}
								</h1>
								{isVerified && (
									<span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1">
										<BadgeCheck className="h-3.5 w-3.5 text-brand" strokeWidth={3} />
										<span className="font-sans text-[10px] font-bold uppercase tracking-widest text-brand-ink">
											{t("iscrizione.verified")}
										</span>
									</span>
								)}
							</div>
							<div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-xs text-ink-muted">
								{cityRegion && (
									<span className="inline-flex items-center gap-1">
										<MapPin className="h-3 w-3" />
										{cityRegion}
									</span>
								)}
								{(queryRating ?? null) != null && (
									<>
										<span className="text-ink-faint">·</span>
										<span className="inline-flex items-center gap-1">
											<span className="text-amber-400">★</span>
											<span className="font-semibold text-ink">{queryRating!.toFixed(1)}</span>
											{queryRatingCount != null && (
												<span className="text-ink-faint">({queryRatingCount.toLocaleString()})</span>
											)}
										</span>
									</>
								)}
								{school?.founded_year && (
									<>
										<span className="text-ink-faint">·</span>
										<span>{t("iscrizione.detail.foundedSince", { year: school.founded_year })}</span>
									</>
								)}
								{school?.instructor_count && (
									<>
										<span className="text-ink-faint">·</span>
										<span>
											{t("iscrizione.detail.instructorCount", {
												count: school.instructor_count,
											})}
										</span>
									</>
								)}
							</div>
							{school?.description && (
								<p className="mt-2 font-sans text-sm text-ink-muted leading-relaxed max-w-prose">
									{school.description}
								</p>
							)}
						</div>

						{/* CONTATTI + PHOTOS — side by side, contatti left, photos scrollable right */}
						<div className="mt-6 grid gap-6 lg:grid-cols-12">
							<div className="lg:col-span-5 flex flex-col gap-3 min-w-0">
								{hasContacts && (
									<div className="rounded-xl border border-line bg-bg-raised p-4">
										<span className="font-sans text-[10px] font-bold uppercase tracking-widest text-ink-faint">
											{t("iscrizione.detail.contacts")}
										</span>
										<dl className="mt-2.5 flex flex-col gap-2">
											{school?.address && (
												<InfoRow icon={<MapPin className="h-3.5 w-3.5 text-brand" />}>
													{mapsHref ? (
														<a
															href={mapsHref}
															target="_blank"
															rel="noopener noreferrer"
															className="font-sans text-xs font-medium text-brand hover:text-brand-hover inline-flex items-start gap-1"
														>
															<span>
																{[school.address, school.city, school.zip].filter(Boolean).join(", ")}
															</span>
															<ExternalLink className="h-2.5 w-2.5 mt-0.5 shrink-0" />
														</a>
													) : (
														<span className="text-xs text-ink-muted">
															{[school.address, school.city, school.zip].filter(Boolean).join(", ")}
														</span>
													)}
												</InfoRow>
											)}
											{school?.phone && (
												<InfoRow icon={<Phone className="h-3.5 w-3.5 text-brand" />}>
													<a
														href={`tel:${school.phone}`}
														className="font-sans text-xs font-medium text-brand hover:text-brand-hover"
													>
														{school.phone}
													</a>
												</InfoRow>
											)}
											{school?.mobile && (
												<InfoRow icon={<Smartphone className="h-3.5 w-3.5 text-brand" />}>
													<a
														href={`tel:${school.mobile}`}
														className="font-sans text-xs font-medium text-brand hover:text-brand-hover"
													>
														{school.mobile}
													</a>
												</InfoRow>
											)}
											{school?.email && (
												<InfoRow icon={<Mail className="h-3.5 w-3.5 text-brand" />}>
													<a
														href={`mailto:${school.email}`}
														className="font-sans text-xs font-medium text-brand hover:text-brand-hover break-all"
													>
														{school.email}
													</a>
												</InfoRow>
											)}
											{school?.website && (
											<InfoRow icon={<Globe className="h-3.5 w-3.5 text-brand" />}>
												<a
													href={ensureUrl(school.website)}
													target="_blank"
													rel="noopener noreferrer"
													className="font-sans text-xs font-medium text-brand hover:text-brand-hover inline-flex items-center gap-1"
												>
													{safeHostname(school.website)}
													<ExternalLink className="h-2.5 w-2.5" />
												</a>
											</InfoRow>
										)}
									</dl>

								</div>
							)}

							{/* WhatsApp CTA — gated by auth */}
							{placeId && (
								user ? (
									school?.whatsapp_business ? (
										<a
											href={`https://wa.me/${school.whatsapp_business.replace(/\D/g, "")}`}
											target="_blank"
											rel="noopener noreferrer"
											className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white font-sans text-xs font-bold py-2.5 transition-colors shadow-sm"
										>
											<WhatsAppIcon className="h-4 w-4" />
											WhatsApp Business
										</a>
									) : (
										<MockupTest name="iscrizione-whatsapp">
											<button
												type="button"
												disabled
												className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366]/60 text-white font-sans text-xs font-bold py-2.5 cursor-not-allowed"
											>
												<WhatsAppIcon className="h-4 w-4" />
												WhatsApp Business
											</button>
										</MockupTest>
									)
								) : (
									<div className="rounded-xl border border-dashed border-brand/40 bg-brand-soft/30 px-4 py-4 text-center">
										<WhatsAppIcon className="mx-auto mb-2 h-5 w-5 text-[#25D366]" />
										<p className="font-sans text-xs text-ink-muted leading-relaxed">
											{t("iscrizione.whatsappGate.hint")}
										</p>
										<Link
											to={`/login?tab=signup&redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
											className="mt-2 inline-flex items-center gap-1 font-sans text-xs font-black text-brand hover:text-brand-hover"
										>
											{t("iscrizione.whatsappGate.cta")}
											<ArrowRight className="h-3 w-3" />
										</Link>
									</div>
								)
							)}

							{openingHours.length > 0 && (
									<div className="rounded-xl border border-line bg-bg-raised p-4">
										<div className="flex items-center justify-between">
											<span className="font-sans text-[10px] font-bold uppercase tracking-widest text-ink-faint">
												{t("iscrizione.detail.hours")}
											</span>
											<Clock className="h-3.5 w-3.5 text-ink-faint" />
										</div>
										<ul className="mt-2.5 flex flex-col gap-1">
											{openingHours.map((h, i) => {
												const isToday = h === todayHours;
												return (
													<li
														key={i}
														className={
															isToday
																? "font-sans text-xs font-bold text-ink"
																: "font-sans text-xs text-ink-muted"
														}
													>
														{h}
													</li>
												);
											})}
										</ul>
									</div>
								)}
							</div>

							{/* Photos column — overflow allowed, scrollable horizontally */}
							<div className="lg:col-span-7 min-w-0">
								<MockupTest name="iscrizione-photos" badge={false}>
									<div className="overflow-x-auto scrollbar-thin snap-x snap-mandatory -mx-4 lg:mx-0 lg:-mr-8">
										<div className="flex gap-3 px-4 lg:px-0 pb-2">
											{MOCK_PHOTOS.map((photo, i) => (
												<button
													key={photo.url}
													type="button"
													onClick={() => setLightboxIndex(i)}
													aria-label={t("iscrizione.picker.photoExpandLabel")}
													data-mockup-cta={`photo-${i}`}
													className="shrink-0 snap-start w-[220px] sm:w-[280px] aspect-[4/3] rounded-xl overflow-hidden bg-bg-sunken border border-line/60 hover:border-line-strong transition-all hover:-translate-y-0.5 cursor-pointer"
												>
													<img
														src={photo.url}
														alt={photo.alt}
														loading="lazy"
														className="w-full h-full object-cover opacity-80 saturate-75 hover:opacity-100 hover:saturate-100 transition duration-300"
														onError={(e) => {
															(e.currentTarget as HTMLImageElement).style.display = "none";
														}}
													/>
												</button>
											))}
										</div>
									</div>
								</MockupTest>
							</div>
						</div>
					</div>
				</section>

				{/* LICENCE PICKER — compact */}
				<section id="patenti" className="pb-12 scroll-mt-24">
					<div className="mx-auto w-full max-w-(--container-default) px-4 lg:px-8">
						<MockupTest name="iscrizione-licence-picker" badge={true}>
							<div className="rounded-2xl border border-line bg-bg-raised shadow-sm overflow-hidden">
								{/* Header */}
								<div className="px-5 py-4 md:px-6 border-b border-line bg-bg-sunken/30">
									<span className="font-sans text-[10px] font-bold uppercase tracking-widest text-ink-faint">
										{t("iscrizione.picker.eyebrow")}
									</span>
									<h2 className="mt-1 font-sans text-base font-black text-ink">
										{t("iscrizione.picker.heading")}
									</h2>
								</div>

								{/* Pills */}
								<div className="px-5 py-4 md:px-6 border-b border-line">
									<div className="flex flex-wrap gap-2">
										{availableLicences.map((code) => {
											const isSelected = selectedLicence === code;
											return (
												<button
													key={code}
													type="button"
													onClick={() => setSelectedLicence(code)}
													data-mockup-cta={`pick-licence-${code}`}
													aria-pressed={isSelected}
													className={
														isSelected
															? "rounded-full bg-brand text-white px-3.5 py-1.5 font-sans text-xs font-black shadow-sm transition-all"
															: "rounded-full border border-line bg-bg text-ink-muted px-3.5 py-1.5 font-sans text-xs font-bold hover:border-line-strong hover:text-ink transition-all"
													}
												>
													{t("iscrizione.picker.patenteLabel", { code })}
												</button>
											);
										})}
									</div>
								</div>

								{/* Detail */}
								<div className="grid gap-0 md:grid-cols-2">
									{/* Left: meta + includes */}
									<div className="px-5 py-5 md:px-6 md:py-6 border-b md:border-b-0 md:border-r border-line">
										<div className="flex items-baseline justify-between gap-3">
											<div>
												<h3 className="font-sans text-base font-bold text-ink">
													{t("iscrizione.picker.patenteLabel", { code: selectedLicence })}
												</h3>
												<p className="mt-0.5 font-sans text-xs text-ink-muted">
													{selectedInfo.description}
												</p>
											</div>
											<div className="text-right shrink-0">
												<div className="font-sans text-2xl font-black text-brand leading-none">
													{displayPrice}
												</div>
												<span className="mt-1 inline-block font-sans text-[9px] uppercase tracking-widest text-ink-faint font-bold">
													{priceIsReal ? t("iscrizione.picker.priceLabel") : t("iscrizione.detail.exampleLabel")}
												</span>
											</div>
										</div>

										{/* Variants — show only if licence has multiple packages */}
										{selectedInfo.variants && selectedInfo.variants.length > 1 && (
											<div className="mt-5">
												<span className="font-sans text-[10px] font-bold uppercase tracking-widest text-ink-faint">
													{t("iscrizione.picker.variantsLabel")}
												</span>
												<div className="mt-2 flex flex-wrap gap-1.5">
													{selectedInfo.variants.map((v) => {
														const isActive = v.key === variantKey;
														return (
															<button
																key={v.key}
																type="button"
																onClick={() => setVariantKey(v.key)}
																data-mockup-cta={`variant-${v.key}`}
																aria-pressed={isActive}
																className={
																	isActive
																		? "rounded-md bg-brand-soft border border-brand text-brand-ink px-2.5 py-1 font-sans text-[11px] font-black"
																		: "rounded-md border border-line bg-bg text-ink-muted px-2.5 py-1 font-sans text-[11px] font-bold hover:border-line-strong hover:text-ink transition-colors"
																}
															>
																{v.label}
															</button>
														);
													})}
												</div>
											</div>
										)}

										<div className="mt-5">
											<span className="font-sans text-[10px] font-bold uppercase tracking-widest text-ink-faint">
												{t("iscrizione.picker.includesLabel")}
											</span>
											<ul className="mt-2.5 flex flex-col gap-1.5">
												{variantIncludes.map((item, idx) => (
													<li key={idx} className="flex items-start gap-2">
														<Check className="h-3.5 w-3.5 text-brand mt-0.5 shrink-0" />
														<span className="font-sans text-xs leading-relaxed text-ink">
															{item}
														</span>
													</li>
												))}
											</ul>
										</div>
									</div>

									{/* Right: config options + CTA */}
									<div className="px-5 py-5 md:px-6 md:py-6 bg-bg-sunken/20 flex flex-col gap-4">
										{/* Transmission */}
										{selectedInfo.transmissionOptions && selectedInfo.transmissionOptions.length > 1 && (
											<div>
												<span className="font-sans text-[10px] font-bold uppercase tracking-widest text-ink-faint">
													{t("iscrizione.picker.transmissionLabel")}
												</span>
												<div className="mt-2 grid grid-cols-2 gap-1.5">
													{(["manual", "auto"] as const).map((opt) => {
														const isActive = transmission === opt;
														const label = opt === "manual"
															? t("iscrizione.picker.transmissionManual")
															: t("iscrizione.picker.transmissionAuto");
														const delta = opt === "auto" && selectedInfo.transmissionDeltaAuto
															? `+${selectedInfo.transmissionDeltaAuto} €`
															: null;
														return (
															<button
																key={opt}
																type="button"
																onClick={() => setTransmission(opt)}
																data-mockup-cta={`transmission-${opt}`}
																aria-pressed={isActive}
																className={
																	isActive
																		? "rounded-lg border border-brand bg-brand-soft px-3 py-2 text-left transition-colors"
																		: "rounded-lg border border-line bg-bg-raised px-3 py-2 text-left hover:border-line-strong transition-colors"
																}
															>
																<span className={
																	isActive
																		? "block font-sans text-xs font-black text-brand-ink"
																		: "block font-sans text-xs font-bold text-ink"
																}>
																	{label}
																</span>
																{delta && (
																	<span className="block mt-0.5 font-sans text-[10px] text-ink-muted">
																		{delta}
																	</span>
																)}
															</button>
														);
													})}
												</div>
											</div>
										)}

										{/* Extra hours — counter with pack discount */}
										{hourlyRate > 0 && (
											<div>
												<div className="flex items-baseline justify-between gap-2">
													<span className="font-sans text-[10px] font-bold uppercase tracking-widest text-ink-faint">
														{t("iscrizione.picker.extraHoursLabel")}
													</span>
													<span className="font-sans text-[10px] text-ink-faint">
														{hourlyRate} € {t("iscrizione.picker.extraHoursPricePer")}
													</span>
												</div>
												<p className="mt-1 font-sans text-[10px] text-ink-muted">
													{t("iscrizione.picker.extraHoursHint")}
												</p>
												<div className="mt-2 flex items-center gap-2 rounded-lg border border-line bg-bg-raised p-1">
													<button
														type="button"
														onClick={() => setExtraHours((h) => Math.max(0, h - 1))}
														disabled={extraHours === 0}
														aria-label={t("iscrizione.picker.extraHoursDecrement")}
														data-mockup-cta="extra-hours-decrement"
														className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-bg-sunken hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
													>
														<Minus className="h-3.5 w-3.5" />
													</button>
													<div className="flex-1 text-center">
														<span className="font-sans text-base font-black text-ink leading-none">
															{extraHours}
														</span>
														<span className="ml-1 font-sans text-[10px] text-ink-muted">
															{extraHours === 1
																? t("iscrizione.picker.extraHoursOne")
																: t("iscrizione.picker.extraHoursUnit")}
														</span>
													</div>
													<button
														type="button"
														onClick={() => setExtraHours((h) => Math.min(EXTRA_HOURS_MAX, h + 1))}
														disabled={extraHours >= EXTRA_HOURS_MAX}
														aria-label={t("iscrizione.picker.extraHoursIncrement")}
														data-mockup-cta="extra-hours-increment"
														className="flex h-8 w-8 items-center justify-center rounded-md text-ink-muted hover:bg-bg-sunken hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
													>
														<Plus className="h-3.5 w-3.5" />
													</button>
												</div>
												{hasPackDiscount ? (
													<div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-soft border border-brand/30 px-2.5 py-1">
														<Sparkles className="h-3 w-3 text-brand" />
														<span className="font-sans text-[10px] font-black uppercase tracking-widest text-brand-ink">
															{t("iscrizione.picker.extraHoursDiscountBadge")}
														</span>
													</div>
												) : (
													<button
														type="button"
														onClick={() => setExtraHours(PACK_THRESHOLD)}
														data-mockup-cta="extra-hours-pack"
														className="mt-2 inline-flex items-center gap-1 rounded-md border border-dashed border-brand/40 bg-brand-soft/40 px-2 py-1 font-sans text-[10px] font-bold text-brand-ink hover:bg-brand-soft transition-colors"
													>
														<Sparkles className="h-3 w-3 text-brand" />
														{t("iscrizione.picker.extraHoursAddPack")}
													</button>
												)}
											</div>
										)}

										{/* Vehicles */}
										<div>
											<span className="font-sans text-[10px] font-bold uppercase tracking-widest text-ink-faint">
												{t("iscrizione.picker.vehiclesLabel")}
											</span>
											<div className="mt-2.5 flex flex-col gap-1.5">
												{selectedInfo.vehicles.length > 0 ? (
													selectedInfo.vehicles.map((v, i) => (
														<div
															key={i}
															className="flex items-center justify-between gap-2 rounded-lg border border-line bg-bg-raised px-3 py-2"
														>
															<span className="font-sans text-xs font-bold text-ink truncate">
																{v.name}
															</span>
															<span className="font-sans text-[10px] text-ink-muted shrink-0">
																{v.transmission}
															</span>
														</div>
													))
												) : (
													<p className="font-sans text-xs text-ink-faint italic">
														{t("iscrizione.picker.noVehicles")}
													</p>
												)}
											</div>
										</div>

										<div className="mt-auto flex flex-col gap-2">
											<button
												type="button"
												data-mockup-cta={`enroll-${selectedLicence}`}
												onClick={() => setPaywallOpen(true)}
												className="w-full rounded-pill bg-brand text-white font-sans text-xs font-black py-3 hover:bg-brand-hover transition-colors shadow-cta"
											>
												{t("iscrizione.picker.enrollCta", { code: selectedLicence })}
											</button>
											<p className="font-sans text-[10px] text-ink-faint text-center">
												{t("iscrizione.picker.paypalNote")}
											</p>
										</div>
									</div>
								</div>
							</div>

							<p className="mt-3 font-sans text-[10px] text-ink-faint italic">
								{t("iscrizione.picker.mockNote")}
							</p>
						</MockupTest>
					</div>
				</section>

			</main>
			<Footer />

			{/* Lightbox — click photo to expand with blurred backdrop */}
			{lightboxIndex !== null && (
				<div
					className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-ink/70 backdrop-blur-md animate-in fade-in duration-150"
					onClick={() => setLightboxIndex(null)}
					role="dialog"
					aria-modal="true"
				>
					<button
						type="button"
						onClick={() => setLightboxIndex(null)}
						aria-label={t("iscrizione.picker.photoCloseLabel")}
						className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
					>
						<X className="h-5 w-5" />
					</button>

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							setLightboxIndex((i) => (i === null ? null : (i - 1 + MOCK_PHOTOS.length) % MOCK_PHOTOS.length));
						}}
						aria-label="prev"
						className="absolute left-4 md:left-8 h-12 w-12 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
					>
						<ChevronLeft className="h-6 w-6" />
					</button>

					<div
						className="relative max-w-5xl w-full max-h-[85dvh] flex items-center justify-center"
						onClick={(e) => e.stopPropagation()}
					>
						<img
							src={MOCK_PHOTOS[lightboxIndex].url}
							alt={MOCK_PHOTOS[lightboxIndex].alt}
							className="max-w-full max-h-[85dvh] object-contain rounded-2xl shadow-2xl"
						/>
						<div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-ink/60 backdrop-blur-sm px-3 py-1 font-sans text-[10px] font-bold text-white tracking-widest uppercase">
							{lightboxIndex + 1} / {MOCK_PHOTOS.length}
						</div>
					</div>

					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							setLightboxIndex((i) => (i === null ? null : (i + 1) % MOCK_PHOTOS.length));
						}}
						aria-label="next"
						className="absolute right-4 md:right-8 h-12 w-12 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors flex items-center justify-center"
					>
						<ChevronRight className="h-6 w-6" />
					</button>
				</div>
			)}

			<EnrollPaywall
				open={paywallOpen}
				onClose={() => setPaywallOpen(false)}
				schoolName={schoolName}
				licenceCode={selectedLicence}
				displayPrice={displayPrice}
				returnTo={returnTo}
			/>
		</div>
	);
}

function InfoRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
	return (
		<div className="flex items-start gap-2.5">
			<div className="mt-0.5 shrink-0">{icon}</div>
			<div className="flex flex-col min-w-0">{children}</div>
		</div>
	);
}
