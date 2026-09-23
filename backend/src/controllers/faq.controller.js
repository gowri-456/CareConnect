const catchAsync = require("../utils/catchAsync");

const faqs = [
  { keys: ["price", "cost", "quote"], answer: "Providers send quotes after you describe the work. Compare price, timing, rating and the provider message before accepting." },
  { keys: ["book", "booking", "schedule"], answer: "Open a quote on your request, choose a time slot, and accept it to create a booking." },
  { keys: ["cancel", "cancellation"], answer: "Open the booking and use the cancellation action. Add a short reason so the other party is informed." },
  { keys: ["review", "rating"], answer: "After a completed booking, both the customer and provider can leave a rating and optional comment." },
  { keys: ["dispute", "problem", "issue", "refund"], answer: "Open the booking, choose Need help, and describe what went wrong. Support can then review the case." },
  { keys: ["message", "chat", "contact"], answer: "Each booking has a private conversation for the customer and provider. Messages refresh automatically." },
];

const answerFaq = catchAsync(async (req, res) => {
  const question = String(req.body.question || "").trim();
  const words = question.toLowerCase().split(/\s+/);
  const match = faqs.map((faq) => ({ faq, score: faq.keys.filter((key) => words.includes(key) || question.toLowerCase().includes(key)).length }))
    .sort((a, b) => b.score - a.score)[0];
  const answer = match?.score ? match.faq.answer : "I can help with quotes, bookings, cancellations, reviews, messages and disputes. What would you like to know?";
  res.status(200).json({ success: true, data: { answer, suggestions: faqs.map((faq) => faq.keys[0]) } });
});

module.exports = { answerFaq };