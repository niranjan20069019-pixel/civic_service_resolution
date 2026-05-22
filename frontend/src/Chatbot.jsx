import { useState, useRef, useEffect } from "react";
import { useResponsive } from "./useResponsive.js";
import { SUPPORTED_LANGUAGES } from "./i18n.js";

const T_BOT = {
  surface: "rgba(13,27,46,0.95)",
  border: "rgba(6,182,212,0.25)",
  cyan: "#06b6d4",
  grad: "linear-gradient(90deg,#06b6d4,#a855f7)",
  text: "#e2e8f0",
  muted: "#94a3b8",
  dim: "#475569",
};

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

// ─── Language map for "change language to X" ──────────────────────────────────
const LANG_BY_NAME = {};
for (const [code, name] of Object.entries(SUPPORTED_LANGUAGES)) {
  LANG_BY_NAME[name.toLowerCase()] = code;
  LANG_BY_NAME[code] = code;
}
// Additional aliases
LANG_BY_NAME["hindi"] = "hi";
LANG_BY_NAME["tamil"] = "ta";
LANG_BY_NAME["telugu"] = "te";
LANG_BY_NAME["bengali"] = "bn";
LANG_BY_NAME["marathi"] = "mr";
LANG_BY_NAME["gujarati"] = "gu";
LANG_BY_NAME["kannada"] = "kn";
LANG_BY_NAME["malayalam"] = "ml";
LANG_BY_NAME["punjabi"] = "pa";
LANG_BY_NAME["english"] = "en";

const CITIZEN_FLOWS = [
  {
    q: "How do I report an issue?",
    a: "Click '⊕ New Issue' on your dashboard.\n\nFill in:\n• Title — short, clear description\n• Description — details of the problem\n• Category — roads, water, sanitation, etc.\n• Priority — how urgent it is\n• Location — address or coordinates (optional)\n\nHit 'Submit Report' and you'll get a tracking ID.",
    keywords: ["report", "submit", "new issue", "file", "complaint", "create"],
    intent: null,
  },
  {
    q: "Where is my report in the process?",
    a: "Go to '📋 Report Status' in the sidebar to see the full pipeline view.\n\nEach report shows:\n📝 Reported → 🔄 In Progress → ✅ Resolved\n\nYou'll also see SLA deadlines with countdown bars so you know how much time is left for officials to respond.",
    keywords: ["track", "status", "progress", "where is", "pipeline", "step", "stage", "process"],
    intent: "tracker",
  },
  {
    q: "What happens after I submit?",
    a: "1. Your issue is logged and assigned a tracking ID\n2. A municipal official reviews it\n3. Status changes to 'In Progress' when work begins\n4. You can see all updates in the audit trail\n5. Status changes to 'Resolved' when fixed\n\n⏱ Response times depend on priority:\n🔴 Critical → fastest response\n🟡 Medium → standard SLA\n⚪ Low → longer queue",
    keywords: ["after submit", "happens next", "review", "process", "timeline"],
    intent: null,
  },
  {
    q: "Why was my issue rejected?",
    a: "Issues may be rejected if:\n• It's outside the municipal jurisdiction\n• It's a duplicate of an existing report\n• It doesn't describe a valid civic problem\n• Insufficient information was provided\n\nCheck the audit trail — the official must add a reason when rejecting.\n\nIf you disagree, you can submit a new report with more details.",
    keywords: ["rejected", "why rejected", "disagree", "appeal"],
    intent: null,
  },
  {
    q: "What categories can I report?",
    a: "You can report issues in these categories:\n\n🛣️ Roads — potholes, damaged roads, signage\n🗑️ Sanitation — garbage, drainage, cleanliness\n💧 Water — leaks, supply issues, contamination\n⚡ Electricity — outages, streetlights, wiring\n🌳 Parks — maintenance, safety, equipment\n🚨 Safety — hazards, lighting, security\n📋 Other — anything that doesn't fit above",
    keywords: ["categories", "category", "type", "kinds", "what can i report"],
    intent: null,
  },
  {
    q: "How do I set the right priority?",
    a: "Choose priority based on urgency and safety:\n\n🔴 Critical — immediate danger (gas leak, flooding, downed wire)\n🟠 High — major disruption (main road blocked, water outage)\n🟡 Medium — standard issue (pothole, broken light)\n⚪ Low — minor/cosmetic (faded paint, park bench)\n\nHigher priority = faster official response. Don't mark everything critical — it slows down real emergencies.",
    keywords: ["priority", "urgent", "critical", "important", "emergency"],
    intent: null,
  },
  {
    q: "Take me to my Dashboard",
    a: "Opening your report dashboard…",
    keywords: ["dashboard", "home", "main", "my reports", "all issues", "show issues", "go back"],
    intent: "issues",
  },
  {
    q: "Take me to Report Status",
    a: "Opening Report Status with your pipeline view…",
    keywords: ["report status", "tracker", "track", "pipeline", "my progress", "where is my"],
    intent: "tracker",
  },
];

