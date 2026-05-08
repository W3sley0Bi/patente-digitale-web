import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import Landing from "./routes/Landing";
import { ScrollToHash } from "./hooks/useScrollToHash";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

const Cerca = lazy(() => import("./routes/Cerca"));
const Iscrizione = lazy(() => import("./routes/Iscrizione"));
const Partner = lazy(() => import("./routes/Partner"));
const Login = lazy(() => import("./routes/Login"));
const Signup = lazy(() => import("./routes/Signup"));
const SignupDrivingSchool = lazy(() => import("./routes/SignupDrivingSchool"));
const StudentDashboard = lazy(() => import("./routes/StudentDashboard"));
const DrivingSchoolDashboard = lazy(() => import("./routes/DrivingSchoolDashboard"));
const DrivingSchoolEdit = lazy(() => import("./routes/DrivingSchoolEdit"));

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
					<Route path="/signup" element={<Signup />} />
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
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</Suspense>
		</BrowserRouter>
	);
}

export default App;
