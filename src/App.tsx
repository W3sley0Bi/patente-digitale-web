import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import Landing from "./routes/Landing";
import { ScrollToHash } from "./hooks/useScrollToHash";

// Lazy load other routes
const Cerca = lazy(() => import("./routes/Cerca"));
const Iscrizione = lazy(() => import("./routes/Iscrizione"));
const Partner = lazy(() => import("./routes/Partner"));
const Accedi = lazy(() => import("./routes/Accedi"));

// Loading fallback
const LoadingFallback = () => (
	<div className="flex min-h-screen items-center justify-center bg-bg">
		<div className="h-8 w-8 animate-pulse rounded-full bg-brand/20" />
	</div>
);

function App() {
	return (
		<BrowserRouter>
			<ScrollToHash />
			<Suspense fallback={<LoadingFallback />}>
				<Routes>
					<Route path="/" element={<Landing />} />
					<Route path="/cerca" element={<Cerca />} />
					<Route path="/iscrizione" element={<Iscrizione />} />
					<Route path="/partner" element={<Partner />} />
					<Route path="/accedi" element={<Accedi />} />
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</Suspense>
		</BrowserRouter>
	);
}

export default App;
