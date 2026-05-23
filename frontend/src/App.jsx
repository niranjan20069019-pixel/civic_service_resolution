import { useState, useEffect, useRef } from "react";
import { api } from "./api.js";
import { HeroGeometric } from "./components/ui/shape-landing-hero.tsx";
import { useTranslation } from "./useTranslation.js";
import { SUPPORTED_LANGUAGES } from "./i18n.js";
import { motion } from "framer-motion";
import Chatbot from "./Chatbot.jsx";
import HeatmapDashboard from "./HeatmapDashboard.jsx";
import ReportTracker from "./ReportTracker.jsx";
import { useResponsive } from "./useResponsive.js";
import { T, ROLE_COLOR } from "./theme.js";

import AuthScreen from "./components/AuthScreen.jsx";
import IssueList from "./components/IssueList.jsx";
import IssueDetail from "./components/IssueDetail.jsx";
import CreateIssue from "./components/CreateIssue.jsx";
import Analytics from "./components/Analytics.jsx";
import Toast from "./components/ui/Toast.jsx";

export default function App() {
  const [user, setUser] = useState(() => api.getStoredUser());
  const [view, setView] = useState("issues");
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [toast, setToast] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { isMobile } = useResponsive();
  const { lang, setLang, t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!user) return;
    const fetchNotifs = () => api.getNotifications().then(r => { if (r?.success) setNotifications(r.data.notifications); }).catch(() => {});
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handler = (e) => { if (bellRef.current && !bellRef.current.contains(e.target)) setBellOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const markRead = async (id) => {
    await api.markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const showToast = (msg, type="success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3000); };
  const handleLogin = (u) => { setUser(u); showToast(`${t("welcome")}, ${u.name}!`); };
  const handleLogout = async () => {
    if (user.role === "guest") { setUser(null); setView("issues"); return; }
    await api.logout(); setUser(null); setView("issues"); showToast(t("sign_out"));
  };

  if (!user) return (
    <>
      <HeroGeometric badge="Civic Issue Tracker" title1="Report & Track" title2="Civic Issues" />
      <div style={{ textAlign:"center", marginTop:-20, marginBottom:16 }}>
        <button onClick={() => { setUser({ name:"Guest", role:"guest", id:"guest" }); setView("analytics"); }}
          style={{ background:"rgba(6,182,212,0.1)", border:"1px solid rgba(6,182,212,0.3)", color:"#67e8f9",
            padding:"8px 20px", borderRadius:8, cursor:"pointer", fontSize:13 }}>
          📊 View Public Dashboard (no login required)
        </button>
      </div>
      <div id="dashboard"><AuthScreen onLogin={handleLogin} lang={lang} setLang={setLang} t={t} /></div>
    </>
  );

  const NAV_MAIN = [
    ...(user.role !== "guest" ? [{ id:"issues", label: user.role==="citizen" ? t("my_reports") : t("dashboard"), icon:"⊞" }] : []),
    ...(user.role === "citizen" ? [{ id:"tracker", label: "Report Status", icon:"📋" }] : []),
    { id:"heatmap", label: "India Map", icon:"🇮🇳" },
    { id:"analytics", label: "Public Dashboard", icon:"📊" },
  ];
  const NAV_TOOLS = (user.role === "official" || user.role === "supervisor") ? [] : [];

  const NavBtn = ({ item }) => (
    <button onClick={() => { setView(item.id); setSelectedIssueId(null); }}
      style={{
        display:"flex", alignItems:"center", gap:10, width:"100%",
        padding:sidebarOpen?"10px 14px":"10px", borderRadius:10,
        background:view===item.id?"rgba(6,182,212,0.12)":"transparent",
        border:`1px solid ${view===item.id?"rgba(6,182,212,0.3)":"transparent"}`,
        color:view===item.id?T.cyan:T.muted, cursor:"pointer",
        transition:"all 0.15s", fontSize:14, fontWeight:view===item.id?600:400,
        marginBottom:2, textAlign:"left",
      }}>
      <span style={{ fontSize:17, flexShrink:0 }}>{item.icon}</span>
      {sidebarOpen && <span>{item.label}</span>}
    </button>
  );

  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:"'Inter','Segoe UI',system-ui,sans-serif", background:T.bg }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:99, backdropFilter:"blur(4px)" }} />
      )}

      {isMobile && !sidebarOpen && (
        <button onClick={() => setSidebarOpen(true)}
          style={{
            position:"fixed", top:12, left:12, zIndex:50, width:40, height:40,
            borderRadius:10, background:"rgba(13,27,46,0.95)",
            border:`1px solid ${T.border}`, color:T.text, fontSize:18,
            cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
            backdropFilter:"blur(20px)", boxShadow:"0 4px 16px rgba(0,0,0,0.3)",
          }}>
          ☰
        </button>
      )}

      <div style={{
        width: isMobile ? 260 : (sidebarOpen?220:64),
        background:"rgba(13,27,46,0.95)",
        borderRight: isMobile ? "none" : `1px solid ${T.border}`,
        transition:"transform 0.3s ease, width 0.25s ease",
        display:"flex", flexDirection:"column", flexShrink:0, backdropFilter:"blur(20px)",
        position: isMobile ? "fixed" : "relative",
        top: isMobile ? 0 : undefined, left: isMobile ? 0 : undefined,
        zIndex: isMobile ? 100 : undefined,
        height: isMobile ? "100vh" : undefined,
        transform: isMobile ? (sidebarOpen ? "translateX(0)" : "translateX(-100%)") : "none",
      }}>
        <div style={{
          padding:isMobile ? "18px 16px" : (sidebarOpen?"22px 18px 18px":"22px 14px 18px"),
          borderBottom:`1px solid ${T.border}`,
          display:"flex", alignItems:"center", gap:10,
          cursor:"pointer", justifyContent:isMobile?"space-between":"flex-start",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{
              width:34, height:34, background:T.gradBtn, borderRadius:10,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:18, flexShrink:0, boxShadow:"0 0 12px rgba(6,182,212,0.4)",
            }}>🏛️</div>
            {(isMobile || sidebarOpen) && (
              <div>
                <div style={{
                  color:T.text, fontWeight:700, fontSize:15, lineHeight:1,
                  background:T.grad, WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
                }}>{t("app_name")}</div>
                <div style={{ color:T.dim, fontSize:10, marginTop:2 }}>Issue Platform</div>
              </div>
            )}
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)}
              style={{ background:"none", border:"none", color:T.muted, fontSize:20, cursor:"pointer", padding:"4px" }}>✕</button>
          )}
          {!isMobile && (
            <div style={{ marginLeft:"auto", cursor:"pointer" }} onClick={() => setSidebarOpen(o => !o)}>
              {sidebarOpen ? "◀" : "▶"}
            </div>
          )}
        </div>

        <nav style={{ flex:1, padding:"12px 8px", overflowY:"auto" }}>
          {(isMobile || sidebarOpen) && <div style={{
            fontSize:10, color:T.dim, fontWeight:600, letterSpacing:"0.08em",
            textTransform:"uppercase", padding:"4px 8px 8px",
          }}>MAIN</div>}
          {NAV_MAIN.map(n => <NavBtn key={n.id} item={n} />)}

          {NAV_TOOLS.length > 0 && (
            <>
              {(isMobile || sidebarOpen) && <div style={{
                fontSize:10, color:T.dim, fontWeight:600, letterSpacing:"0.08em",
                textTransform:"uppercase", padding:"12px 8px 8px",
              }}>TOOLS</div>}
              {NAV_TOOLS.map(n => <NavBtn key={n.id} item={n} />)}
            </>
          )}
        </nav>

        <div style={{ padding: isMobile ? "14px 16px" : "14px 10px", borderTop:`1px solid ${T.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:(isMobile||sidebarOpen)?10:0 }}>
            <div style={{
              width:34, height:34, borderRadius:"50%",
              background:ROLE_COLOR[user.role]||T.cyan,
              display:"flex", alignItems:"center", justifyContent:"center",
              color:"#fff", fontWeight:700, fontSize:13, flexShrink:0,
              boxShadow:`0 0 8px ${ROLE_COLOR[user.role]||T.cyan}66`,
            }}>
              {user.name?.[0]?.toUpperCase()}
            </div>
            {(isMobile || sidebarOpen) && (
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{
                  color:T.text, fontSize:13, fontWeight:600,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap",
                }}>{user.name}</div>
                <div style={{ display:"flex", alignItems:"center", gap:4, marginTop:2 }}>
                  <span style={{ width:6, height:6, borderRadius:"50%", background:"#10b981", display:"inline-block" }} />
                  <span style={{ color:T.dim, fontSize:11, textTransform:"capitalize" }}>{t("active")}</span>
                </div>
              </div>
            )}
          </div>
          {(isMobile || sidebarOpen) && (
            <>
              {/* Bell icon + notification dropdown */}
              {user.role !== "guest" && (
                <div ref={bellRef} style={{ position:"relative", marginBottom:8 }}>
                  <button onClick={() => setBellOpen(o => !o)} style={{
                    width:"100%", padding:"7px 10px", borderRadius:8, display:"flex",
                    alignItems:"center", gap:8, background:"rgba(255,255,255,0.04)",
                    border:`1px solid ${T.border}`, color:T.muted, cursor:"pointer", fontSize:13,
                  }}>
                    <span style={{ fontSize:16 }}>🔔</span>
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <span style={{
                        marginLeft:"auto", background:"#ef4444", color:"#fff",
                        borderRadius:"50%", width:18, height:18, fontSize:11,
                        display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700,
                      }}>{unreadCount}</span>
                    )}
                  </button>
                  {bellOpen && (
                    <div style={{
                      position:"absolute", bottom:"110%", left:0, right:0, zIndex:200,
                      background:"rgba(13,27,46,0.98)", border:`1px solid ${T.border}`,
                      borderRadius:10, maxHeight:260, overflowY:"auto",
                      boxShadow:"0 8px 32px rgba(0,0,0,0.5)",
                    }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding:"14px 12px", color:T.dim, fontSize:12, textAlign:"center" }}>No notifications</div>
                      ) : notifications.map(n => (
                        <div key={n.id} onClick={() => markRead(n.id)} style={{
                          padding:"10px 12px", borderBottom:`1px solid ${T.border}`,
                          background: n.read ? "transparent" : "rgba(6,182,212,0.06)",
                          cursor:"pointer", fontSize:12, color: n.read ? T.dim : T.text,
                        }}>
                          <div>{n.message}</div>
                          <div style={{ color:T.dim, fontSize:10, marginTop:3 }}>
                            {new Date(n.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <select value={lang} onChange={e => setLang(e.target.value)}
                title={t("select_language")}
                style={{
                  width:"100%", marginBottom:8, padding:"7px 10px", borderRadius:8,
                  background:"rgba(255,255,255,0.05)", border:`1px solid ${T.border}`,
                  color:T.muted, fontSize:12, cursor:"pointer", outline:"none",
                }}
                onFocus={e => (e.target.style.borderColor = T.cyan)}
                onBlur={e => (e.target.style.borderColor = T.border)}>
                {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                  <option key={code} value={code}>{name}</option>
                ))}
              </select>
              <button onClick={handleLogout} style={{
                width:"100%", padding:"8px", borderRadius:8,
                background:"rgba(239,68,68,0.08)",
                border:"1px solid rgba(239,68,68,0.2)", color:"#fca5a5",
                fontSize:12, cursor:"pointer", fontWeight:500, transition:"all 0.15s",
              }}
                onMouseEnter={e => e.currentTarget.style.background="rgba(239,68,68,0.15)"}
                onMouseLeave={e => e.currentTarget.style.background="rgba(239,68,68,0.08)"}>
                {user.role === "guest" ? "🔑 Login" : `🚪 ${t("logout")}`}
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ flex:1, overflow:"auto", paddingTop: isMobile && !sidebarOpen ? 60 : 0 }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding: isMobile ? "16px" : "32px" }}>
          {view==="issues" && selectedIssueId===null && (
            <IssueList user={user}
              onSelect={id => { setSelectedIssueId(id); setView("detail"); }}
              onCreate={() => setView("create")} />
          )}
          {view==="detail" && selectedIssueId && (
            <IssueDetail issueId={selectedIssueId} user={user}
              onBack={() => { setSelectedIssueId(null); setView("issues"); }}
              onUpdated={() => showToast("Issue updated")} />
          )}
          {view==="create" && (
            <CreateIssue
              onCreated={issue => { showToast("Issue reported!"); setSelectedIssueId(issue.id); setView("detail"); }}
              onCancel={() => setView("issues")} />
          )}
          {view==="analytics" && <Analytics user={user} />}
          {view==="tracker" && (
            <ReportTracker user={user}
              onSelect={id => { setSelectedIssueId(id); setView("detail"); }} />
          )}
          {view==="heatmap" && <HeatmapDashboard />}
        </div>
      </div>

      <Chatbot role={user.role}
        onNavigate={(target) => { setView(target); setSelectedIssueId(null); }}
        onChangeLang={(code) => { setLang(code); }}
        userName={user.name} />
    </div>
  );
}
