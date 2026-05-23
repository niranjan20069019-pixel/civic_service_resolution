import { useState, useRef, useEffect, useCallback } from "react";
import { api } from "./api.js";
import { SUPPORTED_LANGUAGES } from "./i18n.js";
import LocationPicker from "./LocationPicker.jsx";

const TB = {
  bg: "rgba(8,18,36,0.98)", surface: "rgba(13,27,46,0.95)",
  border: "rgba(6,182,212,0.2)", cyan: "#06b6d4",
  grad: "linear-gradient(135deg,#06b6d4,#a855f7)",
  text: "#e2e8f0", muted: "#94a3b8", dim: "#475569",
  green: "#10b981", red: "#ef4444", yellow: "#f59e0b",
};

const CATEGORIES = ["roads","sanitation","water","electricity","parks","safety","other"];
const PRIORITIES = ["low","medium","high","critical"];
const CAT_ICON = { roads:"🛣️", sanitation:"🗑️", water:"💧", electricity:"⚡", parks:"🌳", safety:"🚨", other:"📋" };
const PRI_ICON = { low:"⚪", medium:"🟡", high:"🟠", critical:"🔴" };

const LANG_ALIASES = {};
for (const [code, name] of Object.entries(SUPPORTED_LANGUAGES)) {
  LANG_ALIASES[name.toLowerCase()] = code;
  LANG_ALIASES[code] = code;
}
Object.assign(LANG_ALIASES, { hindi:"hi", tamil:"ta", telugu:"te", bengali:"bn", marathi:"mr", gujarati:"gu", kannada:"kn", malayalam:"ml", punjabi:"pa", english:"en" });

function detectLangChange(text) {
  const lower = text.toLowerCase();
  const m = lower.match(/(?:change|switch|set|speak|use)\s*(?:language|lang)?\s*(?:to\s*)?(\w+)/i)
         || lower.match(/^(\w+)\s*(?:language|lang|mein|me)$/i);
  if (m) { const w = m[1].toLowerCase(); if (LANG_ALIASES[w]) return LANG_ALIASES[w]; }
  return null;
}

function timeGreet() {
  const h = new Date().getHours();
  return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
}

