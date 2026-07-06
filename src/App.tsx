import { lazy, Suspense } from "react";
import {
	BrowserRouter,
	Navigate,
	Route,
	Routes,
	useLocation,
} from "react-router";
import { AppHomeRedirect } from "@/components/auth/AppHomeRedirect";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/lib/AuthContext";
import { ScrollToHash } from "./hooks/useScrollToHash";
import Landing from "./routes/Landing";

const Cerca = lazy(() => import("./routes/Cerca"));
const Login = lazy(() => import("./routes/Login"));
const QuizOnline = lazy(() => import("./routes/QuizOnline"));
const ResetPassword = lazy(() => import("./routes/ResetPassword"));
const SignupDrivingSchool = lazy(() => import("./routes/SignupDrivingSchool"));
const StudentDashboard = lazy(() => import("./routes/StudentDashboard"));
const StudentGuide = lazy(() => import("./routes/StudentGuide"));
const StudentProfile = lazy(() => import("./routes/StudentProfile"));
const StudentSettings = lazy(() => import("./routes/StudentSettings"));
const DrivingSchoolDashboard = lazy(
	() => import("./routes/DrivingSchoolDashboard"),
);
const DrivingSchoolGuide = lazy(() => import("./routes/DrivingSchoolGuide"));
const DrivingSchoolStudents = lazy(
	() => import("./routes/DrivingSchoolStudents"),
);
const DrivingSchoolEdit = lazy(() => import("./routes/DrivingSchoolEdit"));
const DrivingSchoolProfile = lazy(
	() => import("./routes/DrivingSchoolProfile"),
);
const SetPassword = lazy(() => import("./routes/SetPassword"));
const DrivingSchoolSettings = lazy(
	() => import("./routes/DrivingSchoolSettings"),
);
const ClaimStudent = lazy(() => import("./routes/ClaimStudent"));
const NotFound = lazy(() => import("./routes/NotFound"));
const ServerError = lazy(() => import("./routes/ServerError"));

/** Redirect that preserves the query string (e.g. old /cerca?placeId=... QR posters). */
const SearchRedirect = () => {
	const location = useLocation();
	return <Navigate to={`/search${location.search}`} replace />;
};

const LoadingFallback = () => (
	<div className="flex min-h-screen items-center justify-center bg-bg">
		<div className="h-8 w-8 animate-pulse rounded-full bg-brand/20" />
	</div>
);

function App() {
	return (
		<BrowserRouter>
			<AuthProvider>
				<ScrollToHash />
				<ErrorBoundary fallback={<ServerError />}>
					<Suspense fallback={<LoadingFallback />}>
						<Routes>
							<Route path="/" element={<Landing />} />
							<Route path="/students" element={<Navigate to="/" replace />} />
							<Route
								path="/driving-schools"
								element={<Navigate to="/" replace />}
							/>
							<Route path="/cerca" element={<SearchRedirect />} />
							<Route path="/search" element={<Cerca />} />
							<Route path="/iscrizione" element={<SearchRedirect />} />
							<Route path="/partner" element={<Navigate to="/" replace />} />
							<Route path="/claim/:token" element={<ClaimStudent />} />
							<Route path="/app" element={<AppHomeRedirect />} />
							<Route path="/app/login" element={<Login />} />
							<Route path="/app/reset-password" element={<ResetPassword />} />
							<Route
								path="/app/quiz"
								element={
									<ProtectedRoute requiredRole="student">
										<QuizOnline />
									</ProtectedRoute>
								}
							/>
							<Route
								path="/app/signup"
								element={<Navigate to="/app/login?tab=signup" replace />}
							/>
							<Route
								path="/app/signup/driving-school"
								element={<SignupDrivingSchool />}
							/>
							<Route
								path="/app/student"
								element={
									<ProtectedRoute requiredRole="student">
										<StudentDashboard />
									</ProtectedRoute>
								}
							/>
							<Route
								path="/app/student/drive-bookings"
								element={
									<ProtectedRoute requiredRole="student">
										<StudentGuide />
									</ProtectedRoute>
								}
							/>
							<Route
								path="/app/student/profile"
								element={
									<ProtectedRoute requiredRole="student">
										<StudentProfile />
									</ProtectedRoute>
								}
							/>
							<Route
								path="/app/student/settings"
								element={
									<ProtectedRoute requiredRole="student">
										<StudentSettings />
									</ProtectedRoute>
								}
							/>
							<Route
								path="/app/driving-school"
								element={
									<ProtectedRoute requiredRole="autoscuola">
										<DrivingSchoolDashboard />
									</ProtectedRoute>
								}
							/>
							<Route
								path="/app/driving-school/drive-bookings"
								element={
									<ProtectedRoute requiredRole="autoscuola" requireApproved>
										<DrivingSchoolGuide />
									</ProtectedRoute>
								}
							/>
							<Route
								path="/app/driving-school/students"
								element={
									<ProtectedRoute requiredRole="autoscuola" requireApproved>
										<DrivingSchoolStudents />
									</ProtectedRoute>
								}
							/>
							<Route
								path="/app/driving-school/profile"
								element={
									<ProtectedRoute requiredRole="autoscuola" requireApproved>
										<DrivingSchoolProfile />
									</ProtectedRoute>
								}
							/>
							<Route
								path="/app/driving-school/profile/edit"
								element={
									<ProtectedRoute requiredRole="autoscuola" requireApproved>
										<DrivingSchoolEdit />
									</ProtectedRoute>
								}
							/>
							<Route
								path="/app/driving-school/settings"
								element={
									<ProtectedRoute requiredRole="autoscuola" requireApproved>
										<DrivingSchoolSettings />
									</ProtectedRoute>
								}
							/>
							<Route
								path="/app/set-password"
								element={
									<ProtectedRoute>
										<SetPassword />
									</ProtectedRoute>
								}
							/>
							<Route path="*" element={<NotFound />} />
						</Routes>
					</Suspense>
				</ErrorBoundary>
			</AuthProvider>
		</BrowserRouter>
	);
}

export default App;
