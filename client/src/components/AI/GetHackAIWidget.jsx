
// client/src/components/AI/GetHackAIWidget.jsx
// Native Floating GetHack AI Assistant Component

import { useState, useEffect, useRef } from "react";
import { useLocation, useParams, useNavigate } from "react-router-dom";
import { aiService } from "../../services/aiService";
import { useAuth } from "../../context/AuthContext";
import HackathonCard from "../pages/hackathons/HackathonCard";
import Logo from "../common/Logo";

export default function GetHackAIWidget() {
  const { user, loading: authLoading } = useAuth();
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

  const [buttonPosition, setButtonPosition] = useState(null);
  const [cardPosition, setCardPosition] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const messagesEndRef = useRef(null);
  const buttonRef = useRef(null);
  const cardRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const dragStartRef = useRef({
    startX: 0,
    startY: 0,
    initialPosX: 0,
    initialPosY: 0,
    hasMoved: false,
    pointerId: null,
    element: null,
    isDrawer: false,
  });

  const STORAGE_KEY = "gethack_ai_button_pos";

  // Clamp button coordinates within visible viewport boundaries
  const clampButtonPosition = (x, y, width = 145, height = 48) => {
    const padding = 12;
    const maxX = Math.max(padding, window.innerWidth - width - padding);
    const maxY = Math.max(padding, window.innerHeight - height - padding);
    return {
      x: Math.min(Math.max(padding, x), maxX),
      y: Math.min(Math.max(padding, y), maxY),
    };
  };

  // Clamp card coordinates within visible viewport boundaries
  const clampCardPosition = (x, y, width = 380, height = 580) => {
    const padding = 12;
    const maxX = Math.max(padding, window.innerWidth - width - padding);
    const maxY = Math.max(padding, window.innerHeight - height - padding);
    return {
      x: Math.min(Math.max(padding, x), maxX),
      y: Math.min(Math.max(padding, y), maxY),
    };
  };

  // Restore saved button position or calculate default position
  useEffect(() => {
    const btnWidth = buttonRef.current?.offsetWidth || 145;
    const btnHeight = buttonRef.current?.offsetHeight || 48;

    let initialPos = null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
          initialPos = parsed;
        }
      }
    } catch (e) {
      // fallback
    }

    if (initialPos) {
      setButtonPosition(clampButtonPosition(initialPos.x, initialPos.y, btnWidth, btnHeight));
    } else {
      const defaultX = Math.max(12, window.innerWidth - btnWidth - 24);
      const defaultY = Math.max(12, window.innerHeight - btnHeight - 24);
      setButtonPosition({ x: defaultX, y: defaultY });
    }
  }, []);

  // Recalculate/clamp positions on window resize or orientation change
  useEffect(() => {
    const handleResize = () => {
      setButtonPosition((prev) => {
        if (!prev) return prev;
        const btnWidth = buttonRef.current?.offsetWidth || 145;
        const btnHeight = buttonRef.current?.offsetHeight || 48;
        return clampButtonPosition(prev.x, prev.y, btnWidth, btnHeight);
      });

      setCardPosition((prev) => {
        if (!prev) return prev;
        const cardWidth = cardRef.current?.offsetWidth || Math.min(420, window.innerWidth * 0.95);
        const cardHeight = cardRef.current?.offsetHeight || Math.min(580, window.innerHeight * 0.85);
        return clampCardPosition(prev.x, prev.y, cardWidth, cardHeight);
      });
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  // Global window pointer listeners to guarantee smooth drag tracking across the viewport
  useEffect(() => {
    const handleGlobalPointerMove = (e) => {
      if (dragStartRef.current.pointerId !== null) {
        moveDrag(e.clientX, e.clientY, e.pointerId);
      }
    };

    const handleGlobalPointerUp = (e) => {
      if (dragStartRef.current.pointerId !== null) {
        endDrag(e.pointerId);
      }
    };

    window.addEventListener("pointermove", handleGlobalPointerMove, { passive: true });
    window.addEventListener("pointerup", handleGlobalPointerUp, { passive: true });
    window.addEventListener("pointercancel", handleGlobalPointerUp, { passive: true });

    return () => {
      window.removeEventListener("pointermove", handleGlobalPointerMove);
      window.removeEventListener("pointerup", handleGlobalPointerUp);
      window.removeEventListener("pointercancel", handleGlobalPointerUp);
    };
  }, []);

  const handleOpenWidget = () => {
    const drawerWidth = cardRef.current?.offsetWidth || Math.min(420, window.innerWidth * 0.95);
    const drawerHeight = cardRef.current?.offsetHeight || Math.min(580, window.innerHeight * 0.85);
    const btnWidth = buttonRef.current?.offsetWidth || 145;
    const btnHeight = buttonRef.current?.offsetHeight || 48;

    const startX = buttonPosition ? buttonPosition.x + btnWidth - drawerWidth : window.innerWidth - drawerWidth - 12;
    const startY = buttonPosition ? buttonPosition.y + btnHeight - drawerHeight : window.innerHeight - drawerHeight - 12;

    setCardPosition(clampCardPosition(startX, startY, drawerWidth, drawerHeight));
    setIsOpen(true);
  };

  const startDrag = (clientX, clientY, pointerId = null, element = null) => {
    const activeNode = isOpen ? cardRef.current : buttonRef.current;
    const rect = activeNode ? activeNode.getBoundingClientRect() : { left: 0, top: 0 };
    const currentPos = isOpen
      ? cardPosition || { x: rect.left, y: rect.top }
      : buttonPosition || { x: rect.left, y: rect.top };

    dragStartRef.current = {
      startX: clientX,
      startY: clientY,
      initialPosX: currentPos.x,
      initialPosY: currentPos.y,
      hasMoved: false,
      pointerId,
      element,
      isDrawer: isOpen,
    };
  };

  const moveDrag = (clientX, clientY, pointerId = null) => {
    if (dragStartRef.current.pointerId === null) return;
    if (pointerId !== null && dragStartRef.current.pointerId !== pointerId) return;

    const dx = clientX - dragStartRef.current.startX;
    const dy = clientY - dragStartRef.current.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 6) {
      dragStartRef.current.hasMoved = true;
      setIsDragging(true);

      const isDrawer = dragStartRef.current.isDrawer;
      const activeNode = isDrawer ? cardRef.current : buttonRef.current;
      const activeWidth = activeNode?.offsetWidth || (isDrawer ? Math.min(420, window.innerWidth * 0.95) : 145);
      const activeHeight = activeNode?.offsetHeight || (isDrawer ? Math.min(580, window.innerHeight * 0.85) : 48);

      const targetX = dragStartRef.current.initialPosX + dx;
      const targetY = dragStartRef.current.initialPosY + dy;

      if (isDrawer) {
        const clamped = clampCardPosition(targetX, targetY, activeWidth, activeHeight);
        setCardPosition(clamped);
      } else {
        const clamped = clampButtonPosition(targetX, targetY, activeWidth, activeHeight);
        setButtonPosition(clamped);
      }
    }
  };

  const endDrag = (pointerId = null) => {
    if (dragStartRef.current.pointerId === null) return;
    if (pointerId !== null && dragStartRef.current.pointerId !== pointerId) return;

    const { element, pointerId: activePointerId, hasMoved, isDrawer } = dragStartRef.current;

    if (element && activePointerId !== null && typeof element.releasePointerCapture === "function") {
      try {
        if (element.hasPointerCapture(activePointerId)) {
          element.releasePointerCapture(activePointerId);
        }
      } catch (err) { }
    }

    dragStartRef.current.pointerId = null;
    setIsDragging(false);

    if (hasMoved) {
      if (!isDrawer) {
        // Save ONLY launcher button position to localStorage when launcher button is dragged
        setButtonPosition((latest) => {
          if (latest) {
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(latest));
            } catch (err) { }
          }
          return latest;
        });
      }
    } else if (!isDrawer) {
      // Click/tap without dragging on collapsed button:
      // — authenticated → open AI panel
      // — still initialising → wait (do nothing; avoids redirect during startup)
      // — unauthenticated → go to login
      if (authLoading) {
        // Auth not resolved yet — ignore the tap
      } else if (user) {
        handleOpenWidget();
      } else {
        navigate("/login");
      }
    }
  };

  // Consolidated Pointer Handlers for Mouse, Trackpad, and Touch
  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return;
    const target = e.currentTarget;
    if (target && typeof target.setPointerCapture === "function") {
      try {
        target.setPointerCapture(e.pointerId);
      } catch (err) { }
    }
    startDrag(e.clientX, e.clientY, e.pointerId, target);
  };

  const handlePointerMove = (e) => {
    if (dragStartRef.current.pointerId === null) return;
    if (e.pointerId !== undefined && e.pointerId !== dragStartRef.current.pointerId) return;
    moveDrag(e.clientX, e.clientY, e.pointerId);
  };

  const handlePointerUp = (e) => {
    if (dragStartRef.current.pointerId === null) return;
    if (e.pointerId !== undefined && e.pointerId !== dragStartRef.current.pointerId) return;
    endDrag(e.pointerId);
  };

  const handlePointerCancel = (e) => {
    if (dragStartRef.current.pointerId === null) return;
    endDrag(e.pointerId);
  };

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
    const handleOpenAI = () => handleOpenWidget();
    window.addEventListener("gethack:open-ai", handleOpenAI);
    return () => window.removeEventListener("gethack:open-ai", handleOpenAI);
  }, [buttonPosition]);

  // Initial welcome message if conversation is empty
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `Hi ${user?.name || "there"}! I'm **getHack AI** — Your Hackathon Assistant. 🚀\n\nHow can I help you today? Discover hackathons or find teammates.`,
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

  const getDrawerStyle = () => {
    if (!cardPosition) return {};

    const drawerWidth = cardRef.current?.offsetWidth || Math.min(420, window.innerWidth * 0.95);
    const drawerHeight = cardRef.current?.offsetHeight || Math.min(580, window.innerHeight * 0.85);

    const clamped = clampCardPosition(cardPosition.x, cardPosition.y, drawerWidth, drawerHeight);

    return {
      left: `${clamped.x}px`,
      top: `${clamped.y}px`,
      right: "auto",
      bottom: "auto",
    };
  };

  // Button is always rendered. Unauthenticated taps redirect to /login (see endDrag).

  return (
    <div className="font-sans">
      {/* Floating Draggable Toggle Button */}
      {!isOpen && (
        <button
          ref={buttonRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          onClick={(e) => {
            if (dragStartRef.current.hasMoved) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          style={{
            ...(buttonPosition
              ? {
                left: `${buttonPosition.x}px`,
                top: `${buttonPosition.y}px`,
                bottom: "auto",
                right: "auto",
              }
              : {}),
            touchAction: "none",
          }}
          className={`fixed z-50 flex items-center gap-2.5 px-5 py-3 rounded-full bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-lg hover:shadow-xl border border-neutral-200/90 dark:border-indigo-500/35 transition-shadow transition-transform duration-300 group touch-none select-none ${isDragging ? "cursor-grabbing scale-105" : "cursor-grab hover:scale-105"
            }`}
        >
          <div className="relative flex items-center justify-center pointer-events-none">
            <Logo iconOnly className="w-5 h-5 object-contain pointer-events-none" alt="getHack AI" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
          </div>
          <span className="font-semibold text-sm tracking-wide">getHack AI</span>
        </button>
      )}

      {/* Slide-over Assistant Drawer Window */}
      {isOpen && (
        <div
          ref={cardRef}
          style={{
            ...getDrawerStyle(),
            overscrollBehavior: "contain",
          }}
          onWheel={(e) => {
            e.stopPropagation();
            if (messagesContainerRef.current && !messagesContainerRef.current.contains(e.target)) {
              messagesContainerRef.current.scrollTop += e.deltaY;
            }
          }}
          className={`fixed z-50 flex flex-col w-[380px] sm:w-[420px] max-w-[95vw] h-[580px] max-h-[85vh] bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden transition-shadow duration-300 font-sans overscroll-contain ${isDragging ? "ring-2 ring-indigo-500/40" : ""
            }`}
        >
          {/* Header */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            style={{ touchAction: "none" }}
            className={`flex items-center justify-between px-5 py-4 bg-slate-900 text-white border-b border-neutral-800 select-none touch-none ${isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center pointer-events-none">
                <Logo iconOnly className="h-6 w-6 object-contain pointer-events-none" alt="getHack AI" />
              </div>
              <div>
                <h3 className="font-bold text-sm leading-tight text-white flex items-center gap-2">
                  getHack AI
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Assistant
                  </span>
                </h3>

              </div>
            </div>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => setIsOpen(false)}
              className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
              title="Close Assistant"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Context Banner */}
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            style={{ touchAction: "none" }}
            className={`bg-slate-950/50 dark:bg-neutral-950 px-4 py-2 text-[11px] text-neutral-400 border-b border-neutral-200/20 flex items-center justify-between select-none touch-none ${isDragging ? "cursor-grabbing" : "cursor-grab"
              }`}
          >
            <span className="flex items-center gap-1.5 font-medium text-neutral-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
              Context: <strong className="capitalize text-indigo-400">{getPageContext().page}</strong>
            </span>
            <span className="text-[10px] text-neutral-500">getHack v1.0</span>
          </div>

          {/* Chat Messages */}
          <div
            ref={messagesContainerRef}
            style={{
              overscrollBehavior: "contain",
              overscrollBehaviorY: "contain",
              WebkitOverflowScrolling: "touch",
            }}
            onWheel={(e) => {
              e.stopPropagation();
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="flex-1 overflow-y-auto overscroll-contain overscroll-y-contain touch-pan-y p-4 space-y-4 bg-slate-50/50 dark:bg-neutral-900/50"
          >
            {messages.map((msg) => {
              const hasRecs = msg.recommendations?.teammates?.length > 0 || msg.recommendations?.hackathons?.length > 0;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`${hasRecs ? "w-full max-w-[95%] sm:max-w-[92%]" : "max-w-[85%]"
                      } rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-xs ${msg.role === "user"
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
