# ⚙️ CareConnect — Backend REST API

> Scalable Node.js & Express.js RESTful API engine powered by MongoDB & Mongoose. Features JWT authentication, role-based access control (RBAC across 5 roles), AI-assisted classification & provider ranking, availability engine, job workflow tracking, automated invoicing, disputes, and analytics.

---

## 🏛️ Architecture & Highlights

- **Clean MVC Design**: Strict separation into `routes → controllers → services → models`.
- **Role-Based Access Control (RBAC)**: Fine-grained middleware authorization for `admin`, `ops_manager`, `provider`, `customer`, and `support_agent`.
- **AI Classification & Provider Ranking**: Zero-cost heuristic classifier (`ai.service.js`) that analyzes request descriptions, maps required skills, and ranks providers based on relevance, rating, and scheduling availability.
- **Double-Booking Prevention**: Provider availability slot engine guarantees conflict-free scheduling.
- **Database Seeder**: Includes a realistic mock data generator (`seed/seed.js`) initializing categories, users across all roles, quotes, bookings, evidence logs, and invoices.

---

## 📂 Source Code Structure

```
backend/
├── server.js              # Entry point: connects DB then starts HTTP server
├── package.json           # Dependencies and scripts
├── .env.example           # Template for environment configuration
├── seed/
│   └── seed.js            # Database seeder with realistic test data
├── test/
│   └── ai.service.test.js # Unit test suite for classifier & ranking engine
└── src/
    ├── app.js             # Express application setup, CORS, JSON limit, and error handling
    ├── config/
    │   └── db.js          # Mongoose database connection logic
    ├── controllers/       # Request handlers & response formatting
    ├── middleware/
    │   ├── auth.js        # JWT verification & role authorization middleware
    │   └── errorHandler.js# Centralized error handler & 404 handler
    ├── models/            # Mongoose Schemas (14 collections)
    │   ├── User.js, ProviderProfile.js, AvailabilitySlot.js
    │   ├── ServiceCategory.js, ServiceRequest.js, Quote.js
    │   ├── Booking.js, Job.js, Invoice.js, Review.js
    │   └── Dispute.js, Message.js, Notification.js, AuditLog.js
    ├── routes/            # Route definitions mounted under /api/v1
    ├── services/          # ai.service.js, notification.service.js
    └── utils/             # AppError, catchAsync, token generation
```

---

## ⚙️ Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Server Port
PORT=5000

# Environment Mode (development | production | test)
NODE_ENV=development

# Allowed Frontend Origins for CORS (comma-separated if multiple)
CLIENT_URL=http://localhost:5173

# MongoDB Connection String (Local or MongoDB Atlas)
MONGO_URI=mongodb://127.0.0.1:27017/careconnect

# JWT Authentication
JWT_SECRET=super_secret_jwt_random_key_change_in_production
JWT_EXPIRES_IN=7d
```

---

## 🛠️ Setup & Local Execution

### **1. Install Dependencies**
```bash
npm install
```

### **2. Setup `.env`**
```bash
cp .env.example .env
# Edit .env with your MongoDB URI and secret
```

### **3. Seed the Database**
Populates demo users, service categories, sample requests, quotes, bookings, and reviews:
```bash
npm run seed
```

### **4. Start Server**
```bash
# Development (with hot-reload via nodemon)
npm run dev

# Production
npm start
```

### **5. Run Tests**
```bash
npm test
```

---

## 📡 REST API Endpoint Summary (`/api/v1`)

### **Authentication & Users (`/auth`, `/users`)**
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/register` | Public | Register new customer or provider |
| `POST` | `/auth/login` | Public | Authenticate user & return JWT token |
| `GET` | `/auth/me` | Authenticated | Retrieve current user profile |
| `GET` | `/users` | Admin | List all registered users (paginated) |
| `PATCH` | `/users/:id/status` | Admin | Activate or deactivate user account |

### **Service Categories & Providers (`/categories`, `/providers`)**
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/categories` | Public | List all active service categories |
| `POST` | `/categories` | Admin, Ops | Create new service category |
| `GET` | `/providers` | Authenticated | Search & filter verified service providers |
| `GET` | `/providers/:id` | Authenticated | Get provider details, rating, & reviews |
| `GET` | `/providers/:id/slots` | Authenticated | View provider's open availability slots |
| `POST` | `/providers/slots` | Provider | Add or update provider availability slots |
| `POST` | `/providers/:id/favorite`| Customer | Toggle favorite provider status |

### **Service Requests & Quotes (`/service-requests`, `/quotes`)**
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/service-requests` | Customer | Create service request (triggers AI classifier) |
| `GET` | `/service-requests/mine` | Customer | Get customer's submitted requests |
| `GET` | `/service-requests/feed` | Provider | Get matching open requests for provider |
| `GET` | `/service-requests/:id` | Authenticated | Get service request details & quotes |
| `POST` | `/quotes` | Provider | Submit price quote for a service request |
| `PATCH` | `/quotes/:id/accept` | Customer | Accept quote (automatically creates Booking) |

### **Bookings & Job Management (`/bookings`)**
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/bookings` | Authenticated | List bookings for current user |
| `GET` | `/bookings/:id` | Authenticated | Get booking details, job info, & invoices |
| `PATCH` | `/bookings/:id/reschedule`| Customer, Provider | Reschedule booking date/time |
| `PATCH` | `/bookings/:id/cancel` | Customer, Provider | Cancel booking |
| `PATCH` | `/bookings/:id/job/status`| Provider | Update job status (`en_route`, `started`, `completed`) |
| `POST` | `/bookings/:id/job/notes` | Provider, Ops | Append work log notes |
| `POST` | `/bookings/:id/job/evidence`| Provider | Upload before/after job evidence photos |
| `PATCH` | `/bookings/:id/job/confirm`| Customer | Customer confirmation of completed job |
| `GET` | `/bookings/:id/messages`| Customer, Provider | Get chat history for booking |
| `POST` | `/bookings/:id/messages`| Customer, Provider | Send message within booking |

### **Invoices, Reviews & Disputes (`/invoices`, `/disputes`)**
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/bookings/:id/invoice`| Customer, Provider | Get invoice for booking |
| `POST` | `/bookings/:id/invoice`| Provider, Ops, Admin | Generate itemized invoice |
| `POST` | `/bookings/:id/review` | Customer | Submit 1-5 star review & feedback |
| `POST` | `/disputes` | Customer, Provider | Raise dispute regarding a booking |
| `GET` | `/disputes` | Admin, Ops, Support | List all open platform disputes |
| `PATCH` | `/disputes/:id/resolve` | Admin, Ops, Support | Resolve dispute with notes |

### **Analytics & Notifications (`/analytics`, `/notifications`)**
| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/analytics/overview` | Admin, Ops | Revenue, bookings count, & dispute rates |
| `GET` | `/notifications` | Authenticated | List notifications for authenticated user |
| `PATCH` | `/notifications/:id/read`| Authenticated | Mark notification as read |

---

## 🚀 Cloud Deployment (Render / Railway)

1. Set the **Root Directory** to `backend`.
2. **Build Command:** `npm install`
3. **Start Command:** `npm start`
4. Set required Environment Variables:
   - `NODE_ENV=production`
   - `MONGO_URI=<your-atlas-connection-uri>`
   - `JWT_SECRET=<strong-random-key>`
   - `CLIENT_URL=<your-frontend-vercel-or-netlify-url>`