// ─── Report Summary Card ──────────────────────────────────────────────────────
function ReportSummaryCard({ report, imageUrl, onSubmit, onCancel, submitting }) {
  return (
    <div style={{ background:"rgba(6,182,212,0.06)", border:`1px solid ${TB.border}`, borderRadius:14, padding:16, margin:"4px 0" }}>
      <div style={{ color:TB.cyan, fontWeight:700, fontSize:14, marginBottom:12 }}>📋 Report Summary</div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {[
          ["Title", report.title],
          ["Description", report.description],
          ["Category", `${CAT_ICON[report.category]} ${report.category}`],
          ["Priority", `${PRI_ICON[report.priority]} ${report.priority}`],
          ["Location", report.location?.lat ? `📍 ${report.location.lat.toFixed(4)}, ${report.location.lng.toFixed(4)}` : "Not set"],
        ].map(([k, v]) => (
          <div key={k} style={{ display:"flex", gap:8 }}>
            <span style={{ color:TB.muted, fontSize:12, minWidth:80, flexShrink:0 }}>{k}:</span>
            <span style={{ color:TB.text, fontSize:13, wordBreak:"break-word" }}>{v}</span>
          </div>
        ))}
        {imageUrl && (
          <div style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
            <span style={{ color:TB.muted, fontSize:12, minWidth:80, flexShrink:0 }}>Photo:</span>
            <img src={imageUrl} alt="issue" style={{ width:80, height:60, objectFit:"cover", borderRadius:8, border:`1px solid ${TB.border}` }} />
          </div>
        )}
      </div>
      <div style={{ display:"flex", gap:8, marginTop:14 }}>
        <button onClick={onSubmit} disabled={submitting}
          style={{ flex:1, padding:"10px", borderRadius:10, background:TB.grad, border:"none", color:"#fff", fontWeight:700, fontSize:13, cursor:submitting?"not-allowed":"pointer", opacity:submitting?0.7:1 }}>
          {submitting ? "⏳ Submitting…" : "✅ Submit Report"}
        </button>
        <button onClick={onCancel} disabled={submitting}
          style={{ padding:"10px 16px", borderRadius:10, background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", color:"#fca5a5", fontSize:13, cursor:"pointer" }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function Chatbot({ role, onNavigate, onChangeLang, userName }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [step, setStep] = useState("idle");
  const [report, setReport] = useState({ title:"", description:"", category:"roads", priority:"medium", location:null, attachments:[] });
  const [submitting, setSubmitting] = useState(false);
  const [listening, setListening] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);
  const fileRef = useRef(null);

  // Check voice support on mount
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setVoiceSupported(!!SR);
  }, []);

  const addMsg = useCallback((from, text, extra) =>
    setMessages(m => [...m, { from, text, ...extra }]), []);

  useEffect(() => {
    if (open && messages.length === 0) {
      addMsg("bot", `${timeGreet()}${userName ? `, ${userName}` : ""}! 👋\n\nI can help you create a civic issue report.\n\nSay or type **'report'** to start, or ask me anything.\n\n🌐 Tip: Say "change language to Hindi" to switch.`);
    }
  }, [open]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);

  // ─── Voice input ────────────────────────────────────────────────────────────
  const startVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      addMsg("bot", "⚠️ Voice input requires HTTPS and a Chromium-based browser (Chrome/Edge). Please type your response instead.");
      return;
    }
    try {
      const rec = new SR();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-IN";
      rec.onresult = (e) => {
        const t = e.results[0][0].transcript;
        setInput(t);
        setListening(false);
      };
      rec.onerror = (e) => {
        setListening(false);
        if (e.error === "not-allowed") addMsg("bot", "⚠️ Microphone permission denied. Please allow microphone access in your browser settings.");
        else if (e.error === "network") addMsg("bot", "⚠️ Voice recognition requires an internet connection.");
        else addMsg("bot", `⚠️ Voice error: ${e.error}. Please type instead.`);
      };
      rec.onend = () => setListening(false);
      recognitionRef.current = rec;
      rec.start();
      setListening(true);
    } catch (err) {
      setListening(false);
      addMsg("bot", "⚠️ Could not start voice input. Please type instead.");
    }
  };

  const stopVoice = () => { recognitionRef.current?.stop(); setListening(false); };

  // ─── Image upload (non-blocking) ────────────────────────────────────────────
  const handleImageFile = async (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { addMsg("bot", "⚠️ Image too large (max 5 MB)."); return; }

    // Show preview immediately from local blob — don't block step
    const localUrl = URL.createObjectURL(file);
    setImageUrl(localUrl);
    addMsg("user", "📷 [Photo attached]");
    addMsg("bot", "📷 Photo attached! Uploading in background…\n\nHere's your report summary:");

    // Advance to confirm immediately
    setStep("confirm");
    addMsg("bot", null, { type:"summary" });

    // Upload in background
    setImageUploading(true);
    api.uploadImage(file).then(res => {
      setImageUploading(false);
      if (res?.success) {
        const url = res.data.url;
        setImageUrl(url);
        setReport(r => ({ ...r, attachments: [url] }));
      }
      // If upload fails, we still have the local preview; submission will use empty attachments
    }).catch(() => setImageUploading(false));
  };

  // ─── Step handler ────────────────────────────────────────────────────────────
  const processInput = useCallback((q) => {
    if (!q.trim()) return;
    addMsg("user", q);
    const lower = q.toLowerCase().trim();

    // Language change (any step)
    const langCode = detectLangChange(q);
    if (langCode && onChangeLang) {
      onChangeLang(langCode);
      addMsg("bot", `🌐 Language changed to ${SUPPORTED_LANGUAGES[langCode]}!`);
      return;
    }

    // Navigation (any step)
    if (lower.match(/\b(dashboard|home|my reports)\b/)) { onNavigate?.("issues"); addMsg("bot", "Opening Dashboard…"); return; }
    if (lower.match(/\b(analytics|stats)\b/)) { onNavigate?.("analytics"); addMsg("bot", "Opening Analytics…"); return; }
    if (lower.match(/\b(tracker|report status|track my)\b/)) { onNavigate?.("tracker"); addMsg("bot", "Opening Report Status…"); return; }

    if (step === "idle") {
      if (lower.match(/\b(report|issue|problem|complaint|file|submit|create|new)\b/)) {
        setStep("title");
        addMsg("bot", "📝 What's the issue? Give it a short title.\n\n_(e.g. 'Pothole on MG Road')_");
      } else {
        addMsg("bot", faqAnswer(q) || "Say **'report'** to start a new civic issue report, or ask me anything!");
      }
      return;
    }

    const isSkip = lower.match(/^(skip|next|no|none|later|s)$/);

    if (step === "title") {
      if (q.length < 5) { addMsg("bot", "Please give a slightly longer title (at least 5 characters)."); return; }
      setReport(r => ({ ...r, title: q }));
      setStep("description");
      addMsg("bot", "📝 Describe the problem in more detail.\n\n_(Use 🎤 mic to speak, or type)_");

    } else if (step === "description") {
      if (!isSkip && q.length < 10) { addMsg("bot", "Please describe in a bit more detail (at least 10 characters)."); return; }
      setReport(r => ({ ...r, description: isSkip ? r.title + " - needs attention" : q }));
      setStep("category");
      addMsg("bot", "🏷️ What category?\n\n" + CATEGORIES.map(c => `${CAT_ICON[c]} ${c}`).join("  ·  "));

    } else if (step === "category") {
      const cat = CATEGORIES.find(c => lower.includes(c));
      if (!cat) { addMsg("bot", "Please choose: " + CATEGORIES.join(", ")); return; }
      setReport(r => ({ ...r, category: cat }));
      setStep("priority");
      addMsg("bot", "⚡ How urgent?\n\n🔴 critical  🟠 high  🟡 medium  ⚪ low");

    } else if (step === "priority") {
      const pri = PRIORITIES.find(p => lower.includes(p));
      if (!pri) { addMsg("bot", "Please choose: critical, high, medium, or low"); return; }
      setReport(r => ({ ...r, priority: pri }));
      setStep("location");
      addMsg("bot", "📍 Pin the location on the map below, then type **'done'**.\n\nOr type **'skip'** to skip.");

    } else if (step === "location") {
      if (isSkip || lower === "done" || lower === "ok" || lower === "set") {
        setStep("image");
        addMsg("bot", "📷 Attach a photo of the problem (optional).\n\nUse the 📎 button below, or type **'skip'**.");
      } else {
        addMsg("bot", "Pin the location on the map, then type **'done'**, or **'skip'** to skip.");
      }

    } else if (step === "image") {
      // User typed instead of uploading
      setStep("confirm");
      addMsg("bot", "Here's your report summary:");
      addMsg("bot", null, { type:"summary" });

    } else if (step === "confirm") {
      if (lower.match(/\b(yes|submit|confirm|ok|send|go|sure)\b/)) {
        doSubmit();
      } else if (lower.match(/\b(no|cancel|discard|stop)\b/)) {
        resetReport();
        addMsg("bot", "Report cancelled. Say **'report'** to start again.");
      } else {
        addMsg("bot", "Type **'submit'** to confirm or **'cancel'** to discard.");
      }
    }
  }, [step, report, onNavigate, onChangeLang]);

  const handleSend = () => {
    const q = input.trim();
    if (!q) return;
    setInput("");
    processInput(q);
  };

  const doSubmit = async () => {
    setSubmitting(true);
    // Wait for background upload to finish if still in progress
    if (imageUploading) {
      addMsg("bot", "⏳ Waiting for photo upload to finish…");
      await new Promise(resolve => {
        const check = setInterval(() => {
          if (!imageUploading) { clearInterval(check); resolve(); }
        }, 300);
        setTimeout(() => { clearInterval(check); resolve(); }, 8000); // max 8s wait
      });
    }

    try {
      // Build clean payload matching schema exactly
      const payload = {
        title: report.title,
        description: report.description,
        category: report.category,
        priority: report.priority,
        attachments: report.attachments.filter(Boolean),
      };
      // Only include location if lat/lng are valid numbers
      if (report.location?.lat && report.location?.lng) {
        payload.location = {
          address: report.location.address || "",
          lat: parseFloat(report.location.lat),
          lng: parseFloat(report.location.lng),
        };
      }

      const res = await api.createIssue(payload);
      if (res?.success) {
        const id = res.data?.issue?.id?.slice(0, 8) || "—";
        addMsg("bot", `✅ **Report submitted successfully!**\n\nTracking ID: \`${id}\`\n\nYou can track it in 'Report Status'. Say **'report'** to file another.`);
        resetReport();
      } else {
        addMsg("bot", `⚠️ Submission failed: ${res?.message || "Unknown error."}\n\nType **'submit'** to retry or **'cancel'** to discard.`);
        setStep("confirm");
      }
    } catch {
      addMsg("bot", "⚠️ Could not reach the server. Check your connection.\n\nType **'submit'** to retry.");
      setStep("confirm");
    }
    setSubmitting(false);
  };

  const resetReport = () => {
    setStep("idle");
    setReport({ title:"", description:"", category:"roads", priority:"medium", location:null, attachments:[] });
    setImageUrl(null);
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} title="Open CivicTrack Assistant"
        style={{
          position:"fixed", bottom:28, right:28, zIndex:1000,
          width:56, height:56, borderRadius:"50%",
          background:TB.grad, border:"none", cursor:"pointer",
          fontSize:24, boxShadow:"0 0 28px rgba(6,182,212,0.6)",
          display:"flex", alignItems:"center", justifyContent:"center",
          transition:"transform 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.transform="scale(1.12)"}
        onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}>
        🤖
      </button>
    );
  }

  return (
    <div style={{
      position:"fixed", inset:0, zIndex:2000,
      background:"rgba(0,0,0,0.65)", backdropFilter:"blur(6px)",
      display:"flex", alignItems:"stretch", justifyContent:"flex-end",
    }} onClick={e => { if (e.target === e.currentTarget) setOpen(false); }}>

      <div style={{
        width:"min(680px,100vw)", height:"100vh",
        background:TB.bg, borderLeft:`1px solid ${TB.border}`,
        display:"flex", flexDirection:"column",
        fontFamily:"'Inter',system-ui,sans-serif",
        boxShadow:"-8px 0 40px rgba(0,0,0,0.6)",
      }}>
        {/* Header */}
        <div style={{ padding:"14px 18px", borderBottom:`1px solid ${TB.border}`, background:"rgba(6,182,212,0.05)", display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
          <div style={{ width:38, height:38, borderRadius:"50%", background:TB.grad, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🤖</div>
          <div style={{ flex:1 }}>
            <div style={{ color:TB.text, fontWeight:700, fontSize:15 }}>CivicTrack Assistant</div>
            <div style={{ color:TB.cyan, fontSize:11, display:"flex", alignItems:"center", gap:5 }}>
              <span style={{ width:6, height:6, borderRadius:"50%", background:TB.green, display:"inline-block" }} />
              {step === "idle" ? "Ready" : `Step: ${step}`} · {role}
            </div>
          </div>
          <select onChange={e => { onChangeLang?.(e.target.value); addMsg("bot", `🌐 Language changed to ${SUPPORTED_LANGUAGES[e.target.value]}!`); }}
            style={{ padding:"5px 8px", borderRadius:8, background:"rgba(255,255,255,0.06)", border:`1px solid ${TB.border}`, color:TB.muted, fontSize:12, cursor:"pointer", outline:"none" }}>
            {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
          <button onClick={() => setOpen(false)} style={{ background:"none", border:"none", color:TB.muted, fontSize:22, cursor:"pointer", padding:"4px 8px" }}>✕</button>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:"auto", padding:"14px 18px", display:"flex", flexDirection:"column", gap:10 }}>
          {messages.map((m, i) => {
            if (m.type === "summary") {
              return (
                <ReportSummaryCard key={i} report={report} imageUrl={imageUrl}
                  onSubmit={doSubmit} onCancel={() => { resetReport(); addMsg("bot", "Report cancelled. Say 'report' to start again."); }}
                  submitting={submitting} />
              );
            }
            return (
              <div key={i} style={{ display:"flex", justifyContent:m.from==="user"?"flex-end":"flex-start", alignItems:"flex-start", gap:8 }}>
                {m.from === "bot" && (
                  <div style={{ width:26, height:26, borderRadius:"50%", background:TB.grad, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, flexShrink:0, marginTop:2 }}>🤖</div>
                )}
                <div style={{
                  maxWidth:"80%", padding:"9px 13px",
                  borderRadius:m.from==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",
                  background:m.from==="user"?TB.grad:"rgba(255,255,255,0.06)",
                  color:TB.text, fontSize:13.5, lineHeight:1.6,
                  border:m.from==="bot"?`1px solid ${TB.border}`:"none",
                  whiteSpace:"pre-line",
                }}>
                  {m.text?.replace(/\*\*(.*?)\*\*/g, "$1")}
                </div>
              </div>
            );
          })}

          {/* Location map */}
          {step === "location" && (
            <div style={{ background:"rgba(255,255,255,0.03)", borderRadius:12, padding:12, border:`1px solid ${TB.border}` }}>
              <p style={{ color:TB.muted, fontSize:12, margin:"0 0 8px" }}>Click map to pin, then type <strong style={{color:TB.cyan}}>'done'</strong></p>
              <LocationPicker value={report.location || {}} onChange={loc => setReport(r => ({ ...r, location: loc }))} />
            </div>
          )}

          {/* Image preview */}
          {imageUrl && step !== "location" && (
            <div style={{ display:"flex", justifyContent:"flex-end", alignItems:"center", gap:8 }}>
              <img src={imageUrl} alt="issue" style={{ maxWidth:160, maxHeight:120, borderRadius:10, border:`1px solid ${TB.border}`, objectFit:"cover" }} />
              {imageUploading && <span style={{ color:TB.muted, fontSize:11 }}>⏳ uploading…</span>}
            </div>
          )}

          {/* Category quick-pick */}
          {step === "category" && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => { setInput(""); processInput(c); }}
                  style={{ padding:"6px 12px", borderRadius:20, background:"rgba(6,182,212,0.08)", border:`1px solid ${TB.border}`, color:TB.cyan, fontSize:12, cursor:"pointer" }}>
                  {CAT_ICON[c]} {c}
                </button>
              ))}
            </div>
          )}

          {/* Priority quick-pick */}
          {step === "priority" && (
            <div style={{ display:"flex", gap:6 }}>
              {PRIORITIES.map(p => (
                <button key={p} onClick={() => { setInput(""); processInput(p); }}
                  style={{ flex:1, padding:"8px 0", borderRadius:10, background:"rgba(168,85,247,0.08)", border:`1px solid rgba(168,85,247,0.25)`, color:TB.muted, fontSize:12, cursor:"pointer" }}>
                  {PRI_ICON[p]} {p}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div style={{ padding:"10px 14px", borderTop:`1px solid ${TB.border}`, flexShrink:0, background:"rgba(13,27,46,0.8)" }}>
          {/* Image attach button (image step) */}
          {step === "image" && (
            <div style={{ marginBottom:8 }}>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:"none" }} onChange={e => handleImageFile(e.target.files[0])} />
              <button onClick={() => fileRef.current?.click()}
                style={{ width:"100%", padding:"9px", borderRadius:10, background:"rgba(6,182,212,0.07)", border:`2px dashed ${TB.border}`, color:TB.cyan, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                📎 Attach Photo (optional) — or type 'skip'
              </button>
            </div>
          )}

          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {/* Voice button */}
            <button
              onClick={listening ? stopVoice : startVoice}
              title={voiceSupported ? (listening ? "Stop recording" : "Voice input") : "Voice requires HTTPS + Chrome/Edge"}
              style={{
                width:40, height:40, borderRadius:"50%", flexShrink:0,
                background:listening ? "rgba(239,68,68,0.2)" : voiceSupported ? "rgba(6,182,212,0.1)" : "rgba(255,255,255,0.04)",
                border:`1px solid ${listening ? TB.red : voiceSupported ? TB.border : "rgba(255,255,255,0.1)"}`,
                color:listening ? TB.red : voiceSupported ? TB.cyan : TB.dim,
                cursor:"pointer", fontSize:18,
                display:"flex", alignItems:"center", justifyContent:"center",
              }}>
              {listening ? "⏹" : "🎤"}
            </button>

            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={step === "idle" ? "Type 'report' to start…" : "Type your answer or use 🎤…"}
              style={{ flex:1, padding:"10px 14px", borderRadius:10, fontSize:13.5, background:"rgba(255,255,255,0.05)", border:`1px solid ${TB.border}`, color:TB.text, outline:"none" }}
              onFocus={e => e.target.style.borderColor = TB.cyan}
              onBlur={e => e.target.style.borderColor = TB.border}
            />

            <button onClick={handleSend} disabled={submitting}
              style={{ width:40, height:40, borderRadius:"50%", flexShrink:0, background:TB.grad, border:"none", color:"#fff", cursor:submitting?"not-allowed":"pointer", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center" }}>
              {submitting ? "⏳" : "↑"}
            </button>
          </div>

          {step !== "idle" && (
            <div style={{ display:"flex", gap:6, marginTop:6 }}>
              <button onClick={() => processInput("skip")}
                style={{ fontSize:11, color:TB.dim, background:"none", border:`1px solid ${TB.border}`, borderRadius:6, padding:"3px 10px", cursor:"pointer" }}>
                Skip →
              </button>
              <button onClick={() => { resetReport(); addMsg("bot", "Report cancelled. Say 'report' to start again."); }}
                style={{ fontSize:11, color:TB.dim, background:"none", border:`1px solid ${TB.border}`, borderRadius:6, padding:"3px 10px", cursor:"pointer" }}>
                Cancel
              </button>
            </div>
          )}

          {listening && (
            <div style={{ textAlign:"center", color:TB.red, fontSize:12, marginTop:6, display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:TB.red, display:"inline-block", animation:"pulse 1s infinite" }} />
              Listening… speak now
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
    </div>
  );
}

function faqAnswer(q) {
  const l = q.toLowerCase();
  if (l.match(/\b(report|how|submit|file|create)\b/)) return "Say **'report'** to start creating a new civic issue report step by step.";
  if (l.match(/\b(track|status|progress)\b/)) return "Go to 'Report Status' in the sidebar to track your reports.";
  if (l.match(/\b(sla|deadline|time)\b/)) return "SLA deadlines depend on category and priority. Critical issues get the fastest response.";
  if (l.match(/\b(help|what can|options)\b/)) return "I can:\n• Guide you through reporting an issue (say 'report')\n• Navigate to any page\n• Change the app language\n• Answer questions about the process";
  return null;
}