const OFFICIAL_FLOWS = [
  {
    q: "How do I update an issue status?",
    a: "Open the issue → click 'Update Status' → choose the new status and add a note.\n\nStatus flow:\n🔵 Open → 🟡 In Progress → ✅ Resolved\n\nAlways add a note — it's logged in the audit trail with your name and timestamp.",
    keywords: ["update status", "change status", "modify"],
    intent: null,
  },
  {
    q: "What are my SLA deadlines?",
    a: "Deadlines = Base SLA × Priority multiplier:\n• 🔴 Critical → 25% of base\n• 🟠 High → 50%\n• 🟡 Medium → 100%\n• ⚪ Low → 150%\n\nExample: Water issue base SLA = 12h → Critical = 3h, High = 6h, Medium = 12h, Low = 18h",
    keywords: ["sla", "deadline", "due", "time", "hour"],
    intent: null,
  },
  {
    q: "How does auto-escalation work?",
    a: "At 80% SLA elapsed with no status update, the system auto-escalates to a supervisor.\n\n✅ Best practice: Update to 'In Progress' early — this prevents escalation.",
    keywords: ["escalate", "auto", "cron", "breach"],
    intent: null,
  },
  {
    q: "How do I close vs reject an issue?",
    a: "✅ Resolved — problem is fixed on ground\n⬜ Closed — admin close (duplicate, out of jurisdiction)\n🔴 Rejected — not valid. Must include a clear reason.",
    keywords: ["close", "reject", "resolve", "difference"],
    intent: null,
  },
  {
    q: "How to handle high-priority issues?",
    a: "For Critical/High:\n1. Assign immediately\n2. Update to 'In Progress' within 25% of SLA\n3. Add regular progress notes\n4. If blocked, escalate to supervisor\n5. Resolve and document the fix",
    keywords: ["high priority", "critical", "urgent", "important"],
    intent: null,
  },
  {
    q: "How do I use the analytics page?",
    a: "Analytics (📊) shows resolution rates, status breakdown, avg resolution times, and overdue counts.\n\nUse it to spot categories with high backlogs and track team performance over time.",
    keywords: ["analytics", "chart", "stats", "statistics", "report"],
    intent: "analytics",
  },
  {
    q: "Take me to the Dashboard",
    a: "Opening the Dashboard…",
    keywords: ["dashboard", "home", "main", "issues", "all issues", "go back"],
    intent: "issues",
  },
  {
    q: "Take me to Analytics",
    a: "Opening Analytics…",
    keywords: ["analytics", "charts", "metrics", "stats"],
    intent: "analytics",
  },
];

const SUPERVISOR_FLOWS = [
  {
    q: "How do I monitor team performance?",
    a: "Go to Analytics (📊) to see resolution rates per official, avg time-to-resolve, escalated issues, and overdue priorities.",
    keywords: ["monitor", "team", "performance", "analytics"],
    intent: "analytics",
  },
  {
    q: "How do I handle escalated issues?",
    a: "Escalated issues show 'Auto-escalated' in the audit trail.\n\n1. Review the history\n2. Reassign to a different official if needed\n3. Update to 'In Progress' to reset escalation\n4. Add a supervisor note\n5. Monitor until resolved",
    keywords: ["escalate", "escalation", "reassign", "sla"],
    intent: null,
  },
  {
    q: "How to set reporting priorities?",
    a: "🔴 Critical — immediate safety risk\n🟠 High — major disruption\n🟡 Medium — standard issue\n⚪ Low — cosmetic/minor\n\nEnsure consistent application for accurate SLA tracking.",
    keywords: ["priority", "guidelines", "set priority"],
    intent: null,
  },
  {
    q: "How do I reassign an issue?",
    a: "Open the issue → Update Status → add a note like:\n'Reassigned to [Official] — reason'\n\nThe audit trail records it with your name and timestamp.\n\nTip: Use 'In Progress' status to prevent auto-escalation during reassignment.",
    keywords: ["reassign", "assign", "transfer", "move"],
    intent: null,
  },
  {
    q: "Take me to the Dashboard",
    a: "Opening the Dashboard…",
    keywords: ["dashboard", "home", "main", "issues", "go back"],
    intent: "issues",
  },
  {
    q: "Take me to Analytics",
    a: "Opening Analytics…",
    keywords: ["analytics", "metrics", "stats", "charts"],
    intent: "analytics",
  },
];

