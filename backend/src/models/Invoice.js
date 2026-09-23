const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema(
  {
    job: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true, unique: true },
    booking: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    lineItems: [
      {
        description: { type: String },
        amount: { type: Number },
        hoursWorked: { type: Number, default: 0 },
      },
    ],
    subtotal: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    status: { type: String, enum: ["draft", "issued", "paid", "overdue"], default: "issued" },
    paidAt: { type: Date, default: null },
    paymentMethod: { type: String, enum: ["demo_card", "cash"], default: null },
    transactionId: { type: String, default: null },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    platformFee: { type: Number, default: 0 },
    providerAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);
