import { useState, useRef, useEffect } from "react";
import { useResponsive } from "./useResponsive.js";

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
    a: "Sure! Opening your report dashboard where you can see all your reports and their status.",
    keywords: ["dashboard", "home", "main", "my reports", "all issues"],
    intent: "issues",
  },
  {
    q: "Take me to Report Status",
    a: "Opening the Report Status page where you can track every issue's progress and SLA deadlines.",
    keywords: ["report status", "tracker", "track", "pipeline", "my progress"],
    intent: "tracker",
  },
];

const OFFICIAL_FLOWS = [
  {
    q: "How do I update an issue status?",
    a: "Open the issue → click 'Update Status' → choose the new status and add a note.\n\nStatus flow:\n🔵 Open → 🟡 In Progress → ✅ Resolved\n\nAlways add a note explaining the action — it's logged in the audit trail with your name and timestamp.",
    keywords: ["update status", "change status", "modify"],
    intent: null,
  },
  {
    q: "What are my SLA deadlines?",
    a: "Deadlines = Base SLA × Priority multiplier:\n• 🔴 Critical → 25% of base (fastest)\n• 🟠 High → 50%\n• 🟡 Medium → 100% (standard)\n• ⚪ Low → 150%\n\nExample: Water issue base SLA = 12h\n→ Critical = 3h, High = 6h, Medium = 12h, Low = 18h\n\nThe deadline badge turns red when overdue.",
    keywords: ["sla", "deadline", "due", "time", "hour"],
    intent: null,
  },
  {
    q: "How does auto-escalation work?",
    a: "When 80% of the SLA deadline passes with no status update, the system auto-escalates to a supervisor.\n\nYou'll see 'Auto-escalated' in the audit trail.\n\n✅ Best practice: Update status to 'In Progress' as soon as you start working — this shows activity and prevents escalation.",
    keywords: ["escalate", "auto", "cron", "breach"],
    intent: null,
  },
  {
    q: "How do I close vs reject an issue?",
    a: "✅ Resolved — problem is fixed on the ground. Use this when work is complete.\n\n⬜ Closed — administratively closed (e.g. duplicate, out of jurisdiction). Always add a reason note.\n\n🔴 Rejected — not a valid civic issue. Must include a clear reason so the citizen understands why.",
    keywords: ["close", "reject", "resolve", "difference"],
    intent: null,
  },
  {
    q: "How to handle high-priority issues?",
    a: "For Critical/High priority issues:\n1. Assign immediately — don't leave in 'Open' state\n2. Update to 'In Progress' within the first 25% of SLA\n3. Add progress notes regularly\n4. If blocked, escalate manually to supervisor with a note\n5. Resolve and document the fix clearly",
    keywords: ["high priority", "critical", "urgent", "important"],
    intent: null,
  },
  {
    q: "How do I use the analytics page?",
    a: "Analytics (sidebar → 📊) shows:\n• Resolution rates by category\n• Issues by status breakdown\n• Average resolution times\n• Overdue issue counts\n\nUse it to:\n→ Spot categories with high backlogs\n→ Identify recurring issue types\n→ Track your team's performance over time",
    keywords: ["analytics", "chart", "stats", "statistics", "report"],
    intent: "analytics",
  },
  {
    q: "Take me to the Dashboard",
    a: "Opening the Dashboard where you can see and manage all civic issues.",
    keywords: ["dashboard", "home", "main", "issues", "all issues"],
    intent: "issues",
  },
  {
    q: "Take me to Analytics",
    a: "Opening the Analytics page with performance metrics, charts, and SLA data.",
    keywords: ["analytics", "charts", "metrics", "stats"],
    intent: "analytics",
  },
];

const SUPERVISOR_FLOWS = [
  {
    q: "How do I monitor team performance?",
    a: "Go to Analytics (📊) to see:\n• Resolution rates per official\n• Average time-to-resolve by category\n• Escalated issues count\n• Overdue issues by priority\n\nFilter by date range to compare weekly/monthly performance.",
    keywords: ["monitor", "team", "performance", "analytics"],
    intent: "analytics",
  },
  {
    q: "How do I handle escalated issues?",
    a: "Escalated issues appear with an 'Auto-escalated' tag in the audit trail.\n\nSteps:\n1. Review the issue history and notes\n2. Reassign to a different official if needed\n3. Update status to 'In Progress' to reset escalation\n4. Add a supervisor note explaining the action\n5. Monitor until resolved",
    keywords: ["escalate", "escalation", "reassign", "sla"],
    intent: null,
  },
  {
    q: "How to set reporting priorities?",
    a: "Priority guidelines for your team:\n\n🔴 Critical — immediate safety risk (gas leak, flooding, downed power line)\n🟠 High — major disruption (main road blocked, water outage)\n🟡 Medium — standard civic issue (pothole, broken streetlight)\n⚪ Low — cosmetic/minor (park bench, faded markings)\n\nEnsure officials follow these consistently for accurate SLA tracking.",
    keywords: ["priority", "guidelines", "set priority"],
    intent: null,
  },
  {
    q: "How to generate a status report?",
    a: "From Analytics page:\n1. Set the date range filter\n2. Note the resolution rate % and avg resolution time\n3. Check 'Issues by Category' chart for hotspots\n4. Export or screenshot for your report\n\nKey metrics to include:\n• Total issues received vs resolved\n• % resolved within SLA\n• Top 3 issue categories\n• Escalation count",
    keywords: ["report", "generate", "status report", "export"],
    intent: "analytics",
  },
  {
    q: "How do I reassign an issue?",
    a: "Open the issue → Update Status → add a note like:\n'Reassigned to [Official Name] — [reason]'\n\nThen notify the official directly. The audit trail will record the reassignment with your name and timestamp.\n\nTip: Use 'In Progress' status when reassigning to prevent auto-escalation.",
    keywords: ["reassign", "assign", "transfer", "move"],
    intent: null,
  },
  {
    q: "What are best practices for officials?",
    a: "Share these with your team:\n\n✅ Update status within 1h of receiving a new issue\n✅ Always add notes when changing status\n✅ Use 'In Progress' before 80% SLA to prevent escalation\n✅ Resolve with a clear description of the fix\n✅ Reject only with a detailed reason\n✅ Check analytics weekly to spot backlogs early",
    keywords: ["best practice", "guidelines", "tips", "advice"],
    intent: null,
  },
  {
    q: "Take me to the Dashboard",
    a: "Opening the Dashboard with all civic issues.",
    keywords: ["dashboard", "home", "main", "issues"],
    intent: "issues",
  },
  {
    q: "Take me to Analytics",
    a: "Opening the Analytics page with performance metrics and charts.",
    keywords: ["analytics", "metrics", "stats", "charts"],
    intent: "analytics",
  },
];

