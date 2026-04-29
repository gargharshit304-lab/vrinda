import { useEffect, useState } from "react";
import { apiRequest } from "../data/apiClient";

export default function AdminContactMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const loadMessages = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await apiRequest("/contact", { method: "GET", auth: true });
        if (!cancelled) setMessages(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Failed to load contact messages");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadMessages();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="glass-card p-4">
      <h3 className="font-display text-2xl font-semibold text-sage-800">Contact Messages</h3>

      {loading ? (
        <p className="mt-4 text-sm text-sage-600">Loading messages…</p>
      ) : error ? (
        <p className="mt-4 text-sm text-rose-700">{error}</p>
      ) : messages.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-sage-200/80 bg-white/70 p-6 text-center text-sm text-sage-700">
          No messages yet
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-sage-200/80 bg-white/70">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[720px] table-fixed">
              <thead>
                <tr className="bg-[#faf8f4] text-left text-xs uppercase text-sage-600">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Message</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((m) => (
                  <tr key={m._id} className="border-t border-sage-100 even:bg-[#fffdf8]">
                    <td className="px-4 py-3 align-top text-sm text-sage-800">{m.name}</td>
                    <td className="px-4 py-3 align-top text-sm text-sage-700">{m.email}</td>
                    <td className="px-4 py-3 align-top text-sm text-sage-700">{m.message}</td>
                    <td className="px-4 py-3 align-top text-sm text-sage-600">{new Date(m.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
