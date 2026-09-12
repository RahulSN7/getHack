// ---------------------------------------------------------------------------
// client/src/components/AI/GetHackAIWidget.jsx
// Native Floating GetHack AI Copilot Component
// ---------------------------------------------------------------------------

import { useState, useEffect, useRef } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { aiService } from "../../services/aiService";
import { useAuth } from "../../context/AuthContext";
import HackathonCard from "../pages/hackathons/HackathonCard";

export default function GetHackAIWidget() {
  const { user } = useAuth();
  const location = useLocation();
  const params = useParams();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [visibleCounts, setVisibleCounts] = useState({});

  const messagesEndRef = useRef(null);

  // Derive page context dynamically from route location and route params
  const getPageContext = () => {
    const path = location.pathname;
    let page = "dashboard";
    let hackathonId = params.id || null;
    let targetUserId = params.userId || null;

    if (path === "/" || path === "") {
      page = "home";
    } else if (path.startsWith("/hackathons")) {
      page = "hackathon";
      if (params.id) hackathonId = params.id;
    } else if (path.startsWith("/teammates")) {
      page = "teammates";
    } else if (path.startsWith("/profile")) {
      page = "profile";
      if (params.id) targetUserId = params.id;
    } else if (path.startsWith("/network")) {
      page = "network";
    } else if (path.startsWith("/messages")) {
      page = "messages";
    }

    return { page, hackathonId, targetUserId };
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, loading]);

  useEffect(() => {
    const handleOpenAI = () => setIsOpen(true);
    window.addEventListener("gethack:open-ai", handleOpenAI);
    return () => window.removeEventListener("gethack:open-ai", handleOpenAI);
  }, []);

  // Initial welcome message if conversation is empty
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `Hi ${user?.name || "there"}! I'm **getHack AI** — Your Hackathon Copilot. 🚀\n\nHow can I help you today? Discover hackathons, find teammates, or analyze project compatibility!`,
          timestamp: new Date(),
        },
      ]);
    }
  }, [user]);

  const handleSend = async (customPrompt) => {
    const textToSend = customPrompt || inputText;
    if (!textToSend.trim() || loading) return;

    const userMsg = {
      id: `user_${Date.now()}`,
      role: "user",
      content: textToSend.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInputText("");
    setLoading(true);
    setCurrentStep("Analyzing goal and user context...");

    try {
      const context = getPageContext();

      const res = await aiService.sendMessage({
        message: userMsg.content,
        conversationId,
        context,
      });

      if (res.success) {
        if (res.conversationId) setConversationId(res.conversationId);

        // Dynamically update connectionStatus for candidate cards if a request was sent
        if (res.message && (res.message.includes("Connection request sent") || res.message.includes("already pending"))) {
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("gethack:connection-changed", { detail: { type: "connection:request-created" } })
            );
          }
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.recommendations?.teammates?.length > 0) {
                const updatedTeammates = msg.recommendations.teammates.map((tm) => {
                  const tmName = tm.name || "";
                  if (res.message.toLowerCase().includes(tmName.toLowerCase())) {
                    return { ...tm, connectionStatus: "request_sent" };
                  }
                  return tm;
                });
                return {
                  ...msg,
                  recommendations: {
                    ...msg.recommendations,
                    teammates: updatedTeammates,
                  },
                };
              }
              return msg;
            })
          );
        }

        const assistantMsg = {
          id: `asst_${Date.now()}`,
          role: "assistant",
          content: res.message,
          recommendations: res.recommendations,
          pendingAction: res.pendingAction,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err) {
      console.error("AI Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: "assistant",
          content: "I couldn't complete that request right now. Please try again.",
          isError: true,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      setCurrentStep("");
    }
  };

  if (!user) return null; // Only available for logged-in users

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2.5 px-5 py-3 rounded-full bg-slate-900 dark:bg-neutral-900 text-white shadow-xl hover:shadow-2xl hover:scale-105 border border-indigo-500/35 transition-all duration-300 group cursor-pointer"
        >
          <div className="relative flex items-center justify-center">
            <img src="/getHack-icon.png" alt="getHack AI" className="w-5 h-5 object-contain" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <span className="font-semibold text-sm tracking-wide">getHack AI</span>
        </button>
      )}

      {/* Slide-over Copilot Drawer Window */}
      {isOpen && (
        <div className="flex flex-col w-[380px] sm:w-[420px] max-w-[95vw] h-[580px] max-h-[85vh] bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden transition-all duration-300">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-slate-900 text-white border-b border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center overflow-hidden shadow-md">
                <img src="/getHack-icon.png" alt="getHack AI" className="h-6 w-6 object-contain" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight text-white flex items-center gap-2">
                  getHack AI
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Copilot
                  </span>
                </h3>
                <p className="text-xs text-neutral-400">Your Hackathon Copilot</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Close Copilot"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Context Banner */}
          <div className="bg-slate-950/50 dark:bg-neutral-950 px-4 py-2 text-[11px] text-neutral-400 border-b border-neutral-200/20 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-medium text-neutral-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              Context: <strong className="capitalize text-indigo-400">{getPageContext().page}</strong>
            </span>
            <span className="text-[10px] text-neutral-500">getHack v1.0</span>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-neutral-900/50">
            {messages.map((msg) => {
              const hasRecs = msg.recommendations?.teammates?.length > 0 || msg.recommendations?.hackathons?.length > 0;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`${
                      hasRecs ? "w-full max-w-[95%] sm:max-w-[92%]" : "max-w-[85%]"
                    } rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white rounded-br-none"
                        : msg.isError
                        ? "bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-bl-none"
                        : "bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 border border-neutral-200/80 dark:border-neutral-700/80 rounded-bl-none"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>

                    {/* Render Structured Hackathon Recommendation Cards using existing HackathonCard component */}
                    {msg.recommendations?.hackathons?.length > 0 && (
                      <div className="mt-3 space-y-2 border-t border-neutral-200/60 dark:border-neutral-700/60 pt-3 text-left w-full">
                        <p className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                          {msg.recommendations.hackathons.length === 1
                            ? "⚡ Recommended Hackathon"
                            : `⚡ Real Hackathon Results (${msg.recommendations.hackathons.length})`}
                        </p>
                        <div className="space-y-3 w-full">
                          {msg.recommendations.hackathons.map((h, idx) => (
                            <HackathonCard key={h.id || h._id || idx} hackathon={h} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Render Structured Teammate Recommendation Cards */}
                    {msg.recommendations?.teammates?.length > 0 && (
                      <div className="mt-3 space-y-2.5 border-t border-neutral-200/60 dark:border-neutral-700/60 pt-3 text-left w-full">
                        <p className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                          {msg.recommendations.teammates.length === 1 ? "⚡ Recommended Teammate" : `👥 Recommended Teammates (${msg.recommendations.teammates.length})`}
                        </p>
                        <div className="space-y-2.5 w-full">
                          {msg.recommendations.teammates.map((t, idx) => {
                            const candidateId = t.userId || t.id || t._id;
                            const name = t.name || "getHack Member";
                            const role = t.role || t.profile?.role || "Developer";
                            const skills = t.skills || t.profile?.skills || [];
                            const availability = t.availability || t.profile?.availability || "Available";

                            const handleCardClick = () => {
                              if (candidateId) {
                                navigate(`/profile/${candidateId}`);
                              }
                            };

                            return (
                              <div
                                key={candidateId || idx}
                                onClick={handleCardClick}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault();
                                    handleCardClick();
                                  }
                                }}
                                className="group w-full min-h-[105px] flex flex-col justify-between p-3 rounded-xl bg-slate-50 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-700/80 hover:border-purple-500/80 hover:shadow-md hover:bg-purple-50/40 dark:hover:bg-purple-950/30 transition-all text-left cursor-pointer active:scale-[0.99]"
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <h4 className="font-bold text-xs text-neutral-900 dark:text-neutral-100 truncate group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                        {name}
                                      </h4>
                                      <p className="text-[10px] font-medium text-purple-600 dark:text-purple-400 truncate">
                                        {role}
                                      </p>
                                    </div>
                                    <span className="shrink-0 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                      {availability}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1 mt-2 min-h-[22px]">
                                    {skills.slice(0, 4).map((skill, sIdx) => (
                                      <span
                                        key={sIdx}
                                        className="text-[9px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 font-medium truncate max-w-[110px]"
                                      >
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-neutral-200/40 dark:border-neutral-800 gap-2">
                                  <span className="text-[10px] text-neutral-400 truncate max-w-[140px]">
                                    {t.location || t.profile?.location ? `📍 ${t.location || t.profile?.location}` : "getHack Member"}
                                  </span>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {candidateId && (
                                      <span
                                        className="inline-flex items-center gap-1 text-[10px] font-bold text-neutral-500 dark:text-neutral-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 group-hover:underline"
                                      >
                                        View Profile →
                                      </span>
                                    )}
                                    {t.connectionStatus === "accepted" || t.connectionStatus === "connected" ? (
                                      <button
                                        type="button"
                                        disabled
                                        onClick={(e) => e.stopPropagation()}
                                        className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-emerald-600 dark:text-emerald-400 border border-neutral-200/80 dark:border-neutral-700/80 text-[10px] font-semibold cursor-not-allowed opacity-90 flex items-center gap-1 shrink-0"
                                      >
                                        <svg className="h-3 w-3 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        <span>Connected</span>
                                      </button>
                                    ) : t.connectionStatus === "pending" || t.connectionStatus === "request_sent" ? (
                                      <button
                                        type="button"
                                        disabled
                                        onClick={(e) => e.stopPropagation()}
                                        className="px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border border-neutral-200/80 dark:border-neutral-700/80 text-[10px] font-semibold cursor-not-allowed opacity-80 flex items-center gap-1 shrink-0"
                                      >
                                        <svg className="h-3 w-3 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                          <polyline points="20 6 9 17 4 12" />
                                        </svg>
                                        <span>Request Sent</span>
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSend(`Connect with ${name}`);
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-semibold transition-colors shadow-2xs cursor-pointer shrink-0"
                                      >
                                        Connect
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  {/* Render Confirmation Box for Pending Actions */}
                  {msg.pendingAction && msg.pendingAction.type === "send_connection_request" && (
                    <div className="mt-3 p-3 rounded-2xl bg-purple-50/90 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 space-y-2 text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-purple-600 text-sm">✉️</span>
                        <p className="font-bold text-xs text-purple-950 dark:text-purple-200">
                          Send connection request to {msg.pendingAction.targetName || "candidate"}?
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleSend("Send Request")}
                          disabled={loading}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-[11px] font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
                        >
                          Send Request
                        </button>
                        <button
                          onClick={() => handleSend("Cancel")}
                          disabled={loading}
                          className="flex-1 py-1.5 px-3 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-[11px] font-bold transition-all disabled:opacity-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-neutral-400 mt-1 px-1">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              );
            })}



            {/* Progress/Thinking indicator */}
            {loading && (
              <div className="flex items-center gap-2 p-3 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 rounded-xl text-indigo-700 dark:text-indigo-300 text-xs">
                <div className="w-4 h-4 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="font-medium animate-pulse">{currentStep || "Processing..."}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestion Chips */}
          {messages.length <= 2 && !loading && (
            <div className="px-4 py-2 flex flex-wrap gap-1.5 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
              <button
                onClick={() => handleSend("Find online AI hackathons for me.")}
                className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                🔍 Find AI hackathons
              </button>
              <button
                onClick={() => handleSend("Find teammates who complement my skills.")}
                className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                👥 Find teammates
              </button>
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Ask getHack AI..."
                disabled={loading}
                className="flex-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || loading}
                className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
