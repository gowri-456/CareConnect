const app = document.querySelector("#app");
const userKey = "cc_user";
const tokenKey = "cc_token";

let user = null;
let view = "overview";
let authMode = "login";
let notice = null;
let searchTerm = "";
let dashboardData = null;
let paymentsData = [];
let paymentsSummary = { totalEarned: 0, pendingAmount: 0, paidCount: 0, pendingCount: 0 };
let notificationsData = [];
let mapProviders = [];
let adminProvidersData = [];
let adminSummary = null;
let mapInstance = null;
let refreshTimer = null;
let serviceRequests = [];
let requestStatus = "all";
let requestNotice = null;
let activeModal = null; // { type: 'payment'|'reject'|'addProvider'|'deleteProvider'|'providerEarnings', data: any }

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function formatMoney(amount = 0) {
  return `Rs. ${Number(amount || 0).toLocaleString("en-LK")}`;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

async function api(url, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const token = localStorage.getItem(tokenKey);
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, { ...options, headers });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || `Request failed (${response.status})`);
  return result;
}

function showAuth(message = "") {
  notice = message ? { message, success: false } : null;
  const registering = authMode === "register";
  app.innerHTML = `
    <main class="auth-shell">
      <section class="auth-story">
        <div class="brand"><span class="brand-mark">C</span><span>CareConnect</span></div>
        <div class="story-copy">
          <p class="eyebrow">Trusted help, closer to home</p>
          <h1>The right professional is closer than you think.</h1>
          <p>Describe the job, track verified providers, verify completed tasks and settle payments safely.</p>
        </div>
        <div class="story-foot">Service coordination for customers, providers and administrators</div>
      </section>
      <section class="auth-panel">
        <div class="auth-card">
          <h2>${registering ? "Create your account" : "Welcome back"}</h2>
          <p class="auth-subtitle">${registering ? "Join CareConnect to coordinate trusted home services." : "Sign in to continue to your service workspace."}</p>
          ${notice ? `<div class="notice ${notice.success ? "success" : ""}" role="alert">${escapeHtml(notice.message)}</div>` : ""}
          <form id="auth-form">
            ${registering ? `
              <div class="field"><label for="name">Full name</label><input id="name" name="name" autocomplete="name" required></div>
              <div class="field"><label for="phone">Phone</label><input id="phone" name="phone" autocomplete="tel"></div>
              <div class="field"><label for="role">Account type</label><select id="role" name="role"><option value="customer">Customer</option><option value="provider">Service provider</option><option value="support_agent">Support agent</option></select></div>
            ` : ""}
            <div class="field"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="email" required></div>
            <div class="field"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="${registering ? "new-password" : "current-password"}" required></div>
            <button class="btn btn-primary btn-block" type="submit">${registering ? "Create account" : "Sign in"}</button>
          </form>
          ${!registering ? `
            <div style="margin-top:16px; padding-top:14px; border-top:1px dashed #d6deda;">
              <div style="font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:#6b7280; margin-bottom:8px;">Quick Demo Logins</div>
              <div style="display:flex; gap:6px; flex-wrap:wrap;">
                <button type="button" class="btn btn-light btn-sm" data-action="fill-demo" data-email="anoma.wijesinghe@careconnect.lk" data-pass="Pass@123" style="font-size:12px; padding:4px 8px;">👤 Customer</button>
                <button type="button" class="btn btn-light btn-sm" data-action="fill-demo" data-email="kamal.perera@careconnect.lk" data-pass="Pass@123" style="font-size:12px; padding:4px 8px;">🔧 Provider</button>
                <button type="button" class="btn btn-light btn-sm" data-action="fill-demo" data-email="admin@careconnect.lk" data-pass="Admin@123" style="font-size:12px; padding:4px 8px;">⚙️ Admin</button>
              </div>
            </div>
          ` : ""}
          <p class="auth-switch">${registering ? "Already have an account?" : "New to CareConnect?"} <button class="text-button" type="button" data-action="switch-auth">${registering ? "Sign in" : "Create an account"}</button></p>
        </div>
      </section>
    </main>`;

  app.querySelector("#auth-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const submitButton = event.currentTarget.querySelector("button[type=submit]");
    submitButton.disabled = true;
    submitButton.textContent = "Connecting...";
    try {
      const result = await api(`/api/auth/${registering ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify(form),
      });
      localStorage.setItem(tokenKey, result.token);
      localStorage.setItem(userKey, JSON.stringify(result.user));
      user = result.user;
      view = "overview";
      notice = null;
      renderWorkspace();
      loadWorkspaceData().then(() => {
        renderWorkspace();
        startWorkspaceRefresh();
      });
    } catch (error) {
      showAuth(error.message);
    }
  });
}

function roleName(role) {
  return ({
    admin: "Administrator",
    ops_manager: "Operations manager",
    manager: "Operations manager",
    support_agent: "Support agent",
    provider: "Service provider",
    customer: "Customer",
  })[role] || "Customer";
}

function requestRows(items) {
  if (!items.length) return `<div class="empty-state">No service requests found.</div>`;

  return `<div class="record-list">${items.map((item) => {
    const canAct = Boolean(item.requestId);
    const statusLabel = item.status.replaceAll("_", " ").replaceAll("-", " ");
    const actions = [];

    // Provider actions
    if (canAct && user.role === "provider" && item.status === "open_for_quotes") {
      actions.push(`<button class="btn btn-primary" data-action="accept-request" data-request-id="${escapeHtml(item.requestId)}">Accept request</button>`);
    }
    if (canAct && user.role === "provider" && item.status === "accepted") {
      actions.push(`<button class="btn btn-primary" data-action="start-request" data-request-id="${escapeHtml(item.requestId)}">Start service</button>`);
    }
    if (canAct && user.role === "provider" && item.status === "in_progress") {
      actions.push(`
        <div style="display:flex; flex-direction:column; gap:6px; align-items:flex-end;">
          <label class="field request-price" style="margin:0;">
            <span style="font-size:11px; font-weight:700;">Agreed amount (Rs.)</span>
            <input type="number" min="1" step="1" placeholder="e.g. 2500" data-amount-for="${escapeHtml(item.requestId)}" required>
          </label>
          <button class="btn btn-primary" data-action="complete-request" data-request-id="${escapeHtml(item.requestId)}">Mark work complete</button>
        </div>
      `);
    }

    // Customer actions
    if (canAct && user.role === "customer" && item.status === "awaiting_customer_confirmation") {
      actions.push(`
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-primary" data-action="confirm-request" data-request-id="${escapeHtml(item.requestId)}">✓ Confirm task completed</button>
          <button class="btn btn-danger" data-action="open-reject-modal" data-request-id="${escapeHtml(item.requestId)}">✗ Not completed / Dispute</button>
        </div>
      `);
    }
    if (canAct && user.role === "customer" && item.status === "awaiting_payment") {
      actions.push(`<button class="btn btn-primary" data-action="open-payment-modal" data-request-id="${escapeHtml(item.requestId)}" data-amount="${item.amount || 0}" data-title="${escapeHtml(item.title || item.category)}">💳 Pay now (${formatMoney(item.amount)})</button>`);
    }
    if (canAct && (user.role === "customer" || user.role === "admin") && ["open_for_quotes", "accepted"].includes(item.status)) {
      actions.push(`<button class="btn btn-light btn-sm" data-action="open-cancel-modal" data-request-id="${escapeHtml(item.requestId)}" style="color:#b23b2a; border-color:#f0c4be;">Cancel request</button>`);
    }
    if (canAct && user.role === "customer" && item.status === "completed") {
      if (item.rating) {
        actions.push(`<span style="font-size:12px; font-weight:700; color:#d97706; background:#fffbeb; padding:4px 8px; border-radius:6px; border:1px solid #fde68a;">★ ${item.rating}/5 Rated</span>`);
      } else {
        actions.push(`<button class="btn btn-light btn-sm" data-action="open-review-modal" data-request-id="${escapeHtml(item.requestId)}" data-title="${escapeHtml(item.title || item.category)}" data-provider-name="${escapeHtml(item.providerName || 'Provider')}" style="color:#b45309; border-color:#fcd34d;">⭐ Rate & Review</button>`);
      }
    }

    const assignedParty = user.role === "customer"
      ? (item.providerName ? `Provider: <strong>${escapeHtml(item.providerName)}</strong>` : "Awaiting provider")
      : (item.customerName ? `Customer: <strong>${escapeHtml(item.customerName)}</strong>` : "");

    return `
      <article class="record">
        <div class="record-main" style="width:100%;">
          ${canAct && user.role === "customer" && item.status === "awaiting_customer_confirmation" ? `
            <div class="confirmation-card">
              <div class="confirmation-card-title">⚠️ Provider Marked Task Complete</div>
              <div class="confirmation-card-desc">
                ${item.providerName ? `<strong>${escapeHtml(item.providerName)}</strong>` : "Your provider"} reported this task completed for <strong>${formatMoney(item.amount)}</strong>. Please verify whether the provider completed the task.
              </div>
              <div class="confirmation-actions">
                <button class="btn btn-primary btn-sm" data-action="confirm-request" data-request-id="${escapeHtml(item.requestId)}">✓ Yes, task is completed</button>
                <button class="btn btn-danger btn-sm" data-action="open-reject-modal" data-request-id="${escapeHtml(item.requestId)}">✗ No, task not completed</button>
              </div>
            </div>
          ` : ""}

          ${canAct && user.role === "customer" && item.status === "awaiting_payment" ? `
            <div class="confirmation-card" style="border-color:#147d64; background:#f0f9f5;">
              <div class="confirmation-card-title" style="color:#147d64;">✓ Work Verified & Awaiting Payment</div>
              <div class="confirmation-card-desc" style="color:#2d5444;">
                You confirmed this task was completed. Please choose your payment method to pay <strong>${formatMoney(item.amount)}</strong> to ${escapeHtml(item.providerName || "the provider")}.
              </div>
              <div class="confirmation-actions">
                <button class="btn btn-primary btn-sm" data-action="open-payment-modal" data-request-id="${escapeHtml(item.requestId)}" data-amount="${item.amount || 0}" data-title="${escapeHtml(item.title || item.category)}">💳 Pay now (${formatMoney(item.amount)})</button>
              </div>
            </div>
          ` : ""}

          ${item.completionRejectedReason ? `
            <div class="notice" style="margin:8px 0; border-color:#e09386; background:#fff2f0; color:#872c21;">
              <strong>Customer feedback:</strong> ${escapeHtml(item.completionRejectedReason)}
            </div>
          ` : ""}

          ${item.cancelReason ? `
            <div class="notice" style="margin:8px 0; border-color:#e09386; background:#fff2f0; color:#872c21;">
              <strong>Cancelled:</strong> ${escapeHtml(item.cancelReason)}
            </div>
          ` : ""}

          ${item.rating ? `
            <div class="notice" style="margin:8px 0; border-color:#fcd34d; background:#fffbeb; color:#92400e;">
              <strong>Customer review:</strong> ★ ${item.rating}/5 ${item.reviewText ? `· "${escapeHtml(item.reviewText)}"` : ""}
            </div>
          ` : ""}

          <div style="display:flex; justify-content:space-between; align-items:start; gap:10px;">
            <div>
              <div class="record-title">${escapeHtml(item.title || item.description)}</div>
              <div class="record-meta">${escapeHtml(item.category)} · ${escapeHtml(item.city || "Location not provided")} · ${escapeHtml(item.id)} · ${escapeHtml(formatDate(item.date))}</div>
            </div>
            <span class="status ${escapeHtml(item.status)}">${escapeHtml(statusLabel)}</span>
          </div>

          <div class="request-description">${escapeHtml(item.description || item.title)}</div>

          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-top:12px; padding-top:10px; border-top:1px solid #f0f3f1;">
            <div class="record-meta" style="margin:0;">
              ${assignedParty ? `${assignedParty} · ` : ""}
              ${item.amount ? `Amount: <strong>${formatMoney(item.amount)}</strong>` : ""}
              ${item.paymentStatus ? ` · Payment: <span style="font-weight:700; text-transform:capitalize;">${escapeHtml(item.paymentStatus)}</span>` : ""}
              ${item.paymentMethod ? ` (${escapeHtml(item.paymentMethod)})` : ""}
            </div>
            <div class="request-actions" style="margin:0;">${actions.join("")}</div>
          </div>
        </div>
      </article>`;
  }).join("")}</div>`;
}

function overviewView() {
  const isCustomer = user.role === "customer";
  const isProvider = user.role === "provider";
  const isAdmin = user.role === "admin";
  const counts = dashboardData?.counts;
  const requests = serviceRequests;

  // Unconfirmed requests requiring customer attention
  const pendingConfirmation = isCustomer ? requests.filter((r) => r.status === "awaiting_customer_confirmation") : [];
  const pendingPayment = isCustomer ? requests.filter((r) => r.status === "awaiting_payment") : [];

  return `
    <div class="page-head">
      <div>
        <h1>Welcome, ${escapeHtml(user.name?.split(" ")[0] || "there")} 👋</h1>
        <p>Logged in as <strong>${escapeHtml(roleName(user.role))}</strong> (${escapeHtml(user.email)})</p>
      </div>
      ${isCustomer ? `<button class="btn btn-primary" data-action="new-request">＋ New service request</button>` : ""}
      ${isAdmin ? `<button class="btn btn-primary" data-action="open-add-provider-modal">＋ Add service provider</button>` : ""}
    </div>

    ${pendingConfirmation.length ? `
      <div class="confirmation-card" style="margin-bottom:20px;">
        <div class="confirmation-card-title">⚠️ ${pendingConfirmation.length} Service task(s) awaiting your completion confirmation!</div>
        <div class="confirmation-card-desc">
          Your service provider has marked work completed. Please review and confirm whether each task was completed satisfactorily so payments can be settled.
        </div>
        <div class="confirmation-actions">
          <button class="btn btn-primary btn-sm" data-view="requests">Review completed tasks now</button>
        </div>
      </div>
    ` : ""}

    ${pendingPayment.length ? `
      <div class="confirmation-card" style="margin-bottom:20px; border-color:#147d64; background:#f0f9f5;">
        <div class="confirmation-card-title" style="color:#147d64;">💳 ${pendingPayment.length} Task(s) awaiting payment</div>
        <div class="confirmation-card-desc" style="color:#2d5444;">
          You have confirmed completion for ${pendingPayment.length} task(s). Settle the payments securely via card, cash or digital wallet.
        </div>
        <div class="confirmation-actions">
          <button class="btn btn-primary btn-sm" data-view="requests">Proceed to pay</button>
        </div>
      </div>
    ` : ""}

    <section class="metrics">
      ${isProvider ? `
        <article class="metric">
          <div class="metric-label">Total money earned</div>
          <div class="metric-value" style="color:var(--green);">${formatMoney(paymentsSummary.totalEarned)}</div>
          <div class="metric-change">${paymentsSummary.paidCount} paid completed job(s)</div>
        </article>
        <article class="metric">
          <div class="metric-label">Pending earnings</div>
          <div class="metric-value" style="color:#b28000;">${formatMoney(paymentsSummary.pendingAmount)}</div>
          <div class="metric-change">${paymentsSummary.pendingCount} awaiting customer confirmation/payment</div>
        </article>
        <article class="metric">
          <div class="metric-label">Available / Assigned requests</div>
          <div class="metric-value">${counts?.requests ?? requests.length}</div>
          <div class="metric-change">Open in directory</div>
        </article>
        <article class="metric">
          <div class="metric-label">Completed bookings</div>
          <div class="metric-value">${counts?.bookings ?? 0}</div>
          <div class="metric-change">Work history</div>
        </article>
      ` : isAdmin ? `
        <article class="metric">
          <div class="metric-label">Platform total earnings</div>
          <div class="metric-value" style="color:var(--green);">${formatMoney(adminSummary?.totalPlatformEarnings ?? paymentsSummary.totalEarned)}</div>
          <div class="metric-change">Across all service providers</div>
        </article>
        <article class="metric">
          <div class="metric-label">Service providers</div>
          <div class="metric-value">${adminSummary?.totalProviders ?? counts?.providers ?? 0}</div>
          <div class="metric-change">${adminSummary?.activeProviders ?? counts?.providers ?? 0} active professionals</div>
        </article>
        <article class="metric">
          <div class="metric-label">Registered customers</div>
          <div class="metric-value">${counts?.customers ?? 0}</div>
          <div class="metric-change">Active platform clients</div>
        </article>
        <article class="metric">
          <div class="metric-label">Total requests</div>
          <div class="metric-value">${counts?.requests ?? requests.length}</div>
          <div class="metric-change">Total service tickets</div>
        </article>
      ` : `
        <article class="metric">
          <div class="metric-label">My service requests</div>
          <div class="metric-value">${counts?.requests ?? requests.length}</div>
          <div class="metric-change">Created by you</div>
        </article>
        <article class="metric">
          <div class="metric-label">Needs attention</div>
          <div class="metric-value">${counts?.openRequests ?? 0}</div>
          <div class="metric-change">Awaiting confirmation or quotes</div>
        </article>
        <article class="metric">
          <div class="metric-label">Verified providers</div>
          <div class="metric-value">${counts?.providers ?? mapProviders.length}</div>
          <div class="metric-change">Available in directory</div>
        </article>
        <article class="metric">
          <div class="metric-label">Total paid</div>
          <div class="metric-value" style="color:var(--green);">${formatMoney(paymentsSummary.totalEarned)}</div>
          <div class="metric-change">Across completed invoices</div>
        </article>
      `}
    </section>

    <div class="overview-grid">
      <section class="panel">
        <div class="panel-head">
          <h2>Recent service requests</h2>
          <button class="text-button" data-view="requests">View all (${requests.length})</button>
        </div>
        ${requestRows(requests.slice(0, 4))}
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>Notifications & activity</h2>
          <button class="text-button" data-view="notifications">All alerts</button>
        </div>
        ${notificationsData.length ? notificationsData.slice(0, 4).map((n) => `
          <div class="activity">
            <span class="activity-dot" style="${n.read ? 'background:#aaa; box-shadow:none;' : ''}"></span>
            <div class="activity-text">
              <strong>${escapeHtml(n.title)}</strong><br>
              ${escapeHtml(n.message)}
              <span class="activity-time">${escapeHtml(formatDate(n.createdAt))}</span>
            </div>
          </div>
        `).join("") : `
          <div class="empty-state">No notifications recorded yet.</div>
        `}
      </section>
    </div>`;
}

function requestsView() {
  const isCustomer = user.role === "customer";
  const isProvider = user.role === "provider";

  const requests = serviceRequests.filter((item) =>
    (requestStatus === "all" || item.status === requestStatus) &&
    `${item.title} ${item.description} ${item.category} ${item.city} ${item.id} ${item.providerName || ""} ${item.customerName || ""}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusOptions = isProvider
    ? `
      <option value="all" ${requestStatus === "all" ? "selected" : ""}>All requests</option>
      <option value="open_for_quotes" ${requestStatus === "open_for_quotes" ? "selected" : ""}>Open for quotes</option>
      <option value="accepted" ${requestStatus === "accepted" ? "selected" : ""}>Accepted</option>
      <option value="in_progress" ${requestStatus === "in_progress" ? "selected" : ""}>In progress</option>
      <option value="awaiting_customer_confirmation" ${requestStatus === "awaiting_customer_confirmation" ? "selected" : ""}>Awaiting confirmation</option>
      <option value="awaiting_payment" ${requestStatus === "awaiting_payment" ? "selected" : ""}>Payment due</option>
      <option value="completed" ${requestStatus === "completed" ? "selected" : ""}>Completed & paid</option>
      <option value="cancelled" ${requestStatus === "cancelled" ? "selected" : ""}>Cancelled</option>
    `
    : `
      <option value="all" ${requestStatus === "all" ? "selected" : ""}>All statuses</option>
      <option value="open_for_quotes" ${requestStatus === "open_for_quotes" ? "selected" : ""}>Open for quotes</option>
      <option value="accepted" ${requestStatus === "accepted" ? "selected" : ""}>Accepted by provider</option>
      <option value="in_progress" ${requestStatus === "in_progress" ? "selected" : ""}>In progress</option>
      <option value="awaiting_customer_confirmation" ${requestStatus === "awaiting_customer_confirmation" ? "selected" : ""}>Awaiting your confirmation</option>
      <option value="awaiting_payment" ${requestStatus === "awaiting_payment" ? "selected" : ""}>Awaiting payment</option>
      <option value="completed" ${requestStatus === "completed" ? "selected" : ""}>Completed</option>
      <option value="cancelled" ${requestStatus === "cancelled" ? "selected" : ""}>Cancelled</option>
    `;

  return `
    <div class="page-head">
      <div>
        <h1>Service requests</h1>
        <p>${requests.length} request(s) matching your filter.</p>
      </div>
      ${isCustomer ? `<button class="btn btn-primary" data-action="new-request">＋ New service request</button>` : ""}
    </div>

    ${requestNotice ? `<div class="notice ${requestNotice.success ? "success" : ""}" role="status">${escapeHtml(requestNotice.message)}</div>` : ""}

    <div class="toolbar">
      <input class="search-input" id="request-search" type="search" placeholder="Search by task, category, location or name" value="${escapeHtml(searchTerm)}">
      <select class="search-input status-filter" id="request-status">${statusOptions}</select>
    </div>

    ${requestRows(requests)}`;
}

function notificationsView() {
  const unreadCount = notificationsData.filter((n) => !n.read).length;

  return `
    <div class="page-head">
      <div>
        <h1>Notifications</h1>
        <p>${notificationsData.length} notification(s) (${unreadCount} unread).</p>
      </div>
      ${unreadCount > 0 ? `<button class="btn btn-light" data-action="mark-notifications-read">✓ Mark all as read</button>` : ""}
    </div>

    ${notificationsData.length ? `
      <div class="record-list">${notificationsData.map((item) => `
        <article class="record" style="${item.read ? '' : 'border-left: 4px solid var(--green); background:#fdfefe;'}">
          <div class="record-main" style="width:100%;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div class="record-title" style="font-size:14px;">${escapeHtml(item.title)}</div>
              <span class="status ${item.read ? 'completed' : 'awaiting_customer_confirmation'}">${item.read ? "Read" : "New alert"}</span>
            </div>
            <div class="request-description" style="margin-top:6px; color:#2d3732;">${escapeHtml(item.message)}</div>
            <div class="record-meta" style="margin-top:8px;">${escapeHtml(formatDate(item.createdAt))}</div>
          </div>
        </article>
      `).join("")}</div>
    ` : `<div class="empty-state">No notifications recorded yet.</div>`}`;
}

// Dedicated Provider Earnings & Individual Earnings breakdown
function providerEarningsView() {
  const totalEarned = paymentsSummary.totalEarned;
  const pendingAmount = paymentsSummary.pendingAmount;
  const paidCount = paymentsSummary.paidCount;
  const pendingCount = paymentsSummary.pendingCount;

  return `
    <div class="page-head">
      <div>
        <h1>My Individual Earnings</h1>
        <p>Real-time record of your earned money and completed jobs.</p>
      </div>
    </div>

    <section class="metrics">
      <article class="metric">
        <div class="metric-label">Total money earned (Gross)</div>
        <div class="metric-value" style="color:var(--green); font-size:28px;">${formatMoney(totalEarned)}</div>
        <div class="metric-change">${paidCount} successfully paid task(s)</div>
      </article>
      <article class="metric">
        <div class="metric-label">Pending / Unpaid earnings</div>
        <div class="metric-value" style="color:#b28000; font-size:28px;">${formatMoney(pendingAmount)}</div>
        <div class="metric-change">${pendingCount} task(s) awaiting customer settlement</div>
      </article>
      <article class="metric">
        <div class="metric-label">Completed jobs count</div>
        <div class="metric-value">${paidCount}</div>
        <div class="metric-change">Verified work history</div>
      </article>
      <article class="metric">
        <div class="metric-label">Average per job</div>
        <div class="metric-value">${paidCount > 0 ? formatMoney(Math.round(totalEarned / paidCount)) : "—"}</div>
        <div class="metric-change">Gross average value</div>
      </article>
    </section>

    <section class="panel" style="margin-top:20px;">
      <div class="panel-head">
        <h2>Itemized Earnings Breakdown</h2>
        <span>${paymentsData.length} transaction record(s)</span>
      </div>

      ${paymentsData.length ? `
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Invoice / Ref</th>
                <th>Service task</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Method</th>
                <th>Earned amount</th>
                <th>Payment status</th>
              </tr>
            </thead>
            <tbody>
              ${paymentsData.map((inv) => `
                <tr>
                  <td><strong>${escapeHtml(inv.reference)}</strong></td>
                  <td>${escapeHtml(inv.title || "Service task")}</td>
                  <td>${escapeHtml(inv.customerName || "Customer")}</td>
                  <td>${escapeHtml(formatDate(inv.paidAt || inv.createdAt))}</td>
                  <td>${escapeHtml(inv.paymentMethod)}</td>
                  <td><strong style="color:${inv.status === 'paid' ? 'var(--green)' : '#8c6d00'}; font-size:13px;">${formatMoney(inv.providerAmount || inv.total)}</strong></td>
                  <td><span class="status ${escapeHtml(inv.status)}">${escapeHtml(inv.status)}</span></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty-state">No invoices or earnings recorded yet. Accept and complete customer service requests to earn money!</div>`}
    </section>`;
}

// Admin Providers Management View (Add, Delete & Inspect Individual Provider Earnings)
function adminProvidersView() {
  const providers = adminProvidersData.filter((p) =>
    `${p.name} ${p.email} ${p.phone || ""} ${(p.profile?.skills || []).join(" ")}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return `
    <div class="page-head">
      <div>
        <h1>Service Providers & Individual Earnings</h1>
        <p>Manage professionals, monitor individual earnings, and onboard new providers.</p>
      </div>
      <button class="btn btn-primary" data-action="open-add-provider-modal">＋ Add service provider</button>
    </div>

    ${requestNotice ? `<div class="notice ${requestNotice.success ? "success" : ""}" role="status">${escapeHtml(requestNotice.message)}</div>` : ""}

    <section class="metrics" style="margin-bottom:18px;">
      <article class="metric">
        <div class="metric-label">Total platform earnings</div>
        <div class="metric-value" style="color:var(--green);">${formatMoney(adminSummary?.totalPlatformEarnings || 0)}</div>
        <div class="metric-change">Paid out across all providers</div>
      </article>
      <article class="metric">
        <div class="metric-label">Total service providers</div>
        <div class="metric-value">${adminSummary?.totalProviders || adminProvidersData.length}</div>
        <div class="metric-change">Registered accounts</div>
      </article>
      <article class="metric">
        <div class="metric-label">Active providers</div>
        <div class="metric-value">${adminSummary?.activeProviders || adminProvidersData.length}</div>
        <div class="metric-change">Available for assignments</div>
      </article>
      <article class="metric">
        <div class="metric-label">Highest earner</div>
        <div class="metric-value" style="font-size:18px; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">
          ${adminProvidersData.length ? escapeHtml([...adminProvidersData].sort((a,b) => b.earnings.totalEarned - a.earnings.totalEarned)[0]?.name || "—") : "—"}
        </div>
        <div class="metric-change">Top performing professional</div>
      </article>
    </section>

    <div class="toolbar">
      <input class="search-input" id="admin-provider-search" type="search" placeholder="Search provider name, email or skill" value="${escapeHtml(searchTerm)}">
    </div>

    <section class="panel">
      <div class="panel-head">
        <h2>Providers Directory & Earnings</h2>
        <span>${providers.length} provider(s) shown</span>
      </div>

      ${providers.length ? `
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Provider name</th>
                <th>Contact</th>
                <th>Specialty / Skills</th>
                <th>Total earned money</th>
                <th>Pending earnings</th>
                <th>Completed jobs</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${providers.map((p) => `
                <tr>
                  <td>
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span class="avatar">${escapeHtml(p.name.slice(0, 1).toUpperCase())}</span>
                      <div>
                        <strong>${escapeHtml(p.name)}</strong>
                        <div style="font-size:10px; color:var(--muted);">${p.profile ? `★ ${p.profile.ratingAvg.toFixed(1)}` : "Verified"}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div>${escapeHtml(p.email)}</div>
                    <div style="font-size:10px; color:var(--muted);">${escapeHtml(p.phone || "No phone")}</div>
                  </td>
                  <td>${escapeHtml((p.profile?.skills || ["General Service"]).join(", "))}</td>
                  <td>
                    <span class="earnings-pill positive">${formatMoney(p.earnings.totalEarned)}</span>
                  </td>
                  <td>
                    <span class="earnings-pill pending">${formatMoney(p.earnings.pendingEarnings)}</span>
                  </td>
                  <td><strong>${p.earnings.paidTasksCount}</strong> job(s)</td>
                  <td>
                    <div class="provider-action-btns">
                      <button class="btn btn-light btn-sm" data-action="view-provider-earnings" data-provider-id="${escapeHtml(p.id)}">👁️ View earnings</button>
                      <button class="btn btn-danger btn-sm" data-action="open-delete-provider-modal" data-provider-id="${escapeHtml(p.id)}" data-provider-name="${escapeHtml(p.name)}">🗑️ Delete</button>
                    </div>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty-state">No service providers match your search.</div>`}
    </section>`;
}

// Customer / General Payments View
function paymentsView() {
  const isProvider = user.role === "provider";
  if (isProvider) return providerEarningsView();

  const paidTotal = paymentsSummary.totalEarned;
  const pendingTotal = paymentsSummary.pendingAmount;

  return `
    <div class="page-head">
      <div>
        <h1>Payments & Invoices</h1>
        <p>Invoices, receipts and payment transactions for your service requests.</p>
      </div>
    </div>

    <section class="metrics">
      <article class="metric">
        <div class="metric-label">Total settled payments</div>
        <div class="payment-total" style="color:var(--green); margin:8px 0;">${formatMoney(paidTotal)}</div>
        <div class="metric-change">${paymentsSummary.paidCount} paid invoice(s)</div>
      </article>
      <article class="metric">
        <div class="metric-label">Outstanding / Pending</div>
        <div class="payment-total" style="color:#b28000; margin:8px 0;">${formatMoney(pendingTotal)}</div>
        <div class="metric-change">${paymentsSummary.pendingCount} unpaid invoice(s)</div>
      </article>
      <article class="metric">
        <div class="metric-label">Total invoices</div>
        <div class="payment-total" style="margin:8px 0;">${paymentsData.length}</div>
        <div class="metric-change">Recorded in account</div>
      </article>
    </section>

    <section class="panel" style="margin-top:18px;">
      <div class="panel-head">
        <h2>Invoice history</h2>
        <span>${paymentsData.length} record(s)</span>
      </div>

      ${paymentsData.length ? `
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Service task</th>
                <th>Provider</th>
                <th>Issued</th>
                <th>Method</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${paymentsData.map((payment) => `
                <tr>
                  <td><strong>${escapeHtml(payment.reference)}</strong></td>
                  <td>${escapeHtml(payment.title || "Service task")}</td>
                  <td>${escapeHtml(payment.providerName || "Provider")}</td>
                  <td>${escapeHtml(formatDate(payment.paidAt || payment.createdAt))}</td>
                  <td>${escapeHtml(payment.paymentMethod)}</td>
                  <td><strong style="color:var(--green);">${formatMoney(payment.total)}</strong></td>
                  <td><span class="status ${escapeHtml(payment.status)}">${escapeHtml(payment.status)}</span></td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : `<div class="empty-state">No invoices are available for this account.</div>`}
    </section>`;
}

function providersDirectoryView() {
  const providers = mapProviders.filter((p) => `${p.name} ${p.skills.join(" ")}`.toLowerCase().includes(searchTerm.toLowerCase()));

  return `
    <div class="page-head">
      <div>
        <h1>Find Service Providers</h1>
        <p>Verified professionals available in your area.</p>
      </div>
    </div>

    <div class="toolbar">
      <input class="search-input" id="provider-search" type="search" placeholder="Search provider name or specialty" value="${escapeHtml(searchTerm)}">
    </div>

    <div class="provider-grid">
      ${providers.map((p) => `
        <article class="provider-card">
          <div class="provider-top">
            <span class="avatar">${escapeHtml(p.name.slice(0, 1).toUpperCase())}</span>
            <div>
              <div class="provider-name">${escapeHtml(p.name)}</div>
              <div class="provider-skill">${escapeHtml(p.skills.join(", ") || "Verified provider")}</div>
            </div>
          </div>
          <p class="provider-desc">${escapeHtml(p.serviceAreas.join(", ") || "Areas not specified")}</p>
          <div class="provider-foot">
            <span>★ ${p.rating.toFixed(1)} (${p.ratingCount} reviews)</span>
            <span class="status">Verified</span>
          </div>
        </article>
      `).join("") || `<div class="empty-state">No verified providers found.</div>`}
    </div>`;
}

function mapView() {
  const located = mapProviders.filter((p) => p.location);

  return `
    <div class="page-head">
      <div>
        <h1>Provider map</h1>
        <p>Verified provider locations saved in your directory.</p>
      </div>
      <span class="meta-tag">${located.length} locations</span>
    </div>

    <div class="map-layout">
      <section class="map-frame" id="provider-map" aria-label="Map of verified providers"></section>
      <section class="panel">
        <div class="panel-head"><h2>Verified providers</h2><span>${mapProviders.length}</span></div>
        ${mapProviders.length ? mapProviders.map((p) => `
          <article class="map-provider">
            <span class="avatar">${escapeHtml(p.name.slice(0, 1).toUpperCase())}</span>
            <div>
              <div class="provider-name">${escapeHtml(p.name)}</div>
              <div class="provider-skill">${escapeHtml(p.skills.join(", ") || "Verified provider")}</div>
              <div class="record-meta">${p.location ? `${p.location.latitude.toFixed(4)}, ${p.location.longitude.toFixed(4)}` : "Location not shared"}</div>
            </div>
          </article>
        `).join("") : `<div class="empty-state">No verified providers found.</div>`}
      </section>
    </div>`;
}

function profileView() {
  return `
    <div class="page-head">
      <div><h1>Account profile</h1><p>Your signed-in CareConnect credentials.</p></div>
    </div>
    <section class="panel" style="max-width:620px">
      <div class="provider-top">
        <span class="avatar">${escapeHtml((user.name || "C").slice(0, 1).toUpperCase())}</span>
        <div>
          <div class="provider-name">${escapeHtml(user.name)}</div>
          <div class="provider-skill">${escapeHtml(roleName(user.role))}</div>
        </div>
      </div>
      <div class="form-grid" style="margin-top:24px">
        <div class="field"><label>Name</label><input value="${escapeHtml(user.name)}" readonly></div>
        <div class="field"><label>Account type</label><input value="${escapeHtml(roleName(user.role))}" readonly></div>
        <div class="field wide"><label>Email</label><input value="${escapeHtml(user.email)}" readonly></div>
        ${user.phone ? `<div class="field wide"><label>Phone</label><input value="${escapeHtml(user.phone)}" readonly></div>` : ""}
      </div>
      <button class="btn btn-light" data-action="logout" style="margin-top:10px;">Sign out</button>
    </section>`;
}

function getNavigationViews() {
  const isCustomer = user?.role === "customer";
  const isProvider = user?.role === "provider";
  const isAdmin = user?.role === "admin";
  const unreadCount = notificationsData.filter((n) => !n.read).length;

  if (isAdmin) {
    return {
      overview: ["Overview", "⌂", overviewView],
      adminProviders: ["Service Providers", "👥", adminProvidersView],
      requests: ["Service Requests", "▤", requestsView],
      payments: ["Platform Payments", "$", paymentsView],
      notifications: [`Notifications ${unreadCount > 0 ? `<span class="nav-badge">${unreadCount}</span>` : ""}`, "🔔", notificationsView],
      map: ["Provider Map", "⌖", mapView],
      profile: ["Profile", "◉", profileView],
    };
  }

  if (isProvider) {
    return {
      overview: ["Overview", "⌂", overviewView],
      requests: ["My Service Tasks", "▤", requestsView],
      providerEarnings: ["My Earnings", "$", providerEarningsView],
      notifications: [`Notifications ${unreadCount > 0 ? `<span class="nav-badge">${unreadCount}</span>` : ""}`, "🔔", notificationsView],
      map: ["Provider Map", "⌖", mapView],
      profile: ["Profile", "◉", profileView],
    };
  }

  // Customer
  return {
    overview: ["Overview", "⌂", overviewView],
    requests: ["My Service Requests", "▤", requestsView],
    providers: ["Find Providers", "⌕", providersDirectoryView],
    payments: ["Payments & Invoices", "$", paymentsView],
    notifications: [`Notifications ${unreadCount > 0 ? `<span class="nav-badge">${unreadCount}</span>` : ""}`, "🔔", notificationsView],
    map: ["Provider Map", "⌖", mapView],
    profile: ["Profile", "◉", profileView],
  };
}

function renderWorkspace() {
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }

  const views = getNavigationViews();
  const activeViewConfig = views[view] || views.overview;
  const currentTitle = activeViewConfig[0];
  const renderFn = activeViewConfig[2];

  const navHtml = Object.entries(views).map(([key, [label, icon]]) => {
    return `
      <button class="nav-item ${view === key ? "active" : ""}" data-view="${key}">
        <span class="nav-icon">${icon}</span>
        <span style="display:flex; align-items:center; width:100%; justify-content:space-between;">${label}</span>
      </button>`;
  }).join("");

  app.innerHTML = `
    <div class="workspace">
      <aside class="sidebar">
        <div class="brand"><span class="brand-mark">C</span><span>CareConnect</span></div>
        <div class="side-label">Workspace · ${escapeHtml(roleName(user.role))}</div>
        <nav class="nav-list">${navHtml}</nav>
        <div class="sidebar-bottom">
          <div class="account-mini">
            <span class="avatar">${escapeHtml((user.name || "C").slice(0, 1).toUpperCase())}</span>
            <div style="min-width:0">
              <div class="account-name">${escapeHtml(user.name)}</div>
              <div class="account-role">${escapeHtml(roleName(user.role))}</div>
            </div>
          </div>
          <button class="nav-item" data-action="logout"><span class="nav-icon">↪</span>Sign out</button>
        </div>
      </aside>

      <main class="main-area">
        <header class="topbar">
          <div class="crumb">CareConnect <span aria-hidden="true">/</span> <strong>${currentTitle.replace(/<[^>]*>?/gm, '')}</strong></div>
          <div class="top-actions">
            <button class="btn btn-light mobile-menu" data-action="menu">Menu</button>
          </div>
        </header>
        <section class="content">${renderFn()}</section>
      </main>

      ${renderActiveModal()}
    </div>`;

  if (view === "map") renderProviderMap();

  attachSearchListeners();
}

function attachSearchListeners() {
  const searchInput = app.querySelector("#request-search, #provider-search, #admin-provider-search");
  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      searchTerm = event.target.value;
      const position = event.target.selectionStart;
      renderWorkspace();
      const nextInput = app.querySelector("#request-search, #provider-search, #admin-provider-search");
      nextInput?.focus();
      nextInput?.setSelectionRange(position, position);
    });
  }

  app.querySelector("#request-status")?.addEventListener("change", (event) => {
    requestStatus = event.target.value;
    renderWorkspace();
  });
}

function renderActiveModal() {
  if (!activeModal) return "";

  if (activeModal.type === "payment") {
    const { requestId, title, amount } = activeModal.data;
    const selectedMethod = activeModal.method || "card";

    return `
      <div class="modal-backdrop" id="modal-container">
        <div class="modal-card">
          <div class="modal-head">
            <h3>Complete Payment</h3>
            <button class="modal-close" data-action="close-modal">&times;</button>
          </div>

          <div class="payment-order-box">
            <div class="payment-order-row"><span>Service:</span> <strong>${escapeHtml(title)}</strong></div>
            <div class="payment-order-row"><span>Order ID:</span> <code>${escapeHtml(requestId.slice(-6).toUpperCase())}</code></div>
            <div class="payment-order-row total"><span>Total Amount Due:</span> <strong>${formatMoney(amount)}</strong></div>
          </div>

          <label class="field" style="margin-bottom:8px;">
            <span style="font-size:12px; font-weight:700; color:var(--ink);">Select payment method:</span>
          </label>

          <div class="payment-methods-grid">
            <div class="payment-method-card ${selectedMethod === 'card' ? 'selected' : ''}" data-action="select-payment-method" data-method="card">
              <span class="icon">💳</span>
              <span class="label">Credit / Debit Card</span>
            </div>
            <div class="payment-method-card ${selectedMethod === 'cash' ? 'selected' : ''}" data-action="select-payment-method" data-method="cash">
              <span class="icon">💵</span>
              <span class="label">Cash on Delivery</span>
            </div>
            <div class="payment-method-card ${selectedMethod === 'upi' ? 'selected' : ''}" data-action="select-payment-method" data-method="upi">
              <span class="icon">📱</span>
              <span class="label">UPI / Online Wallet</span>
            </div>
            <div class="payment-method-card ${selectedMethod === 'bank' ? 'selected' : ''}" data-action="select-payment-method" data-method="bank">
              <span class="icon">🏦</span>
              <span class="label">Bank Transfer</span>
            </div>
          </div>

          <form id="payment-form">
            ${selectedMethod === 'card' ? `
              <div class="field"><label>Cardholder name</label><input type="text" placeholder="John Doe" value="${escapeHtml(user.name)}" required></div>
              <div class="field"><label>Card number</label><input type="text" placeholder="4242 •••• •••• 4242" required maxlength="19"></div>
              <div class="form-grid">
                <div class="field"><label>Expiry (MM/YY)</label><input type="text" placeholder="12/28" required maxlength="5"></div>
                <div class="field"><label>CVC / CVV</label><input type="password" placeholder="•••" required maxlength="4"></div>
              </div>
            ` : selectedMethod === 'upi' ? `
              <div class="field"><label>UPI ID (e.g. yourname@okhdfcbank)</label><input type="text" placeholder="username@bank" required></div>
              <p style="font-size:12px; color:var(--muted); margin-bottom:15px;">A payment request will be simulated and confirmed instantly.</p>
            ` : selectedMethod === 'bank' ? `
              <div class="field"><label>Bank account transfer reference</label><input type="text" placeholder="Transaction ref or UTR number" required></div>
              <p style="font-size:12px; color:var(--muted); margin-bottom:15px;">Reference will be stored against invoice ${escapeHtml(requestId.slice(-6).toUpperCase())}.</p>
            ` : `
              <div class="notice" style="border-color:#bfe0ca; background:#f0f9f5; color:#1e583d; margin-bottom:18px;">
                <strong>Cash Payment:</strong> Pay ${formatMoney(amount)} directly in cash to the service provider. This will record the job as paid and credit the provider's earnings.
              </div>
            `}

            <div id="payment-modal-error" class="notice" hidden></div>

            <div style="display:flex; gap:10px; margin-top:20px;">
              <button class="btn btn-primary btn-block" type="submit" id="btn-submit-payment">Pay ${formatMoney(amount)} now</button>
              <button class="btn btn-light" type="button" data-action="close-modal" style="min-width:100px;">Cancel</button>
            </div>
          </form>
        </div>
      </div>`;
  }

  if (activeModal.type === "reject") {
    const { requestId } = activeModal.data;
    return `
      <div class="modal-backdrop" id="modal-container">
        <div class="modal-card">
          <div class="modal-head">
            <h3>Report Task Not Completed</h3>
            <button class="modal-close" data-action="close-modal">&times;</button>
          </div>
          <p style="font-size:13px; color:#555; line-height:1.5; margin-bottom:16px;">
            Please let your service provider know what remains unfinished or why you could not confirm completion:
          </p>
          <form id="reject-completion-form">
            <div class="field">
              <label for="reject-reason">Feedback / Reason</label>
              <textarea id="reject-reason" name="reason" rows="4" placeholder="For example: Leaking was not fully repaired, or parts were not installed yet." required></textarea>
            </div>
            <div style="display:flex; gap:10px; margin-top:18px;">
              <button class="btn btn-danger btn-block" type="submit">Submit feedback to provider</button>
              <button class="btn btn-light" type="button" data-action="close-modal" style="min-width:100px;">Cancel</button>
            </div>
          </form>
        </div>
      </div>`;
  }

  if (activeModal.type === "cancel") {
    const { requestId } = activeModal.data;
    return `
      <div class="modal-backdrop" id="modal-container">
        <div class="modal-card">
          <div class="modal-head">
            <h3>Cancel Service Request</h3>
            <button class="modal-close" data-action="close-modal">&times;</button>
          </div>
          <p style="font-size:13px; color:#555; line-height:1.5; margin-bottom:16px;">
            Are you sure you want to cancel this service request? If a provider has accepted, they will be notified.
          </p>
          <form id="cancel-request-form">
            <div class="field">
              <label for="cancel-reason">Reason for cancellation</label>
              <textarea id="cancel-reason" name="reason" rows="3" placeholder="e.g. Schedule conflict, found another provider, or plans postponed." required></textarea>
            </div>
            <div style="display:flex; gap:10px; margin-top:18px;">
              <button class="btn btn-danger btn-block" type="submit">Confirm Cancellation</button>
              <button class="btn btn-light" type="button" data-action="close-modal" style="min-width:100px;">Keep Request</button>
            </div>
          </form>
        </div>
      </div>`;
  }

  if (activeModal.type === "review") {
    const { requestId, title, providerName } = activeModal.data;
    const currentRating = activeModal.rating || 5;
    return `
      <div class="modal-backdrop" id="modal-container">
        <div class="modal-card">
          <div class="modal-head">
            <h3>Rate & Review Service</h3>
            <button class="modal-close" data-action="close-modal">&times;</button>
          </div>
          <p style="font-size:13px; color:#555; line-height:1.5; margin-bottom:16px;">
            How was your experience with <strong>${escapeHtml(providerName || "your provider")}</strong> for <em>${escapeHtml(title || "this service")}</em>?
          </p>
          <form id="review-form">
            <div class="field">
              <label style="font-weight:700; font-size:13px;">Your Rating (1–5 Stars)</label>
              <div style="display:flex; gap:8px; margin-top:6px; flex-wrap:wrap;">
                ${[1, 2, 3, 4, 5].map((star) => `
                  <button type="button" class="btn btn-light" data-action="select-rating" data-rating="${star}" style="padding:6px 14px; font-size:15px; font-weight:700; cursor:pointer; ${star <= currentRating ? "background:#fef3c7; border-color:#f59e0b; color:#b45309;" : "color:#9ca3af;"}">
                    ★ ${star}
                  </button>
                `).join("")}
              </div>
            </div>
            <div class="field" style="margin-top:14px;">
              <label for="review-text">Feedback / Review Comment</label>
              <textarea id="review-text" name="reviewText" rows="3" placeholder="Tell others how satisfied you were with the service..."></textarea>
            </div>
            <div style="display:flex; gap:10px; margin-top:18px;">
              <button class="btn btn-primary btn-block" type="submit">Submit Review</button>
              <button class="btn btn-light" type="button" data-action="close-modal" style="min-width:100px;">Skip</button>
            </div>
          </form>
        </div>
      </div>`;
  }

  if (activeModal.type === "addProvider") {
    return `
      <div class="modal-backdrop" id="modal-container">
        <div class="modal-card" style="max-width:620px;">
          <div class="modal-head">
            <h3>Add New Service Provider</h3>
            <button class="modal-close" data-action="close-modal">&times;</button>
          </div>
          <form id="add-provider-form">
            <div class="form-grid">
              <div class="field"><label for="ap-name">Full name *</label><input id="ap-name" name="name" required placeholder="e.g. Michael Perera"></div>
              <div class="field"><label for="ap-email">Email address *</label><input id="ap-email" name="email" type="email" required placeholder="provider@example.com"></div>
              <div class="field"><label for="ap-pass">Temporary password *</label><input id="ap-pass" name="password" type="password" required minlength="6" placeholder="At least 6 characters"></div>
              <div class="field"><label for="ap-phone">Phone number</label><input id="ap-phone" name="phone" placeholder="e.g. 0771234567"></div>
              <div class="field"><label for="ap-skills">Specialty / Skills</label><input id="ap-skills" name="skills" placeholder="e.g. AC repair, Plumbing, Electrical"></div>
              <div class="field"><label for="ap-city">City / Service area</label><input id="ap-city" name="city" placeholder="e.g. Colombo, Kandy"></div>
              <div class="field"><label for="ap-rate">Hourly rate (Rs.)</label><input id="ap-rate" name="hourlyRate" type="number" value="1200" min="100"></div>
              <div class="field"><label for="ap-exp">Experience (years)</label><input id="ap-exp" name="experienceYears" type="number" value="3" min="0"></div>
              <div class="field wide"><label for="ap-bio">Bio / Qualifications</label><textarea id="ap-bio" name="bio" rows="2" placeholder="Brief professional description"></textarea></div>
            </div>
            <div id="add-provider-error" class="notice" hidden></div>
            <div style="display:flex; gap:10px; margin-top:20px;">
              <button class="btn btn-primary btn-block" type="submit" id="btn-save-provider">Create Service Provider</button>
              <button class="btn btn-light" type="button" data-action="close-modal" style="min-width:100px;">Cancel</button>
            </div>
          </form>
        </div>
      </div>`;
  }

  if (activeModal.type === "deleteProvider") {
    const { providerId, providerName } = activeModal.data;
    return `
      <div class="modal-backdrop" id="modal-container">
        <div class="modal-card">
          <div class="modal-head">
            <h3>Delete Service Provider</h3>
            <button class="modal-close" data-action="close-modal">&times;</button>
          </div>
          <p style="font-size:14px; color:#444; line-height:1.5; margin-bottom:20px;">
            Are you sure you want to delete service provider <strong>${escapeHtml(providerName)}</strong>?
            This will remove their profile and login access permanently.
          </p>
          <div style="display:flex; gap:10px;">
            <button class="btn btn-danger btn-block" data-action="confirm-delete-provider" data-provider-id="${escapeHtml(providerId)}">Yes, delete provider</button>
            <button class="btn btn-light" type="button" data-action="close-modal" style="min-width:100px;">Cancel</button>
          </div>
        </div>
      </div>`;
  }

  if (activeModal.type === "providerEarnings") {
    const { provider, invoices } = activeModal.data;
    return `
      <div class="modal-backdrop" id="modal-container">
        <div class="modal-card" style="max-width:700px;">
          <div class="modal-head">
            <div>
              <h3>${escapeHtml(provider.name)}'s Earnings Details</h3>
              <p style="margin:4px 0 0; font-size:12px; color:var(--muted);">${escapeHtml(provider.email)} · Skills: ${escapeHtml((provider.skills || []).join(", ") || "General")}</p>
            </div>
            <button class="modal-close" data-action="close-modal">&times;</button>
          </div>

          <div class="metrics" style="grid-template-columns:1fr 1fr; margin-bottom:20px;">
            <article class="metric">
              <div class="metric-label">Total earned money (Paid)</div>
              <div class="metric-value" style="color:var(--green); font-size:24px;">${formatMoney(provider.totalEarned)}</div>
              <div class="metric-change">${provider.completedJobsCount} completed paid job(s)</div>
            </article>
            <article class="metric">
              <div class="metric-label">Pending earnings</div>
              <div class="metric-value" style="color:#b28000; font-size:24px;">${formatMoney(provider.pendingEarned)}</div>
              <div class="metric-change">Awaiting customer payment</div>
            </article>
          </div>

          <div class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Invoice Ref</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${invoices.length ? invoices.map((inv) => `
                  <tr>
                    <td><strong>${escapeHtml(inv.reference)}</strong></td>
                    <td>${escapeHtml(inv.customerName)}</td>
                    <td>${escapeHtml(formatDate(inv.paidAt || inv.createdAt))}</td>
                    <td>${escapeHtml(inv.paymentMethod)}</td>
                    <td><strong style="color:var(--green);">${formatMoney(inv.amount)}</strong></td>
                    <td><span class="status ${escapeHtml(inv.status)}">${escapeHtml(inv.status)}</span></td>
                  </tr>
                `).join("") : `<tr><td colspan="6" style="text-align:center;">No invoices found for this provider.</td></tr>`}
              </tbody>
            </table>
          </div>

          <div style="margin-top:20px; text-align:right;">
            <button class="btn btn-light" type="button" data-action="close-modal">Close</button>
          </div>
        </div>
      </div>`;
  }

  return "";
}

function renderProviderMap() {
  const element = app.querySelector("#provider-map");
  const located = mapProviders.filter((p) => p.location);
  if (!element) return;

  if (!located.length) {
    element.innerHTML = `<div class="empty-state" style="margin:20px;">No provider locations shared yet.</div>`;
    return;
  }

  if (!window.L) {
    const { latitude, longitude } = located[0].location;
    const bounds = `${longitude - 0.08}%2C${latitude - 0.06}%2C${longitude + 0.08}%2C${latitude + 0.06}`;
    element.innerHTML = `<iframe title="OpenStreetMap provider location" loading="lazy" src="https://www.openstreetmap.org/export/embed.html?bbox=${bounds}&layer=mapnik&marker=${latitude}%2C${longitude}"></iframe>`;
    return;
  }

  mapInstance = window.L.map(element).setView([located[0].location.latitude, located[0].location.longitude], located.length > 1 ? 10 : 12);
  window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(mapInstance);

  const markers = located.map((p) => window.L.marker([p.location.latitude, p.location.longitude])
    .addTo(mapInstance)
    .bindPopup(`<strong>${escapeHtml(p.name)}</strong><br>${escapeHtml(p.skills.join(", ") || "Verified provider")}`));

  if (markers.length > 1) mapInstance.fitBounds(window.L.featureGroup(markers).getBounds().pad(0.2));
}

function showRequestForm() {
  app.innerHTML = `
    <div class="workspace">
      <aside class="sidebar">
        <div class="brand"><span class="brand-mark">C</span><span>CareConnect</span></div>
        <div class="side-label">Workspace</div>
        <nav class="nav-list">
          <button class="nav-item active" data-view="requests">▤ Service requests</button>
        </nav>
        <div class="sidebar-bottom"><button class="nav-item" data-action="logout">Sign out</button></div>
      </aside>
      <main class="main-area">
        <header class="topbar">
          <div class="crumb"><button class="text-button" data-action="cancel-request">Requests</button> / New request</div>
        </header>
        <section class="content">
          <div class="page-head"><div><h1>New service request</h1><p>Describe your needs and post to verified professionals.</p></div></div>
          <section class="panel" style="max-width:700px">
            <form id="request-form">
              <div class="field">
                <label for="request-description">What service do you need?</label>
                <textarea id="request-description" name="descriptionText" placeholder="e.g. AC is leaking water or electrical wiring needs checking" required maxlength="1000" rows="4"></textarea>
              </div>
              <div class="form-grid">
                <div class="field">
                  <label for="request-category">Service category</label>
                  <select id="request-category" name="category">
                    <option>AC Repair & Maintenance</option>
                    <option>Plumbing</option>
                    <option>Electrical</option>
                    <option>Appliance Repair</option>
                    <option>House Cleaning</option>
                    <option>Carpentry & Painting</option>
                    <option>Other Service</option>
                  </select>
                </div>
                <div class="field"><label for="request-city">City / Area</label><input id="request-city" name="city" required placeholder="e.g. Colombo, Hyderabad"></div>
                <div class="field"><label for="request-date">Preferred date</label><input id="request-date" name="preferredDate" type="date"></div>
                <div class="field"><label for="request-urgency">Urgency</label><select id="request-urgency" name="urgency"><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
              </div>
              <div id="request-error" class="notice" hidden></div>
              <div style="display:flex; gap:10px; margin-top:20px;">
                <button class="btn btn-primary" type="submit" id="btn-submit-req">Submit request</button>
                <button class="btn btn-light" type="button" data-action="cancel-request">Cancel</button>
              </div>
            </form>
          </section>
        </section>
      </main>
    </div>`;

  app.querySelector("#request-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget));
    const submitButton = event.currentTarget.querySelector("#btn-submit-req");
    submitButton.disabled = true;
    submitButton.textContent = "Posting request...";

    api("/api/service-requests", { method: "POST", body: JSON.stringify(form) })
      .then(async () => {
        await loadWorkspaceData();
        view = "requests";
        requestStatus = "all";
        searchTerm = "";
        requestNotice = { message: "Your service request was published successfully! Local providers will review it.", success: true };
        renderWorkspace();
      })
      .catch((error) => {
        const errorBox = app.querySelector("#request-error");
        errorBox.hidden = false;
        errorBox.textContent = error.message;
        submitButton.disabled = false;
        submitButton.textContent = "Submit request";
      });
  });
}

// Global click event dispatcher
app.addEventListener("click", async (event) => {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    view = viewButton.dataset.view;
    searchTerm = "";
    requestStatus = "all";
    requestNotice = null;
    renderWorkspace();
    return;
  }

  const actionButton = event.target.closest("[data-action]");
  if (!actionButton) return;
  const action = actionButton.dataset.action;

  if (action === "switch-auth") {
    authMode = authMode === "login" ? "register" : "login";
    showAuth();
  } else if (action === "fill-demo") {
    const emailInput = app.querySelector("#email");
    const passwordInput = app.querySelector("#password");
    if (emailInput && passwordInput) {
      emailInput.value = actionButton.dataset.email || "";
      passwordInput.value = actionButton.dataset.pass || "";
      const submitBtn = app.querySelector("#auth-form button[type=submit]");
      submitBtn?.focus();
    }
  } else if (action === "logout") {
    clearInterval(refreshTimer);
    refreshTimer = null;
    localStorage.removeItem(userKey);
    localStorage.removeItem(tokenKey);
    user = null;
    authMode = "login";
    showAuth();
  } else if (action === "new-request") {
    showRequestForm();
  } else if (action === "cancel-request") {
    view = "requests";
    renderWorkspace();
  } else if (action === "menu") {
    app.querySelector(".sidebar")?.classList.toggle("menu-open");
  } else if (action === "close-modal") {
    activeModal = null;
    renderWorkspace();
  } else if (action === "mark-notifications-read") {
    try {
      await api("/api/notifications/read-all", { method: "POST" });
      await loadWorkspaceData();
      renderWorkspace();
    } catch (e) {
      console.error(e);
    }
  }

  // Provider request handling
  else if (action === "accept-request" || action === "start-request" || action === "complete-request") {
    const requestId = actionButton.dataset.requestId;
    let body = null;
    if (action === "complete-request") {
      const amountInput = app.querySelector(`[data-amount-for="${CSS.escape(requestId)}"]`);
      const amount = Number(amountInput?.value);
      if (!Number.isFinite(amount) || amount <= 0) {
        amountInput?.focus();
        requestNotice = { message: "Please enter the agreed total amount before marking complete.", success: false };
        renderWorkspace();
        return;
      }
      body = { amount };
    }

    actionButton.disabled = true;
    try {
      const endpoint = action === "accept-request" ? "accept" : action === "start-request" ? "start" : "complete";
      const result = await api(`/api/service-requests/${encodeURIComponent(requestId)}/${endpoint}`, {
        method: "POST",
        ...(body ? { body: JSON.stringify(body) } : {}),
      });
      requestNotice = { message: result.message, success: true };
      await loadWorkspaceData();
      renderWorkspace();
    } catch (error) {
      requestNotice = { message: error.message, success: false };
      renderWorkspace();
    }
  }

  // Customer verification & payment flow
  else if (action === "confirm-request") {
    const requestId = actionButton.dataset.requestId;
    actionButton.disabled = true;
    try {
      const result = await api(`/api/service-requests/${encodeURIComponent(requestId)}/confirm`, { method: "POST" });
      requestNotice = { message: result.message, success: true };
      await loadWorkspaceData();

      // Automatically open payment modal for smooth UX!
      const req = serviceRequests.find((r) => r.requestId === requestId);
      if (req) {
        activeModal = {
          type: "payment",
          data: { requestId: req.requestId, title: req.title, amount: req.amount },
          method: "card",
        };
      }
      renderWorkspace();
    } catch (error) {
      requestNotice = { message: error.message, success: false };
      renderWorkspace();
    }
  } else if (action === "open-reject-modal") {
    const requestId = actionButton.dataset.requestId;
    activeModal = { type: "reject", data: { requestId } };
    renderWorkspace();
  } else if (action === "open-payment-modal") {
    const { requestId, title, amount } = actionButton.dataset;
    activeModal = {
      type: "payment",
      data: { requestId, title, amount: Number(amount) },
      method: "card",
    };
    renderWorkspace();
  } else if (action === "select-payment-method") {
    if (activeModal && activeModal.type === "payment") {
      activeModal.method = actionButton.dataset.method;
      renderWorkspace();
    }
  } else if (action === "open-cancel-modal") {
    const requestId = actionButton.dataset.requestId;
    activeModal = { type: "cancel", data: { requestId } };
    renderWorkspace();
  } else if (action === "open-review-modal") {
    const { requestId, title, providerName } = actionButton.dataset;
    activeModal = {
      type: "review",
      data: { requestId, title, providerName },
      rating: 5,
    };
    renderWorkspace();
  } else if (action === "select-rating") {
    if (activeModal && activeModal.type === "review") {
      activeModal.rating = Number(actionButton.dataset.rating) || 5;
      renderWorkspace();
    }
  }

  // Admin provider actions
  else if (action === "open-add-provider-modal") {
    activeModal = { type: "addProvider", data: {} };
    renderWorkspace();
  } else if (action === "open-delete-provider-modal") {
    const { providerId, providerName } = actionButton.dataset;
    activeModal = { type: "deleteProvider", data: { providerId, providerName } };
    renderWorkspace();
  } else if (action === "confirm-delete-provider") {
    const providerId = actionButton.dataset.providerId;
    actionButton.disabled = true;
    try {
      const res = await api(`/api/admin/providers/${encodeURIComponent(providerId)}`, { method: "DELETE" });
      requestNotice = { message: res.message, success: true };
      activeModal = null;
      await loadWorkspaceData();
      renderWorkspace();
    } catch (error) {
      requestNotice = { message: error.message, success: false };
      activeModal = null;
      renderWorkspace();
    }
  } else if (action === "view-provider-earnings") {
    const providerId = actionButton.dataset.providerId;
    actionButton.disabled = true;
    try {
      const res = await api(`/api/admin/providers/${encodeURIComponent(providerId)}/earnings`);
      activeModal = { type: "providerEarnings", data: res.data };
      renderWorkspace();
    } catch (error) {
      requestNotice = { message: error.message, success: false };
      renderWorkspace();
    }
  }
});

// Modal form submissions listener
app.addEventListener("submit", async (event) => {
  if (event.target.id === "payment-form") {
    event.preventDefault();
    if (!activeModal || activeModal.type !== "payment") return;

    const { requestId, amount } = activeModal.data;
    const methodNames = {
      card: "Credit / Debit Card",
      cash: "Cash on Delivery",
      upi: "UPI / Online Wallet",
      bank: "Bank Transfer",
    };
    const paymentMethod = methodNames[activeModal.method] || "Credit / Debit Card";
    const submitBtn = event.target.querySelector("#btn-submit-payment");
    submitBtn.disabled = true;
    submitBtn.textContent = "Processing payment...";

    try {
      const result = await api(`/api/service-requests/${encodeURIComponent(requestId)}/pay`, {
        method: "POST",
        body: JSON.stringify({ paymentMethod }),
      });
      await loadWorkspaceData();
      const updatedReq = serviceRequests.find((r) => r.requestId === requestId);
      activeModal = {
        type: "review",
        data: {
          requestId,
          title: updatedReq?.title || "Service",
          providerName: updatedReq?.providerName || "Service Provider",
        },
        rating: 5,
      };
      requestNotice = { message: result.message || `Payment completed! Please rate your experience.`, success: true };
      renderWorkspace();
    } catch (error) {
      const errBox = app.querySelector("#payment-modal-error");
      if (errBox) {
        errBox.hidden = false;
        errBox.textContent = error.message;
      }
      submitBtn.disabled = false;
      submitBtn.textContent = `Pay ${formatMoney(amount)} now`;
    }
  } else if (event.target.id === "reject-completion-form") {
    event.preventDefault();
    if (!activeModal || activeModal.type !== "reject") return;

    const { requestId } = activeModal.data;
    const reason = event.target.querySelector("#reject-reason")?.value;
    const submitBtn = event.target.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting feedback...";

    try {
      const result = await api(`/api/service-requests/${encodeURIComponent(requestId)}/reject-completion`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      activeModal = null;
      requestNotice = { message: result.message, success: true };
      await loadWorkspaceData();
      renderWorkspace();
    } catch (error) {
      requestNotice = { message: error.message, success: false };
      activeModal = null;
      renderWorkspace();
    }
  } else if (event.target.id === "cancel-request-form") {
    event.preventDefault();
    if (!activeModal || activeModal.type !== "cancel") return;

    const { requestId } = activeModal.data;
    const reason = event.target.querySelector("#cancel-reason")?.value;
    const submitBtn = event.target.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Cancelling request...";

    try {
      const result = await api(`/api/service-requests/${encodeURIComponent(requestId)}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      activeModal = null;
      requestNotice = { message: result.message, success: true };
      await loadWorkspaceData();
      renderWorkspace();
    } catch (error) {
      requestNotice = { message: error.message, success: false };
      activeModal = null;
      renderWorkspace();
    }
  } else if (event.target.id === "review-form") {
    event.preventDefault();
    if (!activeModal || activeModal.type !== "review") return;

    const { requestId } = activeModal.data;
    const rating = activeModal.rating || 5;
    const reviewText = event.target.querySelector("#review-text")?.value;
    const submitBtn = event.target.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting review...";

    try {
      const result = await api(`/api/service-requests/${encodeURIComponent(requestId)}/review`, {
        method: "POST",
        body: JSON.stringify({ rating, reviewText }),
      });
      activeModal = null;
      requestNotice = { message: result.message, success: true };
      await loadWorkspaceData();
      renderWorkspace();
    } catch (error) {
      requestNotice = { message: error.message, success: false };
      activeModal = null;
      renderWorkspace();
    }
  } else if (event.target.id === "add-provider-form") {
    event.preventDefault();
    const formData = Object.fromEntries(new FormData(event.target));
    const submitBtn = event.target.querySelector("#btn-save-provider");
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating provider...";

    try {
      const result = await api("/api/admin/providers", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      activeModal = null;
      requestNotice = { message: result.message, success: true };
      await loadWorkspaceData();
      renderWorkspace();
    } catch (error) {
      const errBox = app.querySelector("#add-provider-error");
      if (errBox) {
        errBox.hidden = false;
        errBox.textContent = error.message;
      }
      submitBtn.disabled = false;
      submitBtn.textContent = "Create Service Provider";
    }
  }
});

async function loadWorkspaceData() {
  const promises = [
    api("/api/dashboard"),
    api("/api/payments"),
    api("/api/map/providers"),
    api("/api/service-requests?limit=100"),
    api("/api/notifications"),
  ];

  if (user?.role === "admin") {
    promises.push(api("/api/admin/providers"));
  }

  const results = await Promise.allSettled(promises);

  dashboardData = results[0].status === "fulfilled" ? results[0].value.data : null;

  if (results[1].status === "fulfilled") {
    paymentsData = results[1].value.data || [];
    paymentsSummary = results[1].value.summary || {
      totalEarned: paymentsData.filter((p) => p.status === "paid").reduce((s, p) => s + (p.providerAmount || p.total), 0),
      pendingAmount: paymentsData.filter((p) => p.status !== "paid").reduce((s, p) => s + (p.providerAmount || p.total), 0),
      paidCount: paymentsData.filter((p) => p.status === "paid").length,
      pendingCount: paymentsData.filter((p) => p.status !== "paid").length,
    };
  } else {
    paymentsData = [];
    paymentsSummary = { totalEarned: 0, pendingAmount: 0, paidCount: 0, pendingCount: 0 };
  }

  mapProviders = results[2].status === "fulfilled" ? results[2].value.data : [];
  serviceRequests = results[3].status === "fulfilled" ? results[3].value.data : [];
  notificationsData = results[4].status === "fulfilled" ? results[4].value.data : [];

  if (user?.role === "admin" && results[5] && results[5].status === "fulfilled") {
    adminProvidersData = results[5].value.data || [];
    adminSummary = results[5].value.summary || null;
  }
}

function startWorkspaceRefresh() {
  clearInterval(refreshTimer);
  refreshTimer = setInterval(async () => {
    if (!user || document.visibilityState !== "visible") return;
    if (activeModal) return; // Don't refresh while user is filling a modal
    await loadWorkspaceData();
    if (user && !app.querySelector("input:focus, textarea:focus, select:focus")) {
      renderWorkspace();
    }
  }, 12000);
}

async function initialize() {
  try {
    const token = localStorage.getItem(tokenKey);
    const storedUser = JSON.parse(localStorage.getItem(userKey) || "null");
    if (!token || !storedUser) return showAuth();

    const result = await api("/api/auth/me");
    user = result.user;
    localStorage.setItem(userKey, JSON.stringify(user));
    await loadWorkspaceData();
    renderWorkspace();
    startWorkspaceRefresh();
  } catch {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(userKey);
    showAuth("Your session has expired. Please sign in again.");
  }
}

initialize();