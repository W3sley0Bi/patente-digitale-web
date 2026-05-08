import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import Landing from "./routes/Landing";
import { ScrollToHash } from "./hooks/useScrollToHash";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const Cerca = lazy(() => import("./routes/Cerca"));
const Iscrizione = lazy(() => import("./routes/Iscrizione"));
const Partner = lazy(() => import("./routes/Partner"));
const Login = lazy(() => import("./routes/Login"));
const QuizOnline = lazy(() => import("./routes/QuizOnline"));
const ResetPassword = lazy(() => import("./routes/ResetPassword"));
const SignupDrivingSchool = lazy(() => import("./routes/SignupDrivingSchool"));
const StudentDashboard = lazy(() => import("./routes/StudentDashboard"));
const DrivingSchoolDashboard = lazy(() => import("./routes/DrivingSchoolDashboard"));
const DrivingSchoolEdit = lazy(() => import("./routes/DrivingSchoolEdit"));
const SetPassword = lazy(() => import("./routes/SetPassword"));
const DrivingSchoolSettings = lazy(() => import("./routes/DrivingSchoolSettings"));

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
					<Route path="/cerca" element={<Navigate to="/search" replace />} />
					<Route path="/search" element={<Cerca />} />
					<Route path="/iscrizione" element={<Iscrizione />} />
					<Route path="/partner" element={<Partner />} />
					<Route path="/login" element={<Login />} />
					<Route path="/reset-password" element={<ResetPassword />} />
					<Route path="/quiz" element={
						<ProtectedRoute requiredRole="student">
							<QuizOnline />
						</ProtectedRoute>
					} />
					<Route path="/signup" element={<Navigate to="/login?tab=signup" replace />} />
					<Route path="/signup/driving-school" element={<SignupDrivingSchool />} />
					<Route
						path="/student/dashboard"
						element={
							<ProtectedRoute requiredRole="student">
								<StudentDashboard />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/driving-school/dashboard"
						element={
							<ProtectedRoute requiredRole="autoscuola">
								<DrivingSchoolDashboard />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/driving-school/dashboard/edit"
						element={
							<ProtectedRoute requiredRole="autoscuola" requireApproved>
								<DrivingSchoolEdit />
							</ProtectedRoute>
						}
					/>
					<Route
						path="/driving-school/dashboard/settings"
						element={
							<ProtectedRoute requiredRole="autoscuola">
								<DrivingSchoolSettings />
							</ProtectedRoute>
						}
					/>
					<Route path="/set-password" element={
						<ProtectedRoute>
							<SetPassword />
						</ProtectedRoute>
					} />
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</Suspense>
		</BrowserRouter>
	);
}

export default App;
