// Pages/ExpertPreview.jsx
import React, { useMemo, useState } from "react";
// import { base44 } from "@/api/base44Client"; // Removed
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { BrainCircuit, MessageSquare, Send, RefreshCw, Lock, Sparkles } from "lucide-react";

const DISCLAIMER = `ThermalAI Expert provides technical explanations based on scientific literature and building physics standards. 
It does not perform certified energy audits or generate regulatory compliance documents.
For quantified heat-loss estimation, use the ThermalAI App.`;

const STARTER_PROMPTS = [
  "What can thermal imaging reliably detect?",
  "What are the main limitations of inspections?",
  "How do emissivity and reflections affect images?",
  "What weather conditions should I avoid?",
  "What causes thermal bridges around windows?",
  "How does air infiltration show up?",
  "Can thermal imaging prove poor insulation?",
  "What can't be concluded from one image?",
];

function isValidEmail(email) {
  const e = (email || "").trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export default function ExpertPreview() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("Explain");
  const [sessionId, setSessionId] = useState(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [turns, setTurns] = useState([]);

  // Lead capture
  const [leadEmail, setLeadEmail] = useState("");
  const [leadRole, setLeadRole] = useState("");
  const [leadBusy, setLeadBusy] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [leadError, setLeadError] = useState("");

  const turnCountUser = useMemo(
    () => turns.filter((t) => t.role === "user").length,
    [turns]
  );

  const limitReached = turnCountUser >= 3;

  async function sendMessage(messageText) {
    const trimmed = (messageText || "").trim();
    if (!trimmed || busy || limitReached) return;

    setError("");
    setBusy(true);
    setTurns((prev) => [...prev, { role: "user", text: trimmed }]);

    try {
      // Direct call to local backend since base44 cloud functions aren't available locally
      const resp = await fetch("/v1/expert/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          mode,
          session_id: sessionId,
          metadata: {
            source: "expert-preview",
            pathname: window.location.pathname,
          },
        }),
      });

      if (!resp.ok) {
        throw new Error(`Request failed with status ${resp.status}`);
      }

      const data = await resp.json();

      if (!data?.session_id || !data?.answer) {
        throw new Error("Unexpected response format from expertChat.");
      }

      setSessionId(data.session_id);
      setTurns((prev) => [...prev, { role: "assistant", text: data.answer }]);
    } catch (e) {
      setError(e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
      setInput("");
    }
  }

  async function submitLead(type = "sales") {
    const email = (leadEmail || "").trim();

    setLeadError("");
    setLeadSuccess(false);

    if (!isValidEmail(email)) {
      setLeadError("Please enter a valid email address.");
      return;
    }

    setLeadBusy(true);
    try {
      const response = await fetch("/v1/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, message: leadRole, type }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      // Mock console log for developer visibility
      console.log(`[Contact] Message submitted to ${type}: ${email}`);

      setLeadSuccess(true);
    } catch (e) {
      setLeadError("Failed to send. Please try again.");
    } finally {
      setLeadBusy(false);
    }
  }

  function clearAll() {
    if (busy || leadBusy) return;
    setTurns([]);
    setSessionId(null);
    setError("");
    setInput("");
    setLeadEmail("");
    setLeadRole("");
    setLeadError("");
    setLeadSuccess(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 pt-10 px-4 md:px-6">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white border border-slate-200 shadow-sm mb-4">
            <BrainCircuit className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
            ThermalAI <span className="text-emerald-600">Expert</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Your specialized AI building-physics assistant. Ask about anomalies, limitations, and interpretation.
          </p>
          <div className="flex justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
              <Sparkles className="w-3 h-3" /> Preview Mode
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white text-slate-600 border border-slate-200">
              <MessageSquare className="w-3 h-3" /> {3 - turnCountUser} questions left
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Sidebar / Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl p-5 space-y-4 border border-slate-200 shadow-sm">
              <div className="space-y-2">
                <Label className="text-slate-700">Interpretation Mode</Label>
                <Select value={mode} onValueChange={setMode}>
                  <SelectTrigger className="w-full bg-white border-slate-200 text-slate-900">
                    <SelectValue placeholder="Select a mode" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200 text-slate-900">
                    <SelectItem value="Explain">💡 Explain Concepts</SelectItem>
                    <SelectItem value="Interpret">🔍 Interpret Anomalies</SelectItem>
                    <SelectItem value="DecisionSupport">📊 Decision Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Label className="text-slate-700 mb-3 block">Suggested Questions</Label>
                <div className="flex flex-col gap-2">
                  {STARTER_PROMPTS.slice(0, 5).map((p, i) => (
                    <button
                      key={i}
                      disabled={busy || limitReached}
                      onClick={() => sendMessage(p)}
                      className="text-left text-xs p-2 rounded bg-slate-50 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 transition-colors border border-transparent hover:border-emerald-200 truncate"
                      title={p}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
              <div>
                <h4 className="font-semibold text-slate-800 mb-2 text-sm flex items-center gap-2">
                  <Lock className="w-3 h-3 text-amber-500" /> Disclaimer
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {DISCLAIMER}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <h4 className="font-semibold text-slate-800 mb-2 text-sm">Need Help?</h4>
                <p className="text-xs text-slate-500 mb-3">
                  Have a question or feedback? Send us a message directly.
                </p>

                {!leadSuccess ? (
                  <div className="space-y-3">
                    <input
                      type="email"
                      placeholder="Your email (optional)"
                      value={leadEmail}
                      onChange={e => setLeadEmail(e.target.value)}
                      className="w-full text-xs p-2 rounded border border-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                    <textarea
                      placeholder="How can we help?"
                      value={leadRole} // Reusing leadRole state as message body for simplicity
                      onChange={e => setLeadRole(e.target.value)}
                      className="w-full text-xs p-2 rounded border border-slate-200 focus:outline-none focus:border-emerald-500 min-h-[80px]"
                    />
                    <button
                      onClick={() => submitLead("support")}
                      disabled={leadBusy || !leadRole.trim()}
                      className="w-full bg-slate-800 hover:bg-slate-900 text-white text-xs py-2 rounded font-medium disabled:opacity-50 transition-colors"
                    >
                      {leadBusy ? "Sending..." : "Send Message"}
                    </button>
                    {leadError && <p className="text-red-500 text-xs">{leadError}</p>}
                  </div>
                ) : (
                  <div className="bg-emerald-50 p-3 rounded border border-emerald-100 text-center">
                    <p className="text-emerald-700 text-xs font-semibold mb-1">Message Sent!</p>
                    <p className="text-emerald-600 text-xs">Thanks for reaching out. We'll get back to you soon.</p>
                    <button
                      onClick={() => { setLeadSuccess(false); setLeadRole(""); }}
                      className="text-xs text-slate-500 underline mt-2 hover:text-slate-800"
                    >
                      Send another
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[600px]">

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {turns.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 opacity-50">
                    <BrainCircuit className="w-16 h-16 text-emerald-200 mb-4" />
                    <p className="text-slate-700 text-lg font-medium">Ready to assist</p>
                    <p className="text-sm text-slate-400 max-w-xs mt-2">
                      I can explain thermal concepts, interpret image anomalies, and clarify building physics standards.
                    </p>
                  </div>
                ) : (
                  turns.map((t, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-4 ${t.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${t.role === 'user' ? 'bg-emerald-600' : 'bg-slate-100'
                        }`}>
                        {t.role === 'user' ? <div className="text-white font-bold text-xs">YOU</div> : <BrainCircuit className="w-5 h-5 text-emerald-600" />}
                      </div>
                      <div className={`p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed ${t.role === 'user'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-50 text-slate-700 border border-slate-100'
                        }`}>
                        {t.text}
                      </div>
                    </div>
                  ))
                )}
                {busy && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                      <BrainCircuit className="w-5 h-5 text-emerald-600 animate-pulse" />
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-2">
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                {limitReached && (
                  <div className="bg-slate-50/95 backdrop-blur-sm border border-slate-200 rounded-xl p-6 text-center space-y-4 animate-in fade-in zoom-in shadow-lg">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                      <Lock className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="text-slate-900 font-bold text-lg">Preview Limit Reached</h3>
                      <p className="text-slate-500 text-sm mt-1">Get unlimited access with the ThermalAI App.</p>
                    </div>

                    {!leadSuccess ? (
                      <div className="max-w-sm mx-auto space-y-3 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                        <p className="text-xs text-slate-500 mb-2">Join waitlist for full access & updates:</p>
                        <Input
                          placeholder="you@company.com"
                          value={leadEmail}
                          onChange={e => setLeadEmail(e.target.value)}
                          className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 h-9 text-sm"
                        />
                        <div className="flex gap-2">
                          <Button onClick={submitLead} disabled={leadBusy || !leadEmail} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs font-bold">
                            {leadBusy ? 'Joining...' : 'Join Waitlist'}
                          </Button>
                        </div>
                        {leadError && <p className="text-xs text-red-500">{leadError}</p>}
                      </div>
                    ) : (
                      <div className="bg-emerald-50 text-emerald-700 p-3 rounded text-sm border border-emerald-200">
                        ✓ You're on the list! We'll be in touch.
                      </div>
                    )}

                    <div className="pt-2">
                      <Button onClick={() => navigate('/PlanSelection?force=1')} variant="outline" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 w-full mb-2">
                        View Pricing Plans
                      </Button>
                      <Button onClick={() => navigate('/AppHome')} variant="ghost" className="text-slate-500 hover:text-slate-900 w-full">
                        Go to App Dashboard
                      </Button>
                    </div>
                  </div>
                )}
                {error && (
                  <div className="p-3 rounded bg-red-50 border border-red-200 text-red-600 text-sm">
                    ⚠️ {error}
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
                <div className="flex gap-3">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
                    placeholder="Ask a question..."
                    disabled={busy || limitReached}
                    className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-emerald-500"
                  />
                  <Button
                    disabled={busy || limitReached}
                    onClick={() => sendMessage(input)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white w-12 px-0"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
                <div className="mt-3 flex justify-between items-center px-1">
                  <button onClick={clearAll} className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors">
                    <RefreshCw className="w-3 h-3" /> Clear Chat
                  </button>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">AI can make mistakes</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}