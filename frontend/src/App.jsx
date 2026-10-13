import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./context/AuthContext";
import { normalizeRole } from "./utils/roles";
import AdminDashboard from "./pages/AdminDashboard";
import Analytics from "./pages/Analytics";
import Auth from "./pages/Auth";
import BookingDetail from "./pages/BookingDetail";
import Bookings from "./pages/Bookings";
import CustomerDashboard from "./pages/CustomerDashboard";
import Disputes from "./pages/Disputes";
import FaqAssistant from "./pages/FaqAssistant";
import Home from "./pages/Home";
import ManagerDashboard from "./pages/ManagerDashboard";
import NewRequest from "./pages/NewRequest";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import ProviderDashboard from "./pages/ProviderDashboard";
import ProviderDetail from "./pages/ProviderDetail";
import ProviderLocation from "./pages/ProviderLocation";
import ProviderProfile from "./pages/ProviderProfile";
import Providers from "./pages/Providers";
import RequestDetail from "./pages/RequestDetail";
import Requests from "./pages/Requests";
import SupportDashboard from "./pages/SupportDashboard";
import UserManagement from "./pages/UserManagement";

function Dashboard() {
  const { user } = useAuth();
  const role = normalizeRole(user?.role);

  if (role === "admin") return <AdminDashboard />;
  if (role === "ops_manager") return <ManagerDashboard />;
  if (role === "support_agent") return <SupportDashboard />;
  if (role === "provider") return <ProviderDashboard />;
  return <CustomerDashboard />;
}

function privatePage(element, roles) {
  return (
    <ProtectedRoute roles={roles}>
      <Layout>{element}</Layout>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Auth mode="login" />} />
      <Route path="/register" element={<Auth mode="register" />} />
      <Route path="/dashboard" element={privatePage(<Dashboard />)} />
      <Route path="/assistant" element={privatePage(<FaqAssistant />, ["customer"])} />
      <Route path="/providers" element={privatePage(<Providers />)} />
      <Route path="/providers/:id" element={privatePage(<ProviderDetail />)} />
      <Route path="/requests" element={privatePage(<Requests />)} />
      <Route path="/requests/new" element={privatePage(<NewRequest />, ["customer"])} />
      <Route path="/requests/:id" element={privatePage(<RequestDetail />)} />
      <Route path="/bookings" element={privatePage(<Bookings />)} />
      <Route path="/bookings/:id" element={privatePage(<BookingDetail />)} />
      <Route path="/disputes" element={privatePage(<Disputes />, ["admin", "ops_manager", "support_agent"])} />
      <Route path="/notifications" element={privatePage(<Notifications />)} />
      <Route path="/analytics" element={privatePage(<Analytics />, ["admin", "ops_manager"])} />
      <Route path="/users" element={privatePage(<UserManagement />, ["admin"])} />
      <Route path="/profile" element={privatePage(<Profile />)} />
      <Route path="/profile/provider" element={privatePage(<ProviderProfile />, ["provider"])} />
      <Route path="/profile/provider/location" element={privatePage(<ProviderLocation />, ["provider"])} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}