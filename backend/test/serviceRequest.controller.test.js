const assert = require("node:assert/strict");
const test = require("node:test");
const mongoose = require("mongoose");
const {
  acceptServiceRequest,
  cancelServiceRequest,
  completeServiceRequest,
  confirmServiceRequest,
  payServiceRequest,
  reviewServiceRequest,
  startServiceRequest,
} = require("../src/controllers/serviceRequest.controller");

function matches(document, query) {
  return Object.entries(query).every(([key, expected]) => {
    if (key === "$or") return expected.some((condition) => matches(document, condition));
    if (expected && typeof expected === "object" && "$in" in expected) {
      return expected.$in.some((item) => String(item) === String(document[key]));
    }
    if (expected && typeof expected === "object" && "$exists" in expected) {
      return (document[key] !== undefined) === expected.$exists;
    }
    const actual = document[key];
    if (actual?._bsontype === "ObjectId" || expected?._bsontype === "ObjectId") {
      return String(actual) === String(expected);
    }
    return actual === expected;
  });
}

function createCollection(documents = []) {
  return {
    documents,
    async findOne(query) {
      return this.documents.find((document) => matches(document, query)) || null;
    },
    async insertOne(document) {
      this.documents.push(document);
      return { insertedId: document._id };
    },
    async updateOne(query, update) {
      const document = this.documents.find((entry) => matches(entry, query));
      if (!document) return { modifiedCount: 0 };
      Object.assign(document, update.$set);
      return { modifiedCount: 1 };
    },
    async deleteOne(query) {
      const index = this.documents.findIndex((document) => matches(document, query));
      if (index < 0) return { deletedCount: 0 };
      this.documents.splice(index, 1);
      return { deletedCount: 1 };
    },
  };
}

