import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import CustomerDashboard from "./pages/CustomerDashboard";
import ProviderDashboard from "./pages/ProviderDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ManagerDashboard from "./pages/ManagerDashboard";
import SupportDashboard from "./pages/SupportDashboard";
import Requests from "./pages/Requests";
import NewRequest from "./pages/NewRequest";
import RequestDetail from "./pages/RequestDetail";
import Providers from "./pages/Providers";
import ProviderDetail from "./pages/ProviderDetail";
import ProviderProfile from "./pages/ProviderProfile";
import Bookings from "./pages/Bookings";
import BookingDetail from "./pages/BookingDetail";
import Notifications from "./pages/Notifications";
import Analytics from "./pages/Analytics";
import Disputes from "./pages/Disputes";
import Profile from "./pages/Profile";
import UserManagement from "./pages/UserManagement";
import FaqAssistant from "./pages/FaqAssistant";
import ProviderLocation from "./pages/ProviderLocation";
import { useAuth } from "./context/AuthContext";
import { normalizeRole } from "./utils/roles";

function Dashboard(){
 const {user}=useAuth();
 const role = normalizeRole(user?.role);
 if(role==="customer")return <CustomerDashboard/>;
 if(role==="provider")return <ProviderDashboard/>;
 if(role==="support_agent")return <SupportDashboard/>;
 if(role==="ops_manager")return <ManagerDashboard/>;
 return <AdminDashboard/>;
}

function App(){
 const privateRoute=(el,roles)=><ProtectedRoute roles={roles}><Layout>{el}</Layout></ProtectedRoute>;
 return <Routes>
   <Route path="/" element={<Home/>}/>
   <Route path="/login" element={<Auth mode="login"/>}/>
   <Route path="/register" element={<Auth mode="register"/>}/>
   <Route path="/dashboard" element={privateRoute(<Dashboard/>)}/>
   <Route path="/requests" element={privateRoute(<Requests/>)}/>
   <Route path="/requests/new" element={privateRoute(<NewRequest/>,["customer"])}/>
  <Route path="/assistant" element={privateRoute(<FaqAssistant/>,["customer"])}/>
   <Route path="/requests/:id" element={privateRoute(<RequestDetail/>)}/>
   <Route path="/providers" element={privateRoute(<Providers/>)}/>
   <Route path="/providers/:id" element={privateRoute(<ProviderDetail/>)}/>
   <Route path="/profile" element={privateRoute(<Profile/>)}/>
  <Route path="/users" element={privateRoute(<UserManagement/>,["admin"])}/>
   <Route path="/profile/provider" element={privateRoute(<ProviderProfile/>,["provider"])}/>
  <Route path="/profile/provider/location" element={privateRoute(<ProviderLocation/>,["provider"])}/>
   <Route path="/bookings" element={privateRoute(<Bookings/>)}/>
   <Route path="/bookings/:id" element={privateRoute(<BookingDetail/>)}/>
   <Route path="/notifications" element={privateRoute(<Notifications/>)}/>
  <Route path="/analytics" element={privateRoute(<Analytics/>,["admin","ops_manager","manager"])}/>
  <Route path="/disputes" element={privateRoute(<Disputes/>,["admin","ops_manager","manager","support_agent"])}/>
   <Route path="*" element={<Navigate to="/" replace/>}/>
 </Routes>
}
export default App;