const CASUAL = [
  {
    patterns: ["hi", "hello", "hey", "heyy", "howdy", "yo", "sup"],
    response: (name) => `${timeGreeting()}${name ? ` ${name}` : ""}! 👋 How can I help you today?`,
  },
  {
    patterns: ["good morning", "good afternoon", "good evening", "morning", "evening"],
    response: (name) => `${timeGreeting()}${name ? ` ${name}` : ""}! 🌤️ What can I assist you with?`,
  },
  {
    patterns: ["thank", "thanks", "ty", "thx", "appreciate"],
    response: () => "You're welcome! 😊 Glad I could help. Anything else you need?",
  },
  {
    patterns: ["bye", "goodbye", "see you", "cya", "gtg", "take care"],
    response: () => "Goodbye! 👋 Come back anytime you need help. Have a great day!",
  },
  {
    patterns: ["who are you", "what are you", "tell me about yourself", "your name"],
    response: () => "I'm the CivicTrack Assistant 🏛️ — your AI guide.\n\nI can:\n• Help you report & track civic issues\n• Navigate you to any page\n• Explain SLA deadlines\n• Change the app language\n• Answer questions about the process\n\nWhat would you like to do?",
  },
  {
    patterns: ["what can you do", "help", "help me", "capabilities", "features", "options", "what do you do"],
    response: () => "Here's what I can do:\n\n📋 Navigate to any page (Dashboard, Analytics, etc.)\n📝 Answer questions about reporting\n⏱ Explain SLA deadlines\n🌐 Change the app language\n🔍 Track your report status\n💡 Give tips and best practices\n\nTry saying 'Go to Dashboard' or 'Change language to Tamil'!",
  },
  {
    patterns: ["how are you", "how's it going", "you doing"],
    response: () => "I'm doing great, thanks! 🤖 Ready and waiting. What can I help you with?",
  },
];

// ─── Language change detection ────────────────────────────────────────────────
function matchLanguageChange(text) {
  const lower = text.toLowerCase().trim();
  const patterns = [
    /(?:change|switch|set|go to)\s*(?:language|lang)\s*(?:to\s*)?(.+)/i,
    /(.+?)\s*(?:language|lang|bhasa|bhasha|மொழி|భాష|ভাষा|भाषा|ભાષા|ಭಾಷೆ|ഭാഷ|ਭਾਸ਼ਾ)/i,
    /^(hi|hindi|tamil|ta|telugu|te|bengali|bn|marathi|mr|gujarati|gu|kannada|kn|malayalam|ml|punjabi|pa|english|en)\s*(?:mein|me|ல|లో|এ|मध्ये|મા|ದಲ್ಲಿ|ൽ|ਵਿੱਚ)?$/i,
    /(?:speak|talk|want)\s*(.+)/i,
  ];

  for (const pat of patterns) {
    const m = lower.match(pat);
    if (m) {
      const target = (m[1] || m[0]).trim().toLowerCase();
      for (const [alias, code] of Object.entries(LANG_BY_NAME)) {
        if (target.includes(alias) || target === alias) {
          return code;
        }
      }
    }
  }
  return null;
}

function getFlows(role) {
  if (role === "supervisor") return SUPERVISOR_FLOWS;
  if (role === "citizen") return CITIZEN_FLOWS;
  return OFFICIAL_FLOWS;
}