function response() {
  return {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("customer confirms work and records payment in a separate step", async () => {
  const customerId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const requestId = new mongoose.Types.ObjectId();
  const request = {
    _id: requestId,
    customer: customerId,
    descriptionText: "Repair kitchen tap",
    status: "open_for_quotes",
  };
  const collections = {
    servicerequests: createCollection([request]),
    invoices: createCollection(),
    notifications: createCollection(),
  };
  const previousDb = mongoose.connection.db;
  mongoose.connection.db = { collection: (name) => collections[name] };

  try {
    const accepted = response();
    await acceptServiceRequest({ params: { id: String(requestId) }, user: { _id: providerId } }, accepted, assert.fail);
    assert.equal(accepted.statusCode, 200);
    assert.equal(request.status, "accepted");

    const started = response();
    await startServiceRequest({ params: { id: String(requestId) }, user: { _id: providerId } }, started, assert.fail);
    assert.equal(started.statusCode, 200);
    assert.equal(request.status, "in_progress");
    assert.equal(collections.notifications.documents[0].user, customerId);
    assert.equal(collections.notifications.documents[0].type, "service_accepted");
    assert.equal(collections.notifications.documents[1].user, customerId);
    assert.equal(collections.notifications.documents[1].type, "service_started");

    const completed = response();
    await completeServiceRequest({
      params: { id: String(requestId) },
      body: { amount: 12500 },
      user: { _id: providerId },
    }, completed, assert.fail);
    assert.equal(completed.statusCode, 200);
    assert.equal(request.status, "awaiting_customer_confirmation");
    assert.equal(request.paymentStatus, "pending");
    assert.equal(collections.invoices.documents[0].status, "pending");
    assert.equal(collections.notifications.documents[2].user, customerId);
    assert.equal(collections.notifications.documents[2].type, "service_completed");

    const confirmed = response();
    await confirmServiceRequest({ params: { id: String(requestId) }, user: { _id: customerId } }, confirmed, assert.fail);
    assert.equal(confirmed.statusCode, 200);
    assert.equal(request.status, "awaiting_payment");
    assert.equal(request.paymentStatus, "due");
    assert.equal(collections.invoices.documents[0].status, "pending");
    assert.equal(collections.notifications.documents[3].user, providerId);
    assert.equal(collections.notifications.documents[3].type, "customer_confirmed");

    const paid = response();
    await payServiceRequest({
      params: { id: String(requestId) },
      body: { paymentMethod: "Manual payment to provider" },
      user: { _id: customerId },
    }, paid, assert.fail);
    assert.equal(paid.statusCode, 200);
    assert.equal(request.status, "completed");
    assert.equal(request.paymentStatus, "paid");
    assert.equal(collections.invoices.documents[0].status, "paid");
    assert.equal(collections.invoices.documents[0].paymentMethod, "Manual payment to provider");
    assert.equal(collections.notifications.documents[4].user, providerId);
    assert.equal(collections.notifications.documents[4].type, "customer_paid");
    assert.equal(collections.notifications.documents[5].user, customerId);
    assert.equal(collections.notifications.documents[5].type, "payment_success");
  } finally {
    mongoose.connection.db = previousDb;
  }
});

test("provider cannot create a demo invoice with an invalid amount", async () => {
  const collections = {
    servicerequests: createCollection(),
    invoices: createCollection(),
    notifications: createCollection(),
  };
  const previousDb = mongoose.connection.db;
  mongoose.connection.db = { collection: (name) => collections[name] };

  try {
    const result = response();
    await completeServiceRequest({
      params: { id: String(new mongoose.Types.ObjectId()) },
      body: { amount: 0 },
      user: { _id: new mongoose.Types.ObjectId() },
    }, result, assert.fail);
    assert.equal(result.statusCode, 400);
    assert.equal(collections.invoices.documents.length, 0);
    assert.equal(collections.notifications.documents.length, 0);
  } finally {
    mongoose.connection.db = previousDb;
  }
});

test("customer can cancel an open service request", async () => {
  const customerId = new mongoose.Types.ObjectId();
  const requestId = new mongoose.Types.ObjectId();
  const request = {
    _id: requestId,
    customer: customerId,
    descriptionText: "Paint bedroom",
    status: "open_for_quotes",
  };
  const collections = {
    servicerequests: createCollection([request]),
    notifications: createCollection(),
  };
  const previousDb = mongoose.connection.db;
  mongoose.connection.db = { collection: (name) => collections[name] };

  try {
    const res = response();
    await cancelServiceRequest({
      params: { id: String(requestId) },
      body: { reason: "Plans changed" },
      user: { _id: customerId },
    }, res, assert.fail);

    assert.equal(res.statusCode, 200);
    assert.equal(request.status, "cancelled");
    assert.equal(request.cancelReason, "Plans changed");
  } finally {
    mongoose.connection.db = previousDb;
  }
});

test("customer can review a completed service request", async () => {
  const customerId = new mongoose.Types.ObjectId();
  const providerId = new mongoose.Types.ObjectId();
  const requestId = new mongoose.Types.ObjectId();
  const profileId = new mongoose.Types.ObjectId();
  const request = {
    _id: requestId,
    customer: customerId,
    provider: providerId,
    descriptionText: "Paint bedroom",
    status: "completed",
    paymentStatus: "paid",
  };
  const profile = {
    _id: profileId,
    user: providerId,
    ratingAvg: 5.0,
    ratingCount: 1,
  };
  const collections = {
    servicerequests: createCollection([request]),
    reviews: createCollection(),
    providerprofiles: createCollection([profile]),
    notifications: createCollection(),
  };
  const previousDb = mongoose.connection.db;
  mongoose.connection.db = { collection: (name) => collections[name] };

  try {
    const res = response();
    await reviewServiceRequest({
      params: { id: String(requestId) },
      body: { rating: 5, reviewText: "Super fast and clean job!" },
      user: { _id: customerId },
    }, res, assert.fail);

    assert.equal(res.statusCode, 200);
    assert.equal(request.rating, 5);
    assert.equal(request.reviewText, "Super fast and clean job!");
    assert.equal(collections.reviews.documents.length, 1);
    assert.equal(collections.reviews.documents[0].rating, 5);
    assert.equal(collections.notifications.documents.length, 1);
    assert.equal(collections.notifications.documents[0].type, "customer_reviewed");
  } finally {
    mongoose.connection.db = previousDb;
  }
});