// ─── Casual conversation patterns ────────────────────────────────────────────
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
    response: () => "You're welcome! 😊 Happy to help. Let me know if you need anything else.",
  },
  {
    patterns: ["bye", "goodbye", "see you", "cya", "gtg", "take care"],
    response: () => "Goodbye! 👋 Feel free to come back anytime you need assistance. Have a great day!",
  },
  {
    patterns: ["who are you", "what are you", "tell me about yourself", "your name"],
    response: () => "I'm the CivicTrack Assistant 🏛️ — your AI guide for the civic issue reporting platform.\n\nI can help you:\n• Report and track civic issues\n• Navigate to any page\n• Understand SLA deadlines\n• Answer questions about the process\n\nWhat would you like to do?",
  },
  {
    patterns: ["what can you do", "help", "help me", "capabilities", "features", "options"],
    response: () => "Here's what I can help you with:\n\n📋 Navigate to any page\n📝 Answer questions about reporting\n⏱ Explain SLA deadlines and tracking\n🔍 Find the status of your reports\n📊 Help with analytics\n💡 Give tips and best practices\n\nJust ask me anything!",
  },
  {
    patterns: ["how are you", "how's it going", "you doing"],
    response: () => "I'm doing great, thanks for asking! 🤖 Ready and waiting to help you with civic issues. What's on your mind?",
  },
];

function getFlows(role) {
  if (role === "supervisor") return SUPERVISOR_FLOWS;
  if (role === "citizen") return CITIZEN_FLOWS;
  return OFFICIAL_FLOWS;
}

function getGreeting(role, name) {
  const greet = timeGreeting();
  const base = {
    supervisor: `👋 ${greet}, Supervisor${name ? ` ${name}` : ""}! I can help you monitor team performance, handle escalations, and generate reports. What do you need?`,
    citizen: `👋 ${greet}${name ? ` ${name}` : ""}! I'm your CivicTrack assistant. I can help you report issues, track their status, navigate to any page, and understand how the process works. What do you need?`,
    official: `👋 ${greet}${name ? ` ${name}` : ""}! I'm your reporting assistant. I can help you manage issues, meet SLA deadlines, navigate pages, and follow best practices. What do you need?`,
  };
  return base[role] || base.citizen;
}

function matchFlow(text, flows) {
  const lower = text.toLowerCase().trim();

  // Check for navigation intents explicitly
  for (const f of flows) {
    if (f.intent && f.keywords.some(k => lower.includes(k))) {
      return { ...f, nav: true };
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
  if (bestScore > 0) return best;

  return null;
}

function matchCasual(text) {
  const lower = text.toLowerCase().trim();
  for (const c of CASUAL) {
    if (c.patterns.some(p => lower.includes(p))) return c;
  }
  return null;
}

export default function Chatbot({ role, onNavigate, userName }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
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

  const handleQuick = (flow) => {
    addMsg("user", flow.q);
    setTimeout(() => {
      addMsg("bot", flow.a);
      if (flow.intent && onNavigate) {
        setTimeout(() => onNavigate(flow.intent), 800);
      }
    }, 300);
  };

  const handleSend = () => {
    const q = input.trim();
    if (!q) return;
    setInput("");
    addMsg("user", q);

    setTimeout(() => {
      // 1. Try casual match first
      const casual = matchCasual(q);
      if (casual) {
        addMsg("bot", casual.response(userName));
        return;
      }

      // 2. Try flow match
      const flow = matchFlow(q, flows);
      if (flow) {
        addMsg("bot", flow.a + (flow.intent && onNavigate ? "\n\n🔄 Taking you there now…" : ""));
        if (flow.intent && onNavigate) {
          setTimeout(() => onNavigate(flow.intent), 1200);
        }
        return;
      }

      // 3. Fallback — more helpful than before
      addMsg("bot", "I'm not sure I understood that. Try:\n\n• Asking a question like 'How do I report?'\n• Saying 'Take me to Dashboard'\n• Saying 'Help' to see what I can do\n• Clicking one of the quick links below");
    }, 350);
  };

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        title={role === "supervisor" ? "Supervisor Assistant" : role === "citizen" ? "Citizen Assistant" : "Official Assistant"}
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
                {role === "supervisor" ? "Supervisor Mode" : role === "citizen" ? "Citizen Mode" : "Official Mode"} · {timeGreeting()}
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
              placeholder={"Ask me anything… try 'Help'"}
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
        </div>
      )}
    </>
  );
}