function getGreeting(role, name) {
  const greet = timeGreeting();
  const base = {
    supervisor: `${greet}, Supervisor${name ? ` ${name}` : ""}! 📋 I can help monitor performance, handle escalations, and more. What do you need?`,
    citizen: `${greet}${name ? ` ${name}` : ""}! 🙋 I'm your CivicTrack assistant. Report issues, track status, navigate pages, or try 'Change language to Tamil'.`,
    official: `${greet}${name ? ` ${name}` : ""}! 💬 I can help manage issues, meet SLA deadlines, navigate pages. What do you need?`,
  };
  return base[role] || base.citizen;
}

function matchFlow(text, flows) {
  const lower = text.toLowerCase().trim();

  // Direct intent match (fast path)
  for (const f of flows) {
    if (f.intent && f.keywords.some(k => lower.includes(k))) {
      return f;
    }
  }

  // Score by keyword overlap
  let best = null;
  let bestScore = 0;
  for (const f of flows) {
    const score = f.keywords.filter(kw => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      best = f;
    }
  }
  return bestScore > 0 ? best : null;
}

function matchCasual(text) {
  const lower = text.toLowerCase().trim();
  for (const c of CASUAL) {
    if (c.patterns.some(p => lower.includes(p))) return c;
  }
  return null;
}

