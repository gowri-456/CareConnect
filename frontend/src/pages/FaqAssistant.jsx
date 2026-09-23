import { useState } from "react";
import { Bot, Send } from "lucide-react";
import { request } from "../api";

export default function FaqAssistant() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([{ from: "bot", text: "Hi. Ask me about quotes, bookings, reviews, messages or disputes." }]);
  const [busy, setBusy] = useState(false);

  const ask = async (event) => {
    event.preventDefault();
    if (!question.trim() || busy) return;
    const current = question.trim();
    setMessages((items) => [...items, { from: "user", text: current }]);
    setQuestion("");
    setBusy(true);
    try {
      const result = await request({ url: "/support/faq", method: "POST", data: { question: current } });
      setMessages((items) => [...items, { from: "bot", text: result.data.answer }]);
    } catch {
      setMessages((items) => [...items, { from: "bot", text: "I could not answer that right now. Please try again." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="page-title">Care assistant</h1>
      <p className="mt-2 muted">Get quick answers before you submit a service request.</p>
      <div className="card mt-6 p-5">
        <div className="space-y-3">
          {messages.map((message, index) => <div key={`${message.from}-${index}`} className={`flex gap-3 ${message.from === "user" ? "justify-end" : ""}`}><div className={`max-w-[85%] rounded-2xl p-4 text-sm ${message.from === "user" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700"}`}>{message.from === "bot" && <Bot size={16} className="mb-2" />}{message.text}</div></div>)}
        </div>
        <form onSubmit={ask} className="mt-5 flex gap-2"><input className="input" placeholder="How do I compare quotes?" value={question} onChange={(event) => setQuestion(event.target.value)} /><button className="btn-primary" disabled={busy || !question.trim()}><Send size={17} />Ask</button></form>
      </div>
    </div>
  );
}
