# 💻 CareConnect — Frontend Client

> Modern single-page web application (SPA) built with **React 19**, **Vite**, **Tailwind CSS**, and **React Router v7**. Provides role-tailored dashboards and interfaces for Customers, Service Providers, Operations Managers, Support Agents, and Administrators.

---

## 🚀 Key Highlights & Capabilities

- **Role-Gated Dashboards**: Automatically detects user role (`customer`, `provider`, `ops_manager`, `support_agent`, `admin`) and routes to the appropriate dashboard.
- **Smart Request Builder**: Allows customers to submit service requests, review AI classification output, and receive quotes.
- **Provider Discovery & Map View**: Browse provider profiles, check availability calendars, ratings, and view location data via Leaflet maps.
- **Job Tracking & Live Work Evidence**: Real-time progress tracker (`pending` → `en_route` → `started` → `completed`), work notes log, and customer confirmation actions.
- **Interactive Analytics**: Visual graphs and financial metrics powered by Recharts.
- **Built-in Support Assistant**: Interactive FAQ and issue resolution assistance.
- **Production-Ready Routing**: Includes both `public/_redirects` (Netlify) and `vercel.json` (Vercel) to prevent 404s on page refresh.

---

## 🛠️ Tech Stack & Dependencies

| Tool / Library | Version | Usage |
| :--- | :--- | :--- |
| **React** | `^19.2.8` | Core UI library |
| **Vite** | `^8.2.2` | Fast bundler & development environment |
| **React Router** | `^7.8.2` | Client-side routing with role-based protection |
| **Tailwind CSS** | `^4.3.3` | Utility-first responsive design system |
| **Axios** | `^1.11.0` | API communication with JWT interceptors |
| **Lucide React** | `^0.468.0` | Modern, consistent iconography |
| **Recharts** | `^3.10.1` | Responsive charts for admin and ops analytics |
| **Leaflet & React-Leaflet** | `^1.9.4 / ^5.0.0` | Map integration for provider location viewing |

---

## 📂 Source Code Structure

```
frontend/
├── public/                   # Static assets (favicons, icons)
│   └── _redirects            # Netlify SPA redirect configuration
├── vercel.json               # Vercel SPA rewrite configuration
├── vite.config.js            # Vite build options
├── package.json              # Frontend scripts & dependencies
└── src/
    ├── api.js                # Central Axios instance with Bearer token header injection
    ├── App.jsx               # Main routing table with ProtectedRoute wrappers
    ├── main.jsx              # App entry point with Router and AuthProvider
    ├── index.css             # Base Tailwind styles & typography
    ├── components/
    │   ├── Layout.jsx        # Navigation shell with role-aware sidebar/header
    │   ├── Navbar.jsx        # Top navigation bar
    │   └── ProtectedRoute.jsx# Role-authorization guard
    ├── context/
    │   └── AuthContext.jsx   # Authentication state, login/logout, JWT persistence
    ├── pages/                # All application views (22 pages)
    │   ├── Home.jsx          # Public landing page
    │   ├── Auth.jsx          # Login & registration screen
    │   ├── CustomerDashboard.jsx # Customer hub
    │   ├── ProviderDashboard.jsx # Provider job & quote management
    │   ├── AdminDashboard.jsx    # System administrative controls
    │   ├── ManagerDashboard.jsx  # Operations manager pipeline view
    │   ├── SupportDashboard.jsx  # Dispute & ticket resolution
    │   ├── Requests.jsx          # Request listings
    │   ├── NewRequest.jsx        # Service request creation with AI suggestions
    │   ├── RequestDetail.jsx     # Quotes review & booking trigger
    │   ├── Providers.jsx         # Provider discovery directory
    │   ├── ProviderDetail.jsx    # Provider profile & reviews
    │   ├── ProviderLocation.jsx  # Interactive map view of provider service area
    │   ├── Bookings.jsx          # User bookings list
    │   ├── BookingDetail.jsx     # Job progress, notes, evidence & messaging
    │   ├── Analytics.jsx         # Visual analytics reports
    │   ├── Disputes.jsx          # Dispute filing and handling
    │   ├── UserManagement.jsx    # User activation & role administration
    │   ├── FaqAssistant.jsx      # FAQ helper for customer questions
    │   ├── Notifications.jsx     # System notifications center
    │   └── Profile.jsx           # User profile editor
    └── utils/
        └── roles.js          # Role normalization helper
```

---

## ⚙️ Environment Variables

Create a `.env` file in the `frontend/` directory (or configure in your deployment platform):

```env
# URL pointing to the running backend API
VITE_API_URL=http://localhost:5000/api/v1
```

*Note: For production deployment on Vercel or Netlify, set `VITE_API_URL` to your live backend domain (e.g. `https://your-backend.onrender.com/api/v1`).*

---

## 🚀 Setup & Commands

### **1. Install Dependencies**
```bash
npm install
```

### **2. Run Locally in Development Mode**
```bash
npm run dev
```
The app will start at `http://localhost:5173`.

### **3. Build for Production**
```bash
npm run build
```
Creates an optimized, minified bundle in the `dist/` directory ready for deployment.

### **4. Preview Production Build Locally**
```bash
npm run preview
```

---

## 🌐 Production Deployment

### **Deploying on Vercel**
1. Import repository and set **Root Directory** to `frontend`.
2. Framework Preset: **Vite**.
3. Under Environment Variables, add `VITE_API_URL` with your deployed backend URL.
4. Click **Deploy**. *(The included `vercel.json` ensures direct URL navigations and page refreshes work properly without 404 errors).*

### **Deploying on Netlify**
1. Import repository and set **Base directory** to `frontend`.
2. Build command: `npm run build`.
3. Publish directory: `dist`.
4. Add environment variable `VITE_API_URL`.
5. *(The included `public/_redirects` file guarantees SPA client-side routing).*