export default function Chatbot({ role, onNavigate, onChangeLang, userName }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [navPending, setNavPending] = useState(false);
  const flows = getFlows(role);
  const bottomRef = useRef(null);
  const { isMobile } = useResponsive();

  useEffect(() => {
    if (open && messages.length === 0)
      setMessages([{ from: "bot", text: getGreeting(role, userName) }]);
  }, [open, role, userName]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMsg = (from, text) => setMessages(m => [...m, { from, text }]);

  const doNavigate = (intent) => {
    if (navPending || !onNavigate) return;
    setNavPending(true);
    onNavigate(intent);
    setTimeout(() => setNavPending(false), 500);
  };

  const respondAndNav = (msg, intent) => {
    addMsg("bot", msg);
    if (intent && onNavigate) {
      setTimeout(() => doNavigate(intent), 200);
    }
  };

  const handleQuick = (flow) => {
    addMsg("user", flow.q);
    respondAndNav(flow.a, flow.intent);
  };

  const handleSend = () => {
    const q = input.trim();
    if (!q) return;
    setInput("");
    addMsg("user", q);

    // Immediate response - no artificial delay
    // 1. Check language change
    const langCode = matchLanguageChange(q);
    if (langCode && onChangeLang) {
      const name = SUPPORTED_LANGUAGES[langCode] || langCode;
      onChangeLang(langCode);
      addMsg("bot", `🌐 Language changed to ${name}! ${SUPPORTED_LANGUAGES[langCode] ? "✅" : ""}`);
      return;
    }

    // 2. Casual match
    const casual = matchCasual(q);
    if (casual) {
      addMsg("bot", casual.response(userName));
      return;
    }

    // 3. Flow match (with navigation)
    const flow = matchFlow(q, flows);
    if (flow) {
      respondAndNav(flow.a, flow.intent);
      return;
    }

    // 4. Fallback
    addMsg("bot", "I didn't quite catch that. Try one of these:\n\n• 'Go to Dashboard'\n• 'Change language to Hindi'\n• 'How do I report?'\n• 'Track my report'\n• 'Help' — to see all options");
  };

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        title="CivicTrack Assistant"
        style={{
          position:"fixed", bottom:isMobile?16:28, right:isMobile?16:28, zIndex:1000,
          width:isMobile?48:52, height:isMobile?48:52, borderRadius:"50%",
          background:T_BOT.grad, border:"none", cursor:"pointer",
          fontSize:isMobile?20:22, boxShadow:"0 0 24px rgba(6,182,212,0.5)",
          display:"flex", alignItems:"center", justifyContent:"center",
          transition:"transform 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.transform="scale(1.1)"}
        onMouseLeave={e => e.currentTarget.style.transform="scale(1)"}
      >
        {open ? "✕" : role === "supervisor" ? "📋" : role === "citizen" ? "🙋" : "💬"}
      </button>

      {open && (
        <div style={{
          position:"fixed", bottom:isMobile?72:92, right:isMobile?12:28, zIndex:1000,
          width:isMobile?"calc(100% - 24px)":340, height:isMobile?450:500, display:"flex", flexDirection:"column",
          background:T_BOT.surface, border:`1px solid ${T_BOT.border}`,
          borderRadius:16, backdropFilter:"blur(20px)",
          boxShadow:"0 8px 40px rgba(0,0,0,0.5)",
          fontFamily:"'Inter',system-ui,sans-serif",
        }}>
          {/* Header */}
          <div style={{
            padding:"14px 16px", borderBottom:`1px solid ${T_BOT.border}`,
            background:"rgba(6,182,212,0.08)", borderRadius:"16px 16px 0 0",
            display:"flex", alignItems:"center", gap:10,
          }}>
            <div style={{
              width:32, height:32, borderRadius:"50%",
              background:T_BOT.grad, display:"flex", alignItems:"center",
              justifyContent:"center", fontSize:16,
            }}>🏛️</div>
            <div>
              <div style={{ color:T_BOT.text, fontWeight:700, fontSize:14 }}>CivicTrack Assistant</div>
              <div style={{ color:T_BOT.cyan, fontSize:11, display:"flex", alignItems:"center", gap:4 }}>
                <span style={{ width:6, height:6, borderRadius:"50%", background:"#10b981", display:"inline-block" }} />
                {timeGreeting()} · {role.charAt(0).toUpperCase() + role.slice(1)} Mode
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:"12px 14px", display:"flex", flexDirection:"column", gap:10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display:"flex", justifyContent:m.from==="user"?"flex-end":"flex-start" }}>
                <div style={{
                  maxWidth:"82%", padding:"9px 13px",
                  borderRadius:m.from==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",
                  background:m.from==="user"?T_BOT.grad:"rgba(255,255,255,0.06)",
                  color:T_BOT.text, fontSize:13, lineHeight:1.55,
                  border:m.from==="bot"?`1px solid ${T_BOT.border}`:"none",
                  whiteSpace:"pre-line",
                  animation:"fadeUp 0.15s ease",
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Quick questions */}
          {messages.length <= 1 && (
            <div style={{ padding:"0 12px 8px", display:"flex", flexDirection:"column", gap:5 }}>
              {flows.filter(f => f.intent).slice(0, 2).map((f, i) => (
                <button key={i} onClick={() => handleQuick(f)}
                  style={{
                    textAlign:"left", padding:"7px 12px", borderRadius:8, fontSize:12,
                    background:"rgba(168,85,247,0.08)", border:`1px solid rgba(168,85,247,0.25)`,
                    color:T_BOT.cyan, cursor:"pointer", transition:"background 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(168,85,247,0.15)"}
                  onMouseLeave={e => e.currentTarget.style.background="rgba(168,85,247,0.08)"}
                >
                  🚀 {f.q}
                </button>
              ))}
              {flows.filter(f => !f.intent).slice(0, 3).map((f, i) => (
                <button key={i} onClick={() => handleQuick(f)}
                  style={{
                    textAlign:"left", padding:"7px 12px", borderRadius:8, fontSize:12,
                    background:"rgba(6,182,212,0.08)", border:`1px solid ${T_BOT.border}`,
                    color:T_BOT.cyan, cursor:"pointer", transition:"background 0.15s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(6,182,212,0.15)"}
                  onMouseLeave={e => e.currentTarget.style.background="rgba(6,182,212,0.08)"}
                >
                  {f.q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding:"10px 12px", borderTop:`1px solid ${T_BOT.border}`, display:"flex", gap:8 }}>
            <input
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key==="Enter" && handleSend()}
              placeholder={"Ask or type 'Help'…"}
              style={{
                flex:1, padding:"9px 12px", borderRadius:10, fontSize:13,
                background:"rgba(255,255,255,0.05)", border:`1px solid ${T_BOT.border}`,
                color:T_BOT.text, outline:"none",
              }}
              onFocus={e => e.target.style.borderColor=T_BOT.cyan}
              onBlur={e => e.target.style.borderColor=T_BOT.border}
            />
            <button onClick={handleSend}
              style={{
                padding:"9px 14px", borderRadius:10, background:T_BOT.grad,
                border:"none", color:"#fff", cursor:"pointer", fontSize:14, fontWeight:600,
              }}>↑</button>
          </div>

          {/* Language hint */}
          {messages.length <= 2 && (
            <div style={{ padding:"0 12px 8px", marginTop:-4 }}>
              <span style={{ fontSize:10, color:T_BOT.dim, fontStyle:"italic" }}>
                🌐 Try: "Change language to Tamil"
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
