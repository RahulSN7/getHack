const { getToolDefinitions } = require("../tools");

const SYSTEM_PROMPT = `You are getHack AI — Your Hackathon Copilot inside the getHack application.
Your purpose is to help users:
1. Discover suitable hackathons based on their skills, interests, and availability.
2. Understand hackathon details, deadlines, and rules.
3. Find suitable, complementary teammates and analyze skill compatibility.
4. Connect and collaborate with teammates.

The getHack journey is: Discover -> Connect -> Collaborate. You must enhance this journey.

RULES:
- Be helpful, concise, practical, context-aware, honest, and action-oriented.
- NEVER invent or fabricate hackathon details, user profiles, or candidate teammates.
- NEVER expose chain-of-thought or internal reasoning. Provide clear progress descriptions if needed.
- IMPORTANT UI RULE: Whenever returning structured result cards (teammate cards or hackathon cards), DO NOT output a numbered or bulleted list of candidate/event details in your conversational text response. The interactive UI cards will display the candidate details. Only provide a brief, high-level summary or reasoning in your text response.
- INTENT ROUTING RULE: Always prioritize the requested ACTION over context. If a user asks for TEAMMATES for a hackathon (e.g. "Which teammate best for AI hackathon", "Which teammate is best for AI hackathon?", "Provide me best teammates for A1 hackathon", "Find teammates for A1", "Suggest teammates for AI hackathon", "Who should I team up with for A1?"), the PRIMARY INTENT IS TEAMMATES. Call get_my_profile first, followed by find_teammates. NEVER call search_hackathons or return hackathon cards for teammate queries.
- When a user asks for personalized hackathon recommendations (e.g. "Find online A1 hackathons", "Suggest me hackathons", "Find AI hackathons"), call get_my_profile first, followed by search_hackathons.
- When a user asks "Which one is best?", "Compare them", "Why?", or references previous hackathons ("first one", "second one"), look at the hackathons returned in the previous search result. DO NOT search for new hackathons unless explicitly requested. Compare the previously returned hackathons based on fit with the user's profile and recommend the top match.
- If there are no previous hackathons in the conversation history when asked "Which hackathon is best?", execute a new search_hackathons first.
- When a user asks "Find teammates for me" or "Show teammates", call get_my_profile first, followed by find_teammates(limit: 5, matchMode: "all").
- When a user asks "Show more teammates" or "More teammates", call find_teammates with limit: 5 and excludeUserIds set to candidate IDs already shown in the current search context.
- When a user specifies a skill (e.g. "Find Python teammates", "Find ML teammates"), set skills: ["Python"] in find_teammates and prioritize candidates with that skill.
- When a user specifies a hackathon for teammates, call find_teammates with hackathonId/skills and prioritize candidates whose skills complement the team.
- CRITICAL BEST TEAMMATE RULE: Distinguish between general teammate search and best teammate recommendation. For general search (e.g. "Find teammates for AI hackathon"), return UP TO 5 TEAMMATE CARDS. For best teammate requests (e.g. "Which teammate best for AI hackathon", "Which teammate is best for AI hackathon?", "Best teammate for AI hackathon", "Who is the best teammate for AI hackathon?", "Who should I team up with for AI hackathon?", "Which one is best?" after a teammate search), evaluate the candidates, select EXACTLY ONE BEST TEAMMATE candidate based on skill fit and complementary background, and return ONLY THAT SINGLE BEST TEAMMATE CARD. NEVER return 5 cards and NEVER return hackathon cards for a best teammate request.
- For connection requests (e.g. "Connect with Py Dev", "Send connection request to Py Dev"), NEVER execute send_connection_request immediately. You MUST request user confirmation first with pendingAction: { type: "send_connection_request", targetUserId, targetName }.
- When the user confirms ("Send Request" / "Confirm"), execute the send_connection_request tool.
- When the user cancels ("Cancel"), clear the pending action and do not execute the tool.
- Never execute sensitive database operations directly.
`;

/**
 * Call the configured LLM API (Google Gemini or OpenAI) or fallback.
 * @param {Array} messages - Conversation message array [{role: "user"|"assistant"|"system", content: "..."}]
 * @param {Object} context - Page/user context
 * @returns {Promise<Object>} LLM response { text?: string, toolCalls?: Array, pendingAction?: Object }
 */
async function callLLM(messages, context = {}) {
  if (context?.useFallback || process.env.NODE_ENV === "test") {
    return generateFallbackResponse(messages, context);
  }

  const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  // 1. Try Gemini REST API if GEMINI_API_KEY is available
  if (geminiApiKey) {
    try {
      const response = await callGeminiAPI(messages, context, geminiApiKey);
      if (response && (response.text || (response.toolCalls && response.toolCalls.length > 0) || response.pendingAction)) {
        return response;
      }
    } catch (err) {
      console.warn("[GetHack AI] Gemini API call error:", err.message);
    }
  }

  // 2. Try OpenAI REST API if OPENAI_API_KEY is available
  if (openaiApiKey) {
    try {
      const response = await callOpenAIAPI(messages, context, openaiApiKey);
      if (response && (response.text || (response.toolCalls && response.toolCalls.length > 0) || response.pendingAction)) {
        return response;
      }
    } catch (err) {
      console.warn("[GetHack AI] OpenAI API call error:", err.message);
    }
  }

  // 3. Fallback Heuristic LLM Engine for development/offline testing
  return generateFallbackResponse(messages, context);
}

/**
 * Call Google Gemini REST API
 */
async function callGeminiAPI(messages, context, apiKey) {
  const tools = getToolDefinitions();

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : m.role === "tool" || m.role === "function" ? "user" : "user",
    parts: [{ text: typeof m.content === "string" ? m.content : JSON.stringify(m.content) }],
  }));

  const systemInstructionPart = {
    role: "user",
    parts: [{ text: `SYSTEM INSTRUCTION:\n${SYSTEM_PROMPT}\nCurrent Page Context: ${JSON.stringify(context)}` }],
  };

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [systemInstructionPart, ...contents],
      tools: [{ functionDeclarations: tools }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API HTTP ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const parts = candidate?.content?.parts || [];

  const toolCalls = [];
  let text = "";

  for (const part of parts) {
    if (part.functionCall) {
      toolCalls.push({
        name: part.functionCall.name,
        args: part.functionCall.args || {},
      });
    } else if (part.text) {
      text += part.text;
    }
  }

  if (toolCalls.length > 0) {
    return { toolCalls, text };
  }

  return { text: text || "I am currently processing your request." };
}

/**
 * Call OpenAI REST API
 */
async function callOpenAIAPI(messages, context, apiKey) {
  const tools = getToolDefinitions().map((def) => ({
    type: "function",
    function: def,
  }));

  const formattedMessages = [
    { role: "system", content: `${SYSTEM_PROMPT}\nCurrent Page Context: ${JSON.stringify(context)}` },
    ...messages.map((m) => ({
      role: m.role === "assistant" ? "assistant" : m.role === "tool" ? "tool" : "user",
      content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
    })),
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: formattedMessages,
      tools,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API HTTP ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const choiceMsg = data.choices?.[0]?.message;

  if (choiceMsg?.tool_calls && choiceMsg.tool_calls.length > 0) {
    const toolCalls = choiceMsg.tool_calls.map((tc) => {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(tc.function.arguments || "{}");
      } catch {
        parsedArgs = {};
      }
      return {
        id: tc.id,
        name: tc.function.name,
        args: parsedArgs,
      };
    });
    return { toolCalls, text: choiceMsg.content || "" };
  }

  return { text: choiceMsg?.content || "I am currently processing your request." };
}

/**
 * Extract target skill from user message string
 * @param {string} userMessage
 * @returns {string|null} Normalized skill name or null
 */
function extractSkillFromMessage(userMessage) {
  if (!userMessage || typeof userMessage !== "string") return null;
  const lowerMsg = userMessage.toLowerCase().trim();

  // 1. Explicit Alias Mappings
  if (/\b(javascript|js|javascrpt|java\s*script)\b/i.test(lowerMsg)) return "JavaScript";
  if (/\b(python|py)\b/i.test(lowerMsg)) return "Python";
  if (/\b(react|reactjs|react\.js)\b/i.test(lowerMsg)) return "React";
  if (/\b(node|nodejs|node\.js|node\s*js)\b/i.test(lowerMsg)) return "Node.js";
  if (/\b(typescript|ts)\b/i.test(lowerMsg)) return "TypeScript";
  if (/\b(c\+\+|cpp)\b/i.test(lowerMsg)) return "C++";
  if (/\bjava\b/i.test(lowerMsg) && !/\bjavascript\b/i.test(lowerMsg) && !/\bjava\s*script\b/i.test(lowerMsg) && !/\bjavascrpt\b/i.test(lowerMsg)) return "Java";
  if (/\b(ml|machine learning|machine\s*learning)\b/i.test(lowerMsg)) return "Machine Learning";
  if (/\b(ai|artificial intelligence|artificial\s*intelligence)\b/i.test(lowerMsg)) return "AI";
  if (/\b(rust)\b/i.test(lowerMsg)) return "Rust";
  if (/\b(ui\/ux|ui|ux|figma|designer)\b/i.test(lowerMsg)) return "UI/UX";
  if (/\b(devops|aws)\b/i.test(lowerMsg)) return "DevOps";
  if (/\b(mongodb|mongo|mongo\s*db)\b/i.test(lowerMsg)) return "MongoDB";

  // 2. Pattern-based extractions for arbitrary skills
  const patterns = [
    /teammates?\s+of\s+([a-z0-9#+.-]+)/i,
    /teammates?\s+who\s+know\s+([a-z0-9#+.-]+)/i,
    /teammates?\s+skilled\s+in\s+([a-z0-9#+.-]+)/i,
    /skilled\s+in\s+([a-z0-9#+.-]+)/i,
    /good\s+at\s+([a-z0-9#+.-]+)/i,
    /([a-z0-9#+.-]+)\s+teammates?/i,
    /([a-z0-9#+.-]+)\s+developer/i,
  ];

  const stopWords = new Set([
    "me", "this", "a", "an", "the", "for", "hackathon", "my", "our", "team",
    "available", "good", "best", "top", "some", "find", "suggest", "who", "need",
    "looking", "want", "any", "eligible", "profile", "details", "candidate", "candidates",
    "what", "which", "kind", "type", "do", "does", "is", "are", "show", "give", "get",
    "fetch", "see", "bring", "search", "more", "next", "another"
  ]);

  for (const regex of patterns) {
    const match = lowerMsg.match(regex);
    if (match && match[1]) {
      const candidateTerm = match[1].trim();
      if (!stopWords.has(candidateTerm.toLowerCase()) && candidateTerm.length > 1) {
        if (candidateTerm.toLowerCase() === "java script" || candidateTerm.toLowerCase() === "javascript" || candidateTerm.toLowerCase() === "js") return "JavaScript";
        if (candidateTerm.toLowerCase() === "mongo db" || candidateTerm.toLowerCase() === "mongodb") return "MongoDB";
        if (candidateTerm.toLowerCase() === "node js" || candidateTerm.toLowerCase() === "nodejs") return "Node.js";
        return candidateTerm.charAt(0).toUpperCase() + candidateTerm.slice(1);
      }
    }
  }

  return null;
}

/**
 * Extract target hackathon name or phrase from user message
 * @param {string} userMessage
 * @returns {string|null}
 */
function extractHackathonNameFromMessage(userMessage) {
  if (!userMessage || typeof userMessage !== "string") return null;
  const lowerMsg = userMessage.toLowerCase().trim();

  const patterns = [
    /(?:best teammate|strongest teammate|teammate|teammates|candidate|candidates)\s+for\s+(.+?)(?:hackathon|hackthon|hackaton|hacathon)?$/i,
    /for\s+(?:the\s+)?([a-z0-9\s+.-]+?\s+(?:hackathon|hackthon|hackaton|hacathon))/i,
    /([a-z0-9\s+.-]+?\s+(?:hackathon|hackthon|hackaton|hacathon))/i,
  ];

  for (const regex of patterns) {
    const match = lowerMsg.match(regex);
    if (match && match[1]) {
      let candidateTerm = match[1].replace(/hackathon|hackthon|hackaton|hacathon/gi, "").trim();
      const stopWords = new Set(["me", "my", "our", "this", "a", "an", "the", "best", "top", "good", "some", "find", "suggest", "which", "who", "us"]);
      if (candidateTerm && !stopWords.has(candidateTerm.toLowerCase()) && candidateTerm.length > 1) {
        if (candidateTerm.toLowerCase() === "ai" || candidateTerm.toLowerCase() === "a1") return "AI";
        return candidateTerm.charAt(0).toUpperCase() + candidateTerm.slice(1);
      }
    }
  }

  if (/\b(ai|a1)\b/i.test(lowerMsg) && (lowerMsg.includes("hack") || lowerMsg.includes("event") || lowerMsg.includes("competition"))) return "AI";
  return null;
}

/**
 * Extract target user name from explicit connect user command
 * @param {string} userMessage
 * @returns {string} Target user name or empty string
 */
function extractTargetUserNameFromMessage(userMessage) {
  if (!userMessage || typeof userMessage !== "string") return "";
  let s = userMessage.trim();

  // Multi-pass strip for leading polite phrases or conversational starters
  let prev = "";
  while (prev !== s) {
    prev = s;
    s = s.replace(/^(?:can\s+you|could\s+you|please|would\s+you\s+mind|would\s+you|i\s+want\s+to|i\s+would\s+like\s+to|i\s+want|hey|hi|hello|kindly)\s+/i, "").trim();
  }

  // Strip trailing punctuation & polite suffixes
  s = s.replace(/[?.!]+$/g, "").trim();
  s = s.replace(/\s+(?:please|now|for\s+me|thanks|thank\s+you)$/i, "").trim();

  const connectPatterns = [
    /^(?:send\s+(?:a\s+)?connection\s+request\s+to|send\s+connection\s+to|send\s+req\s+to|send\s+request\s+to)\s+(.+)$/i,
    /^(?:connect\s+me\s+with|connect\s+me\s+to|connect\s+with|connect\s+to|connect)\s+(.+)$/i,
    /^(?:search\s+for|find\s+user|find)\s+(.+)$/i,
    /^(?:add|invite)\s+(.+?)(?:\s+to\s+my\s+network|\s+to\s+network)?$/i,
  ];

  const pronounsAndStopwords = new Set([
    "him", "her", "them", "they", "this teammate", "that teammate",
    "the teammate", "this user", "that user", "the user", "this person",
    "that person", "me", "myself", "first one", "second one", "the first one",
    "the second one", "1st", "2nd", "3rd", "first", "second", "third",
    "the first two", "the 1st two", "those two", "these two", "both",
    "a user", "someone", "anybody", "anyone"
  ]);

  for (const p of connectPatterns) {
    const match = s.match(p);
    if (match && match[1]) {
      let cand = match[1].replace(/[?.!]/g, "").trim();
      cand = cand.replace(/\s+(?:please|now|for\s+me)$/i, "").trim();
      cand = cand.replace(/^(?:a\s+user\s+named|user\s+named|someone\s+named|user)\s+/i, "").trim();
      if (cand && !pronounsAndStopwords.has(cand.toLowerCase())) {
        return cand; 
      }
    }
  }

  return "";
}

/**
 * Match user candidates by name, handle, email, or ID using exact, partial, and fuzzy matching
 * @param {Array} candidates
 * @param {string} targetName
 * @returns {Array} Matching candidate objects
 */
function findMatchingUsersByName(candidates, targetName) {
  if (!Array.isArray(candidates) || candidates.length === 0 || !targetName) return [];
  const rawTarget = String(targetName).trim();
  const cleanTarget = rawTarget.toLowerCase().replace(/^@/, "").replace(/[^a-z0-9]/g, "");
  if (!cleanTarget) return [];

  const getCandFields = (c) => {
    const name = c.name ? String(c.name).toLowerCase() : "";
    const cleanName = name.replace(/[^a-z0-9]/g, "");
    const handle = c.handle || c.profile?.handle ? String(c.handle || c.profile?.handle).toLowerCase().replace(/^@/, "") : "";
    const cleanHandle = handle.replace(/[^a-z0-9]/g, "");
    const email = c.email ? String(c.email).toLowerCase() : "";
    const id = String(c.userId || c.id || c._id || "").toLowerCase();
    return { name, cleanName, handle, cleanHandle, email, id };
  };

  // 1. Exact match on cleanName, cleanHandle, email, or ID
  const exactMatches = candidates.filter((c) => {
    const f = getCandFields(c);
    return (
      f.cleanName === cleanTarget ||
      (f.cleanHandle && f.cleanHandle === cleanTarget) ||
      (f.email && f.email === rawTarget.toLowerCase()) ||
      (f.id && f.id === rawTarget.toLowerCase())
    );
  });
  if (exactMatches.length > 0) return exactMatches;

  // 2. Token / Word match (e.g. "Song" matching "Song Gupta" or "Rahul Song")
  const tokenMatches = candidates.filter((c) => {
    const f = getCandFields(c);
    const targetLower = rawTarget.toLowerCase();
    const parts = f.name.split(/\s+/);
    return (
      parts.includes(targetLower) ||
      f.name === targetLower ||
      f.handle === targetLower ||
      (targetLower.length >= 2 && (f.name.startsWith(targetLower) || f.handle.startsWith(targetLower)))
    );
  });
  if (tokenMatches.length > 0) return tokenMatches;

  // 3. Substring / Fuzzy match
  const fuzzyMatches = candidates.filter((c) => {
    const f = getCandFields(c);
    return (
      f.cleanName.includes(cleanTarget) ||
      cleanTarget.includes(f.cleanName) ||
      (f.cleanHandle && (f.cleanHandle.includes(cleanTarget) || cleanTarget.includes(f.cleanHandle)))
    );
  });

  return fuzzyMatches;
}

/**
 * Extract previous hackathons and previously selected hackathon from conversation history
 * @param {Array} messages
 * @returns {Object} { previousHackathons: Array|null, previousSelectedHackathon: Object|null }
 */
function extractHackathonContextFromMessages(messages) {
  let previousHackathons = [];
  let previousSelectedHackathon = null;

  if (!Array.isArray(messages) || messages.length === 0) {
    return { previousHackathons: null, previousSelectedHackathon: null };
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];

    if (m.recommendations && Array.isArray(m.recommendations.hackathons) && m.recommendations.hackathons.length > 0) {
      if (m.recommendations.hackathons.length === 1 && !previousSelectedHackathon) {
        previousSelectedHackathon = m.recommendations.hackathons[0];
      }
      for (const h of m.recommendations.hackathons) {
        const hId = h.id || h._id;
        if (!previousHackathons.some((existing) => (existing.id || existing._id) === hId)) {
          previousHackathons.push(h);
        }
      }
    }

    if (m.role === "tool" && (m.name === "search_hackathons" || m.name === "get_hackathon_details")) {
      let data = null;
      try {
        data = typeof m.content === "object" ? m.content : JSON.parse(m.content);
      } catch {
        data = null;
      }

      if (data && Array.isArray(data.hackathons) && data.hackathons.length > 0) {
        for (const h of data.hackathons) {
          const hId = h.id || h._id;
          if (!previousHackathons.some((existing) => (existing.id || existing._id) === hId)) {
            previousHackathons.push(h);
          }
        }
      }
      if (data && data.hackathon && !previousSelectedHackathon) {
        previousSelectedHackathon = data.hackathon;
      }
    }
  }

  return {
    previousHackathons: previousHackathons.length > 0 ? previousHackathons : null,
    previousSelectedHackathon,
  };
}

function extractTeammateContextFromMessages(messages) {
  let previousTeammates = [];
  let previousSelectedTeammate = null;

  if (!Array.isArray(messages) || messages.length === 0) {
    return { previousTeammates: null, previousSelectedTeammate: null };
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];

    if (m.recommendations && Array.isArray(m.recommendations.teammates) && m.recommendations.teammates.length > 0) {
      if (m.recommendations.teammates.length === 1 && !previousSelectedTeammate) {
        previousSelectedTeammate = m.recommendations.teammates[0];
      }
      for (const t of m.recommendations.teammates) {
        const tId = t.userId || t.id || t._id;
        if (!previousTeammates.some((existing) => (existing.userId || existing.id || existing._id) === tId)) {
          previousTeammates.push(t);
        }
      }
    }

    if (m.role === "tool" && (m.name === "find_teammates" || m.name === "get_my_network" || m.name === "send_connection_request")) {
      let data = null;
      try {
        data = typeof m.content === "object" ? m.content : JSON.parse(m.content);
      } catch {
        data = null;
      }

      if (data && Array.isArray(data.teammates) && data.teammates.length > 0) {
        for (const t of data.teammates) {
          const tId = t.userId || t.id || t._id;
          if (!previousTeammates.some((existing) => (existing.userId || existing.id || existing._id) === tId)) {
            previousTeammates.push(t);
          }
        }
      }
      if (data && (data.targetName || data.targetUserId) && !previousSelectedTeammate) {
        previousSelectedTeammate = {
          name: data.targetName || "Teammate",
          userId: data.targetUserId,
          id: data.targetUserId,
        };
      }
    }
  }

  return {
    previousTeammates: previousTeammates.length > 0 ? previousTeammates : null,
    previousSelectedTeammate,
  };
}

/**
 * Extract teammate search context (shown candidate user IDs, active skills, active hackathon, match mode)
 * for pagination continuation without cross-turn duplicates.
 * Context resets when a new explicit teammate search is encountered.
 * @param {Array} messages - Conversation message array
 * @returns {Object} { shownIds: Array<string>, activeSkills: Array<string>, activeHackathonId: string|null, activeMatchMode: string }
 */
function extractTeammateSearchContext(messages = []) {
  const shownIds = [];
  const seenSet = new Set();
  let activeSkills = [];
  let activeHackathonId = null;
  let activeMatchMode = "all";

  if (!Array.isArray(messages) || messages.length === 0) {
    return { shownIds: [], activeSkills: [], activeHackathonId: null, activeMatchMode: "all" };
  }

  // Check the latest user message in the conversation
  const lastUserMsgObj = [...messages].reverse().find((m) => m.role === "user");
  if (lastUserMsgObj && typeof lastUserMsgObj.content === "string") {
    const q = understandUserQuery(lastUserMsgObj.content, [], {});
    const norm = q.normalizedQuery || lastUserMsgObj.content.toLowerCase();

    const isContinuationOrBest =
      q.intent === "SHOW_MORE_TEAMMATES" ||
      q.intent === "RECOMMEND_BEST_TEAMMATE" ||
      norm.includes("show more") ||
      norm.includes("more teammates") ||
      norm.includes("give me more") ||
      norm.includes("which teammate is best") ||
      norm.includes("which temmate best") ||
      norm.includes("which one is best") ||
      norm.includes("why");

    const isNewExplicitSearch =
      !isContinuationOrBest &&
      (q.intent === "FIND_TEAMMATES" ||
       q.intent === "FIND_TEAMMATES_BY_SKILL" ||
       q.intent === "FIND_TEAMMATES_FOR_HACKATHON" ||
       (q.entities.skill && (norm.includes("find") || norm.includes("show") || norm.includes("teammate"))) ||
       (q.entities.hackathonName && (norm.includes("find") || norm.includes("show") || norm.includes("teammate"))));

    if (isNewExplicitSearch) {
      // User is starting a completely NEW search right now!
      return {
        shownIds: [],
        activeSkills: q.entities.skill ? [q.entities.skill] : [],
        activeHackathonId: null,
        activeMatchMode: q.entities.skill ? "skill" : "all",
      };
    }
  }

  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];

    // Collect shown teammates from recommendations
    if (m.recommendations && Array.isArray(m.recommendations.teammates)) {
      for (const t of m.recommendations.teammates) {
        const id = String(t.userId || t.id || t._id || "");
        if (id && !seenSet.has(id)) {
          seenSet.add(id);
          shownIds.push(id);
        }
      }
    }

    // Collect search parameters and shown teammates from tool calls/responses
    if (m.role === "tool" && m.name === "find_teammates") {
      let data = null;
      try {
        data = typeof m.content === "object" ? m.content : JSON.parse(m.content);
      } catch {
        data = null;
      }

      if (data) {
        if (Array.isArray(data.teammates)) {
          for (const t of data.teammates) {
            const id = String(t.userId || t.id || t._id || "");
            if (id && !seenSet.has(id)) {
              seenSet.add(id);
              shownIds.push(id);
            }
          }
        }
        if (data.searchArgs) {
          if (activeSkills.length === 0 && Array.isArray(data.searchArgs.skills)) {
            activeSkills = data.searchArgs.skills;
          }
          if (!activeHackathonId && data.searchArgs.hackathonId) {
            activeHackathonId = data.searchArgs.hackathonId;
          }
          if (activeMatchMode === "all" && data.searchArgs.matchMode) {
            activeMatchMode = data.searchArgs.matchMode;
          }
        }
      }
    }

    // Check user messages to determine context boundary
    if (m.role === "user" && typeof m.content === "string") {
      const q = understandUserQuery(m.content, [], {});
      const norm = q.normalizedQuery || m.content.toLowerCase();

      const isContinuationOrBest =
        q.intent === "SHOW_MORE_TEAMMATES" ||
        q.intent === "RECOMMEND_BEST_TEAMMATE" ||
        norm.includes("show more") ||
        norm.includes("more teammates") ||
        norm.includes("give me more") ||
        norm.includes("which teammate is best") ||
        norm.includes("which temmate best") ||
        norm.includes("which one is best") ||
        norm.includes("why");

      if (!isContinuationOrBest && shownIds.length > 0) {
        if (q.entities.skill && activeSkills.length === 0) {
          activeSkills = [q.entities.skill];
        }
        break; // Stop scanning backwards! Context reset for previous turns.
      }
    }
  }

  return {
    shownIds,
    activeSkills,
    activeHackathonId,
    activeMatchMode,
  };
}

/**
 * Extract ordinal index or indices from user message
 * Supports 1st, 2nd, 3rd, 4th, 5th, number 1, #1, first one, second one, last one, first two, second and third, those two, etc.
 * @param {string} text - User message string
 * @param {number} maxCount - Total items available in context
 * @returns {Array<number>} Array of 0-based indices
 */
function extractOrdinalIndices(text, maxCount = 5) {
  if (!text || typeof text !== "string" || maxCount <= 0) return [];
  const s = text.toLowerCase().trim();

  // Multi-ordinal phrases
  if (/\b(first\s+two|top\s+two|1st\s+two|first\s+2|1st\s+2|those\s+two|the\s+two|both|these\s+two)\b/i.test(s)) {
    return maxCount >= 2 ? [0, 1] : [0];
  }
  if (/\b(second\s+and\s+third|2nd\s+and\s+3rd|2nd\s+&\s+3rd|second\s+and\s+3rd)\b/i.test(s)) {
    return maxCount >= 3 ? [1, 2] : maxCount >= 2 ? [1] : [];
  }
  if (/\b(first\s+and\s+second|1st\s+and\s+2nd|1st\s+&\s+2nd)\b/i.test(s)) {
    return maxCount >= 2 ? [0, 1] : [0];
  }
  if (/\b(first\s+and\s+third|1st\s+and\s+3rd|1st\s+&\s+3rd)\b/i.test(s)) {
    return maxCount >= 3 ? [0, 2] : [0];
  }

  // Single ordinal / positional match
  if (/\b(first|1st|number\s*1|#1|the\s+1st|the\s+first)\b/i.test(s)) return [0];
  if (/\b(second|2nd|number\s*2|#2|the\s+2nd|the\s+second)\b/i.test(s)) return maxCount >= 2 ? [1] : [];
  if (/\b(third|3rd|number\s*3|#3|the\s+3rd|the\s+third)\b/i.test(s)) return maxCount >= 3 ? [2] : [];
  if (/\b(fourth|4th|number\s*4|#4|the\s+4th|the\s+fourth)\b/i.test(s)) return maxCount >= 4 ? [3] : [];
  if (/\b(fifth|5th|number\s*5|#5|the\s+5th|the\s+fifth)\b/i.test(s)) return maxCount >= 5 ? [4] : [];
  if (/\b(last|final)\b/i.test(s)) return [maxCount - 1];

  return [];
}

/**
 * Check if the user message is a context reset command
 * @param {string} userMessage
 * @returns {boolean}
 */
function isContextResetCommand(userMessage) {
  if (!userMessage || typeof userMessage !== "string") return false;
  const s = userMessage.toLowerCase().trim();
  return (
    s === "start over" ||
    s === "new search" ||
    s === "forget this" ||
    s === "clear context" ||
    s === "let's start again" ||
    s === "lets start again" ||
    s === "start again" ||
    s === "restart" ||
    s === "clear memory" ||
    s === "forget context" ||
    s.includes("start over") ||
    s.includes("clear context") ||
    s.includes("forget this") ||
    s.includes("let's start again") ||
    s.includes("lets start again")
  );
}

/**
 * Extract structured agent conversation context & entity tracking
 * @param {Array} messages
 * @param {Object} context
 * @returns {Object} Structured context
 */
function extractStructuredContext(messages = [], context = {}) {
  let selectedHackathonId = context.hackathonId || context.selectedHackathonId || null;
  let selectedHackathon = context.selectedHackathon || null;

  let selectedTeammateId = context.teammateId || context.selectedTeammateId || null;
  let selectedTeammate = context.selectedTeammate || null;
  let selectedTeammateIds = context.selectedTeammateIds || [];

  let recommendedHackathonId = null;
  let recommendedHackathon = null;

  let recommendedTeammateIds = [];
  let recommendedTeammates = [];

  let previousHackathons = null;
  let previousTeammates = null;
  let lastResultType = null;
  let lastIntent = null;
  let lastAction = null;

  let pendingAction = context.pendingAction || null;
  let lastSearch = null;

  if (Array.isArray(messages)) {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];

      if (m.pendingAction && !pendingAction) {
        pendingAction = m.pendingAction;
        lastAction = pendingAction.type;
      }

      if (m.recommendations) {
        if (Array.isArray(m.recommendations.hackathons) && m.recommendations.hackathons.length > 0) {
          if (!lastResultType) lastResultType = "hackathons";
          if (m.recommendations.hackathons.length === 1 && !recommendedHackathon) {
            recommendedHackathon = m.recommendations.hackathons[0];
            recommendedHackathonId = recommendedHackathon.id || recommendedHackathon._id;
            if (!selectedHackathon) {
              selectedHackathon = recommendedHackathon;
              selectedHackathonId = recommendedHackathonId;
            }
          }
          if (!previousHackathons) {
            previousHackathons = m.recommendations.hackathons;
          }
        }

        if (Array.isArray(m.recommendations.teammates) && m.recommendations.teammates.length > 0) {
          if (!lastResultType) lastResultType = "teammates";
          if (m.recommendations.teammates.length === 1 && !selectedTeammate) {
            selectedTeammate = m.recommendations.teammates[0];
            selectedTeammateId = selectedTeammate.userId || selectedTeammate.id || selectedTeammate._id;
            if (!selectedTeammateIds.includes(selectedTeammateId)) {
              selectedTeammateIds.push(selectedTeammateId);
            }
          }
          if (recommendedTeammates.length === 0) {
            recommendedTeammates = m.recommendations.teammates;
            recommendedTeammateIds = recommendedTeammates.map((t) => t.userId || t.id || t._id);
          }
          if (!previousTeammates) {
            previousTeammates = m.recommendations.teammates;
          }
        }
      }

      if (m.role === "tool") {
        let data = null;
        try {
          data = typeof m.content === "object" ? m.content : JSON.parse(m.content);
        } catch {
          data = null;
        }

        if (data && Array.isArray(data.hackathons) && data.hackathons.length > 0) {
          if (!lastResultType) lastResultType = "hackathons";
          if (!previousHackathons) {
            previousHackathons = data.hackathons;
          }
        }
        if (data && data.hackathon && !selectedHackathon) {
          selectedHackathon = data.hackathon;
          selectedHackathonId = selectedHackathon.id || selectedHackathon._id;
        }
        if (data && Array.isArray(data.teammates) && data.teammates.length > 0) {
          if (!lastResultType) lastResultType = "teammates";
          if (!previousTeammates) {
            previousTeammates = data.teammates;
          }
        }
        if (data && data.searchArgs && !lastSearch) {
          lastSearch = data.searchArgs;
        }
      }
    }
  }

  return {
    selectedHackathonId,
    selectedHackathon,
    selectedTeammateId,
    selectedTeammate,
    selectedTeammateIds,
    recommendedHackathonId,
    recommendedHackathon,
    recommendedTeammateIds,
    recommendedTeammates,
    previousHackathons,
    previousTeammates,
    lastHackathonResults: previousHackathons,
    lastTeammateResults: previousTeammates,
    lastResultType,
    lastIntent,
    lastAction,
    pendingAction,
    lastSearch,
  };
}

/**
 * Check if the reference in the user's query is ambiguous
 * @param {string} userMessage
 * @param {Object} structuredContext
 * @returns {Object} { isAmbiguous: boolean, entityType?: string, candidates?: Array }
 */
function checkAmbiguousReference(userMessage, structuredContext) {
  if (!userMessage || typeof userMessage !== "string") return { isAmbiguous: false };
  const s = userMessage.toLowerCase().trim();

  const extractedHackName = extractHackathonNameFromMessage(userMessage);
  const ordinals = extractOrdinalIndices(s, 10);
  const hasOrdinal = ordinals.length > 0;
  const extractedSkill = extractSkillFromMessage(userMessage);

  const isHackathonQuestion =
    s.includes("skills") ||
    s.includes("require") ||
    s.includes("missing") ||
    s.includes("deadline") ||
    s.includes("details") ||
    s.includes("about it") ||
    s.includes("about this") ||
    s.includes("explain it") ||
    s === "which hackathon";

  if (isHackathonQuestion && !extractedHackName && !hasOrdinal && !extractedSkill) {
    if (!structuredContext.selectedHackathon && Array.isArray(structuredContext.previousHackathons) && structuredContext.previousHackathons.length > 1) {
      return {
        isAmbiguous: true,
        entityType: "hackathon",
        candidates: structuredContext.previousHackathons,
      };
    }
  }

  const isVagueTeammateRef =
    (s.includes("connect") || s.includes("tell me about") || s.includes("details")) &&
    (s.includes("him") || s.includes("her") || s.includes("them") || s.includes("this user") || s.includes("that user") || s.includes("this person"));

  if (isVagueTeammateRef && !hasOrdinal) {
    if (!structuredContext.selectedTeammate && Array.isArray(structuredContext.previousTeammates) && structuredContext.previousTeammates.length > 1) {
      return {
        isAmbiguous: true,
        entityType: "teammate",
        candidates: structuredContext.previousTeammates,
      };
    }
  }

  return { isAmbiguous: false };
}

/**
 * Score and rank hackathons against user profile and optional target skill
 */
function rankBestHackathons(hackathons, userProfile = {}, targetSkill = null) {
  if (!Array.isArray(hackathons) || hackathons.length === 0) return [];

  const userSkills = (userProfile.skills || []).map((s) => s.toLowerCase());
  const userInterests = (userProfile.interests || []).map((i) => i.toLowerCase());

  const scored = hackathons.map((h) => {
    let score = 0;
    const hSkills = (h.skills || h.requiredSkills || []).map((s) => s.toLowerCase());
    const hTags = (h.tags || h.themes || []).map((t) => t.toLowerCase());
    const titleLower = (h.title || h.name || "").toLowerCase();
    const descLower = (h.description || "").toLowerCase();

    const matchingSkills = [];
    for (const s of userSkills) {
      if (hSkills.some((hs) => hs.includes(s) || s.includes(hs))) {
        score += 10;
        matchingSkills.push(s);
      }
    }

    const matchingInterests = [];
    for (const i of userInterests) {
      if (
        hTags.some((ht) => ht.includes(i) || i.includes(ht)) ||
        titleLower.includes(i) ||
        descLower.includes(i)
      ) {
        score += 5;
        matchingInterests.push(i);
      }
    }

    if (targetSkill) {
      const ts = targetSkill.toLowerCase();
      if (
        hSkills.some((hs) => hs.includes(ts) || ts.includes(hs)) ||
        titleLower.includes(ts) ||
        descLower.includes(ts)
      ) {
        score += 50;
        matchingSkills.push(targetSkill);
      }
    }

    if (h.status === "registration_open" || !h.status) {
      score += 2;
    }

    return {
      hackathon: h,
      score,
      matchingSkills: Array.from(new Set(matchingSkills)),
      matchingInterests: Array.from(new Set(matchingInterests)),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

/**
 * Score and rank candidate teammates against user profile, target skill, and hackathon requirements
 * @param {Array} candidates
 * @param {Object} userProfile
 * @param {string|null} targetSkill
 * @param {Object|null} hackathonObj
 * @returns {Array} Scored candidate objects [{ teammate, score, matchingSkills, complementarySkills }]
 */
function rankBestTeammates(candidates, userProfile = {}, targetSkill = null, hackathonObj = null) {
  if (!Array.isArray(candidates) || candidates.length === 0) return [];

  const userSkills = (userProfile.skills || []).map((s) => String(s).toLowerCase());
  const hackSkills = (hackathonObj?.skills || hackathonObj?.requiredSkills || []).map((s) => String(s).toLowerCase());

  const scored = candidates.map((c) => {
    let score = 0;
    const candidateSkills = (c.skills || []).map((s) => String(s).toLowerCase());
    const candidateRole = (c.role || "").toLowerCase();
    const candidateBio = (c.bio || "").toLowerCase();

    const matchingSkills = [];
    const complementarySkills = [];

    // 1. Target Skill match (+50 points)
    if (targetSkill) {
      const ts = targetSkill.toLowerCase();
      if (
        candidateSkills.some((cs) => cs.includes(ts) || ts.includes(cs)) ||
        candidateRole.includes(ts) ||
        candidateBio.includes(ts)
      ) {
        score += 50;
        matchingSkills.push(targetSkill);
      }
    }

    // 2. Hackathon requirements match (+20 points per matching skill)
    for (const hs of hackSkills) {
      if (candidateSkills.some((cs) => cs.includes(hs) || hs.includes(cs))) {
        score += 20;
        matchingSkills.push(hs);
      }
    }

    // 3. Complementary skills (+30 points for skills candidate has that user lacks)
    for (const cs of c.skills || []) {
      const csLow = String(cs).toLowerCase();
      const userHasIt = userSkills.some((us) => us.includes(csLow) || csLow.includes(us));
      if (!userHasIt) {
        score += 30;
        complementarySkills.push(cs);
      } else {
        matchingSkills.push(cs);
      }
    }

    // 4. Role relevance (+15 points)
    if (candidateRole.includes("developer") || candidateRole.includes("engineer") || candidateRole.includes("designer") || candidateRole.includes("ai") || candidateRole.includes("ml")) {
      score += 15;
    }

    // 5. Availability (+10 points)
    if (c.availability === "available" || c.availability === "Available") {
      score += 10;
    }

    return {
      teammate: c,
      score,
      matchingSkills: Array.from(new Set(matchingSkills)),
      complementarySkills: Array.from(new Set(complementarySkills)),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

/**
 * Build a complete complementary team composition for a selected hackathon
 * @param {Array} candidates - Available teammate candidates pool
 * @param {Object} userProfile - Current user's profile object
 * @param {Object} refHackathon - Selected target hackathon object
 * @returns {Object} { hackTitle, userRole, userSkills, userCoveredSkills, skillGaps, selectedTeammates, rationaleLines }
 */
function buildTeamComposition(candidates = [], userProfile = {}, refHackathon = {}) {
  const hackTitle = refHackathon.title || refHackathon.name || "this hackathon";
  const hackSkills = (refHackathon.skills || refHackathon.requiredSkills || ["AI / ML", "Python", "React", "UI/UX"])
    .map((s) => String(s).trim());

  const userSkills = (userProfile.skills || ["React", "JavaScript", "C++"])
    .map((s) => String(s).trim());

  const userId = userProfile.id || userProfile._id || userProfile.userId;

  // Filter eligible candidates (exclude current user)
  const eligibleCandidates = (candidates || []).filter((c) => {
    const cId = c.userId || c.id || c._id;
    if (userId && cId && String(userId) === String(cId)) return false;
    return true;
  });

  // Calculate covered skills & skill gaps
  const userCoveredSkills = [];
  const skillGaps = [];

  for (const hs of hackSkills) {
    const hsLow = hs.toLowerCase();
    const isCovered = userSkills.some((us) => {
      const usLow = us.toLowerCase();
      return usLow === hsLow || usLow.includes(hsLow) || hsLow.includes(usLow);
    });
    if (isCovered) {
      userCoveredSkills.push(hs);
    } else {
      skillGaps.push(hs);
    }
  }

  // Determine user's primary role
  const userRole = userProfile.role ||
    (userSkills.some((s) => /react|node|javascript|css|html|express|mongo/i.test(s)) ? "Full Stack Developer" : "Software Developer");

  // Rank eligible candidates using rankBestTeammates
  const rankedScored = rankBestTeammates(eligibleCandidates, userProfile, null, refHackathon);

  // Greedy selection for complementary candidates
  const selectedTeammates = [];

  for (const item of rankedScored) {
    if (selectedTeammates.length >= 2) break;
    selectedTeammates.push(item.teammate);
  }

  // Build bulleted rationale lines
  const userCoveredText = userCoveredSkills.length > 0 ? userCoveredSkills.join(" and ") : "the web/core development";
  const rationaleLines = [
    `• You cover the **${userCoveredText}** side.`,
  ];

  selectedTeammates.forEach((t) => {
    const tSkills = (t.skills || []).slice(0, 3).join(", ");
    rationaleLines.push(`• **${t.name}** (${t.role || "Developer"}) covers the **${tSkills || "required technical"}** requirements.`);
  });

  return {
    hackTitle,
    userRole,
    userSkills,
    userCoveredSkills,
    skillGaps,
    selectedTeammates,
    rationaleLines,
  };
}

/**
 * Normalize raw query string to fix common spelling typos, grammar issues, and informal phrasing
 * @param {string} text
 * @returns {string} Normalized lowercased string
 */
function normalizeQueryText(text) {
  if (!text || typeof text !== "string") return "";
  let s = text.toLowerCase().trim();

  // 1. Hackathon domain term typos
  s = s.replace(/\b(hackthon|hackaton|hackathn|hacathon|hacathone|hackthons|hacathons)\b/g, "hackathon");
  s = s.replace(/\b(hackathon\?|hackthon\?|hackaton\?)\b/g, "hackathon");

  // 2. Teammate & Team domain term typos
  s = s.replace(/\b(temmate|temmates|teamate|teamates)\b/g, "teammate");
  s = s.replace(/\b(tem|teem|teamup|team-up)\b/g, (m) => (m === "teamup" || m === "team-up" ? "team up" : "team"));
  s = s.replace(/\bteam\s+mate(s)?\b/g, "teammate$1");
  s = s.replace(/\b(temmate\?|teamate\?)\b/g, "teammate");

  // 3. Action / Requirement / Keyword typos
  s = s.replace(/\b(requr|requir|requirment|requirments|reqs|requre)\b/g, "require");
  s = s.replace(/\b(conect|conecting|conection|conections)\b/g, "connect");
  s = s.replace(/\b(wid|wit)\b/g, "with");
  s = s.replace(/\b(skill|skills|skils|skl)\b/g, "skills");
  s = s.replace(/\b(wat|wats|wht)\b/g, "what");
  s = s.replace(/\b(bst|topmost)\b/g, "best");
  s = s.replace(/\b(regestration|registraton|registraion)\b/g, "registration");
  s = s.replace(/\b(dont\s+hv|dont\s+have)\b/g, "dont have");

  // 4. Technical term phrase normalization (preserve canonical meaning)
  s = s.replace(/\bjava\s+script\b/g, "javascript");
  s = s.replace(/\bnode\s+js\b/g, "nodejs");
  s = s.replace(/\bmongo\s+db\b/g, "mongodb");
  s = s.replace(/\btailwind\s+css\b/g, "tailwindcss");

  return s;
}

/**
 * Natural Language Query Understanding & Normalization Step
 * @param {string} userMessage - Raw message string from user
 * @param {Array} messages - Conversation message history
 * @param {Object} context - App / page context
 * @returns {Object} Query analysis { intent, rawQuery, normalizedQuery, entities, contextReference, confidence }
 */
function understandUserQuery(userMessage, messages = [], context = {}) {
  const rawQuery = typeof userMessage === "string" ? userMessage : "";
  const normalizedQuery = normalizeQueryText(rawQuery);

  const { previousHackathons, previousSelectedHackathon } = extractHackathonContextFromMessages(messages);
  const { previousTeammates, previousSelectedTeammate } = extractTeammateContextFromMessages(messages);

  const extractedSkill = extractSkillFromMessage(rawQuery) || extractSkillFromMessage(normalizedQuery);
  const extractedHackName = extractHackathonNameFromMessage(rawQuery) || extractHackathonNameFromMessage(normalizedQuery);

  let intent = "GENERIC_FALLBACK";
  let confidence = 0.5;

  const extractedTargetName = extractTargetUserNameFromMessage(rawQuery) || extractTargetUserNameFromMessage(normalizedQuery);

  // 1. Connection Intent
  const isDirectConnect =
    Boolean(extractedTargetName) &&
    (/\b(connect\s+me\s+with|connect\s+with|send\s+(a\s+)?connection\s+request\s+to|send\s+req\s+to|i\s+want\s+to\s+connect\s+with|i\s+want\s+connect\s+with|connect\s+me\s+wid)\b/i.test(normalizedQuery) ||
     normalizedQuery.startsWith("connect me with") ||
     normalizedQuery.startsWith("connect with") ||
     normalizedQuery.startsWith("send connection request to") ||
     normalizedQuery.startsWith("send req to") ||
     normalizedQuery.startsWith("i want to connect with") ||
     normalizedQuery.startsWith("connect me wid"));

  const isConnectIntent =
    isDirectConnect ||
    normalizedQuery.startsWith("connect with") ||
    normalizedQuery.startsWith("send connection request") ||
    normalizedQuery.startsWith("connect to") ||
    (normalizedQuery.includes("connect") && !normalizedQuery.includes("network") && !normalizedQuery.includes("how") && !normalizedQuery.includes("discovers"));

  if (isDirectConnect) {
    intent = "DIRECT_CONNECT_USER";
    confidence = 0.98;
  } else if (isConnectIntent) {
    intent = "CONNECT_USER";
    confidence = 0.95;
  }

  // 2. Teammate Intents (Explicit Best Teammate & Teammate Discovery)
  const isComplementaryRequest =
    normalizedQuery.includes("complement") ||
    normalizedQuery.includes("fill my skill gap") ||
    normalizedQuery.includes("skill gap") ||
    normalizedQuery.includes("different skills");

  const isBestTeammatesPlural =
    /\b(best|top|strongest)\s+(teammates|candidates|people|participants)\b/i.test(normalizedQuery) ||
    normalizedQuery.includes("provide me best teammates") ||
    normalizedQuery.includes("give me best teammates") ||
    normalizedQuery.includes("show best teammates") ||
    normalizedQuery.includes("find best teammates");

  const isExplicitBestTeammateQuery =
    !isBestTeammatesPlural && (
      /\b(best|strongest|top)\s+(teammate|candidate|person)\b/i.test(normalizedQuery) ||
      /\bwhich\s+(teammate|candidate|person)\s+(is\s+)?(the\s+)?(best|strongest)\b/i.test(normalizedQuery) ||
      /\bwhich\s+(teammate|candidate|person)\s+should\s+i\s+(choose|pick|select|invite|team\s+up\s+with)\b/i.test(normalizedQuery) ||
      /\bwho\s+is\s+(the\s+)?(best|strongest)\s+(teammate|candidate|person)\b/i.test(normalizedQuery) ||
      /\bwho\s+would\s+be\s+(the\s+)?(best|strongest)\s+(teammate|candidate|person)\b/i.test(normalizedQuery) ||
      /\brecommend\s+(the\s+)?(best|strongest)\s+(teammate|candidate|person)\b/i.test(normalizedQuery) ||
      /\bfind\s+(me\s+)?(the\s+)?(best|strongest)\s+(teammate|candidate|person)\b/i.test(normalizedQuery) ||
      /\bsuggest\s+(the\s+)?(best|strongest)\s+(teammate|candidate|person)\b/i.test(normalizedQuery) ||
      /\bwho\s+should\s+i\s+(choose|pick|select|invite|team\s+up\s+with)\b/i.test(normalizedQuery) ||
      /\bwho\s+should\s+i\s+team\s+up\s+with\b/i.test(normalizedQuery) ||
      normalizedQuery.includes("which teammate best") ||
      normalizedQuery.includes("which teammate is best") ||
      normalizedQuery.includes("which temmate best") ||
      normalizedQuery.includes("best teemmate") ||
      normalizedQuery.includes("best teammate for") ||
      normalizedQuery.includes("who is the best teammate") ||
      normalizedQuery.includes("top teammate") ||
      normalizedQuery.includes("give me your top teammate") ||
      normalizedQuery.includes("give me your top candidate") ||
      (normalizedQuery.includes("which one is best") && (normalizedQuery.includes("teammate") || normalizedQuery.includes("candidate") || normalizedQuery.includes("person"))) ||
      (normalizedQuery.includes("who is best") && (normalizedQuery.includes("teammate") || normalizedQuery.includes("candidate") || normalizedQuery.includes("person"))) ||
      ((normalizedQuery === "which one is best" || normalizedQuery === "which is the best" || normalizedQuery === "which one best" || normalizedQuery === "which teammate best") && Boolean(previousTeammates))
    );

  if (intent === "GENERIC_FALLBACK" && isExplicitBestTeammateQuery) {
    intent = "RECOMMEND_BEST_TEAMMATE";
    confidence = 0.95;
  }

  // 3. Build Team Intent
  const isBuildTeamQuery =
    /\b(build|make|create|suggest|form)\s+(a\s+|my\s+|the\s+)?(best\s+)?team\b/i.test(normalizedQuery) ||
    /\bwho\s+should\s+be\s+on\s+my\s+team\b/i.test(normalizedQuery) ||
    /\bwhat\s+teammates\s+should\s+i\s+choose\b/i.test(normalizedQuery) ||
    /\bwhich\s+teammates\s+should\s+i\s+choose\b/i.test(normalizedQuery) ||
    /\bfind\s+teammates\s+i\s+should\s+invite\b/i.test(normalizedQuery) ||
    /\bhelp\s+me\s+find\s+a\s+team\b/i.test(normalizedQuery) ||
    /\bmake\s+a\s+team\s+for\s+me\b/i.test(normalizedQuery) ||
    /\bhelp\s+me\s+build\s+team\b/i.test(normalizedQuery) ||
    normalizedQuery.includes("build team") ||
    normalizedQuery.includes("build my team") ||
    normalizedQuery.includes("build a team") ||
    normalizedQuery.includes("create a team") ||
    normalizedQuery.includes("make a team") ||
    normalizedQuery.includes("make team") ||
    normalizedQuery.includes("suggest a team") ||
    normalizedQuery.includes("best team for") ||
    normalizedQuery.includes("who should be on my team") ||
    normalizedQuery.includes("which teammates should i choose") ||
    normalizedQuery.includes("what teammates should i choose") ||
    normalizedQuery.includes("find teammates i should invite") ||
    normalizedQuery.includes("which team would be best") ||
    normalizedQuery.includes("which team best") ||
    normalizedQuery.includes("help me make a team") ||
    normalizedQuery === "best team for this hackathon" ||
    normalizedQuery === "which team would be best";

  if (intent === "GENERIC_FALLBACK" && isBuildTeamQuery) {
    intent = "BUILD_TEAM";
    confidence = 0.95;
  }

  const isTeammateRequest =
    isComplementaryRequest ||
    isExplicitBestTeammateQuery ||
    normalizedQuery.includes("teammate") ||
    normalizedQuery.includes("someone who") ||
    normalizedQuery.includes("someone skilled") ||
    normalizedQuery.includes("skilled in") ||
    normalizedQuery.includes("good at") ||
    normalizedQuery.includes("need an ml") ||
    normalizedQuery.includes("need a frontend") ||
    normalizedQuery.includes("need a ui") ||
    normalizedQuery.includes("designer") ||
    normalizedQuery.includes("ui/ux") ||
    normalizedQuery.includes("candidate") ||
    normalizedQuery.includes("team up") ||
    normalizedQuery.includes("who to work with") ||
    normalizedQuery.includes("who can join") ||
    normalizedQuery.includes("join my team") ||
    normalizedQuery.includes("provide me best teammates") ||
    normalizedQuery.includes("provide me teammates") ||
    normalizedQuery.includes("suggest teammates") ||
    normalizedQuery.includes("find teammates") ||
    normalizedQuery.includes("which teammate");

  const isShowMoreTeammatesQuery =
    /\b(show|find|give|get|fetch|see)\s+(me\s+)?(more|next)\s+(teammates?|candidates?|users?|people|teemmates?|teamates?)\b/i.test(normalizedQuery) ||
    /\b(more|next)\s+(teammates?|candidates?|users?|people|teemmates?|teamates?)\b/i.test(normalizedQuery) ||
    /\b(give\s+me\s+more|show\s+some\s+more\s+users|show\s+more\s+users|show\s+more|get\s+more)\b/i.test(normalizedQuery) ||
    normalizedQuery === "more teammates" ||
    normalizedQuery === "show more" ||
    normalizedQuery === "give me more" ||
    normalizedQuery === "show more teammates" ||
    normalizedQuery === "show me more teammates" ||
    normalizedQuery === "show me more teemmates" ||
    normalizedQuery === "show more teamates";

  if (intent === "GENERIC_FALLBACK" && isShowMoreTeammatesQuery) {
    intent = "SHOW_MORE_TEAMMATES";
    confidence = 0.98;
  }

  if (intent === "GENERIC_FALLBACK" && isTeammateRequest) {
    if (isShowMoreTeammatesQuery) {
      intent = "SHOW_MORE_TEAMMATES";
      confidence = 0.98;
    } else if (isExplicitBestTeammateQuery) {
      intent = "RECOMMEND_BEST_TEAMMATE";
      confidence = 0.95;
    } else {
      intent = "FIND_TEAMMATES";
      confidence = 0.9;
    }
  }

  // 3. Contextual Hackathon Intelligence Intents
  if (intent === "GENERIC_FALLBACK") {
    // Skill Gap
    const isSkillGap =
      normalizedQuery.includes("missing") ||
      normalizedQuery.includes("what skill i miss") ||
      normalizedQuery.includes("what skills i miss") ||
      normalizedQuery.includes("what skills i dont have") ||
      normalizedQuery.includes("what skill i dont have") ||
      normalizedQuery.includes("which skill i need learn") ||
      normalizedQuery.includes("which skills i need learn") ||
      normalizedQuery.includes("my skill gap") ||
      normalizedQuery.includes("skill gap");

    if (isSkillGap) {
      intent = "HACKATHON_SKILL_GAP";
      confidence = 0.95;
    }
  }

  if (intent === "GENERIC_FALLBACK") {
    // Requirements
    const isRequirements =
      /\bwhat\s+(skills|skills\s+do\s+i|skills\s+i|skills\s+are|skills\s+needed|skills\s+required|skills\s+need|tech|technology|technologies|stack|tech\s+stack)\b/i.test(normalizedQuery) ||
      /\bwhich\s+skills?\s+(need|needed|require|required)\b/i.test(normalizedQuery) ||
      /\bwat\s+(skills|tech|technology)\b/i.test(normalizedQuery) ||
      normalizedQuery.includes("what skill i need") ||
      normalizedQuery.includes("what skills i need") ||
      normalizedQuery.includes("what skill i require") ||
      normalizedQuery.includes("what skills i require") ||
      normalizedQuery.includes("which skill need") ||
      normalizedQuery.includes("which skills need") ||
      normalizedQuery.includes("wat tech required") ||
      normalizedQuery.includes("what tech required") ||
      normalizedQuery.includes("what tech stack") ||
      normalizedQuery.includes("what do i require") ||
      normalizedQuery.includes("skills for this") ||
      normalizedQuery.includes("skills need") ||
      normalizedQuery.includes("skill need") ||
      normalizedQuery.includes("what requirement");

    if (isRequirements) {
      intent = "HACKATHON_REQUIREMENTS";
      confidence = 0.95;
    }
  }

  if (intent === "GENERIC_FALLBACK") {
    // Deadline
    const isDeadline =
      normalizedQuery.includes("when deadline") ||
      normalizedQuery.includes("registration close") ||
      normalizedQuery.includes("when registration close") ||
      normalizedQuery.includes("how much time left") ||
      normalizedQuery.includes("registration deadline") ||
      normalizedQuery.includes("last date to register");

    if (isDeadline) {
      intent = "HACKATHON_DEADLINE";
      confidence = 0.95;
    }
  }

  if (intent === "GENERIC_FALLBACK") {
    // Best Hackathon
    const isBestHackathon =
      /\bwhich\s+(hackathon)?\s*(is\s+)?(the\s+)?best\b/i.test(normalizedQuery) ||
      /\bwhich\s+one\s+(is\s+)?best\b/i.test(normalizedQuery) ||
      normalizedQuery.includes("which hackathon should i") ||
      normalizedQuery.includes("which hackathon should i participate") ||
      normalizedQuery.includes("which hackathon should i join") ||
      normalizedQuery.includes("which hackathon is best") ||
      normalizedQuery.includes("which hackathon best") ||
      normalizedQuery === "best hackathon for me" ||
      normalizedQuery.includes("best hackathon for") ||
      normalizedQuery.includes("which one best") ||
      normalizedQuery.includes("suggest best hackathon") ||
      ((normalizedQuery === "which one is best" || normalizedQuery === "which is the best" || normalizedQuery === "which one best") && Boolean(previousHackathons));

    if (isBestHackathon) {
      intent = "RECOMMEND_BEST_HACKATHON";
      confidence = 0.95;
    }
  }

  if (intent === "GENERIC_FALLBACK") {
    // Hackathon Search
    const isHackathonDiscovery =
      normalizedQuery.includes("find hackathon") ||
      normalizedQuery.includes("show me hackathon") ||
      normalizedQuery.includes("suggest hackathon") ||
      normalizedQuery.includes("recommend hackathon") ||
      normalizedQuery.includes("find online");

    if (isHackathonDiscovery) {
      intent = "HACKATHON_SEARCH";
      confidence = 0.9;
    }
  }

  if (intent === "GENERIC_FALLBACK") {
    if (/\b(hi|hello|hey)\b/i.test(normalizedQuery)) {
      intent = "GREETING";
      confidence = 0.9;
    }
  }

  return {
    intent,
    rawQuery,
    normalizedQuery,
    entities: {
      skill: extractedSkill,
      hackathonName: extractedHackName,
    },
    contextReference: {
      previousHackathons,
      previousSelectedHackathon,
      previousTeammates,
      previousSelectedTeammate,
    },
    confidence,
  };
}

/**
 * Intelligent Fallback Response Generator
 */
function generateFallbackResponse(messages, context) {
  // Always extract the actual user prompt from the conversation history
  const userMsgObj = [...messages].reverse().find((m) => m.role === "user");
  const userMessage = userMsgObj?.content || "";
  
  // Natural Language Query Understanding & Normalization Step
  const queryAnalysis = understandUserQuery(userMessage, messages, context);
  const lowerMsg = queryAnalysis.normalizedQuery || (typeof userMessage === "string" ? userMessage.toLowerCase() : "");

  // Extract structured agent conversation context & entity tracking (Phase 6)
  const structuredContext = extractStructuredContext(messages, context);

  // 1. Context Reset Command Handling
  if (isContextResetCommand(userMessage)) {
    return {
      text: "Context cleared! How can I help you start fresh?",
      pendingAction: null,
    };
  }

  // 2. Developer / Debug Representation (Requirement #20)
  if (lowerMsg === "debug context" || lowerMsg === "show debug context" || context?.debug || context?.showDebugContext) {
    const activeHack = structuredContext.selectedHackathon || (structuredContext.previousHackathons ? structuredContext.previousHackathons[0] : null);
    const activeHackTitle = activeHack ? (activeHack.title || activeHack.name) : "None";
    const activeHackId = activeHack ? (activeHack.id || activeHack._id) : "None";

    return {
      text: `Intent:\n${queryAnalysis.intent}\n\nSelected Hackathon:\n${activeHackTitle}\nID:\n${activeHackId}\n\nReferenced Entity:\n${structuredContext.selectedHackathon ? "selectedHackathon" : "previousHackathons"}\n\nConfidence:\n${queryAnalysis.confidence}`,
      debugContext: {
        intent: queryAnalysis.intent,
        selectedHackathonId: activeHackId,
        selectedHackathonTitle: activeHackTitle,
        referencedEntity: structuredContext.selectedHackathon ? "selectedHackathon" : "previousHackathons",
        confidence: queryAnalysis.confidence,
      },
    };
  }

  // 3. Ambiguity Resolution (CRITICAL RULE #6)
  const ambiguity = checkAmbiguousReference(userMessage, structuredContext);
  if (ambiguity.isAmbiguous) {
    if (ambiguity.entityType === "hackathon" && Array.isArray(ambiguity.candidates)) {
      const names = ambiguity.candidates.slice(0, 3).map((h) => h.title || h.name).join(" or ");
      return {
        text: `Which hackathon do you mean — ${names}?`,
      };
    }
    if (ambiguity.entityType === "teammate" && Array.isArray(ambiguity.candidates)) {
      const names = ambiguity.candidates.slice(0, 3).map((t) => t.name).join(" or ");
      return {
        text: `Which teammate do you mean — ${names}?`,
      };
    }
  }

  let { previousTeammates, previousSelectedTeammate } = extractTeammateContextFromMessages(messages);
  const { previousHackathons, previousSelectedHackathon } = extractHackathonContextFromMessages(messages);

  let profileData = context.profileData || (context.userProfile ? { user: context.userProfile } : null);
  let searchData = context.searchData || null;
  let teammatesData = context.teammatesData || (context.teammates ? { teammates: context.teammates } : null);

  if (previousSelectedTeammate && (!previousSelectedTeammate.skills || previousSelectedTeammate.skills.length === 0)) {
    const candidatePool = teammatesData?.teammates || context?.teammatesData?.teammates || context?.teammates || [];
    const enriched = candidatePool.find(
      (c) =>
        (c.name && previousSelectedTeammate.name && c.name.toLowerCase() === previousSelectedTeammate.name.toLowerCase()) ||
        (c.userId && previousSelectedTeammate.userId && String(c.userId) === String(previousSelectedTeammate.userId))
    );
    if (enriched) {
      previousSelectedTeammate = enriched;
    }
  }
  let hackathonDetailsData = context.hackathonDetailsData || null;
  let networkData = context.networkData || null;
  let sendConnectionResult = null;
  let acceptConnectionResult = null;
  let createTeamResult = null;
  let inviteToTeamResult = null;
  let activePendingAction = context.pendingAction || null;

  for (const m of messages) {
    if (m.pendingAction) {
      activePendingAction = m.pendingAction;
    }
    if (m.recommendations && Array.isArray(m.recommendations.teammates) && m.recommendations.teammates.length > 0) {
      if (!teammatesData || !Array.isArray(teammatesData.teammates) || teammatesData.teammates.length === 0) {
        teammatesData = { teammates: m.recommendations.teammates };
      }
    }
    if (m.role === "tool") {
      let data = null;
      try {
        data = typeof m.content === "object" ? m.content : JSON.parse(m.content);
      } catch {
        data = null;
      }

      if (m.name === "get_my_profile" || (data && data.user)) {
        profileData = data;
      }
      if (m.name === "search_hackathons" || (data && data.hackathons !== undefined)) {
        searchData = data;
      }
      if (m.name === "find_teammates" || (data && data.teammates !== undefined)) {
        teammatesData = data;
      }
      if (m.name === "get_hackathon_details" || (data && data.hackathon !== undefined)) {
        hackathonDetailsData = data;
      }
      if (m.name === "get_my_network" || (data && data.connections !== undefined)) {
        networkData = data;
      }
      if (m.name === "send_connection_request" || (data && data.action === "send_connection_request")) {
        sendConnectionResult = data;
      }
      if (m.name === "accept_connection_request" || (data && data.action === "accept_connection_request")) {
        acceptConnectionResult = data;
      }
      if (m.name === "create_team" || (data && data.action === "create_team")) {
        createTeamResult = data;
      }
      if (m.name === "invite_to_team" || (data && data.action === "invite_to_team")) {
        inviteToTeamResult = data;
      }
    }
  }

  // --- PHASE 5: AGENTIC ACTIONS RESULTS SYNTHESIS ---
  const lastMsgObj = Array.isArray(messages) && messages.length > 0 ? messages[messages.length - 1] : null;
  const isToolResponseTurn = lastMsgObj && lastMsgObj.role === "tool";

  if (isToolResponseTurn) {
    if (sendConnectionResult) {
      if (sendConnectionResult.success) {
        return {
          text: `Connection request sent to **${sendConnectionResult.targetName || "the user"}**.`,
          pendingAction: null,
        };
      }
      if (sendConnectionResult.reason === "already_pending") {
        return {
          text: `You have already sent a connection request to **${sendConnectionResult.targetName || "this user"}**.`,
          pendingAction: null,
        };
      }
      if (sendConnectionResult.reason === "incoming_request_exists") {
        return {
          text: `**${sendConnectionResult.targetName || "This user"}** has already sent you a connection request.`,
          pendingAction: null,
        };
      }
      if (sendConnectionResult.reason === "already_connected") {
        return {
          text: `You're already connected with **${sendConnectionResult.targetName || "this user"}**.`,
          pendingAction: null,
        };
      }
      if (sendConnectionResult.reason === "self_request") {
        return {
          text: "You can't send a connection request to yourself.",
          pendingAction: null,
        };
      }
      if (sendConnectionResult.reason === "profile_incomplete") {
        return {
          text: "Please complete your profile before connecting with other users.",
          pendingAction: null,
        };
      }
      if (sendConnectionResult.reason === "user_not_found") {
        return {
          text: "I couldn't find that getHack user.",
          pendingAction: null,
        };
      }
      return {
        text: sendConnectionResult.message || "I couldn't send the connection request right now. Please try again.",
        pendingAction: null,
      };
    }

    if (acceptConnectionResult) {
      if (acceptConnectionResult.success) {
        return {
          text: `Connection request from **${acceptConnectionResult.targetName || acceptConnectionResult.partnerName || "the user"}** accepted! You are now connected.`,
          pendingAction: null,
        };
      }
      if (acceptConnectionResult.reason === "already_connected") {
        return {
          text: `You're already connected with **${acceptConnectionResult.partnerName || "this user"}**.`,
          pendingAction: null,
        };
      }
      if (acceptConnectionResult.reason === "request_not_found") {
        return {
          text: "I couldn't find a pending connection request from that user.",
          pendingAction: null,
        };
      }
      return {
        text: acceptConnectionResult.message || "I couldn't accept the connection request right now. Please try again.",
        pendingAction: null,
      };
    }

    if (createTeamResult) {
      if (createTeamResult.success) {
        return {
          text: `Team **${createTeamResult.team?.teamName || "Squad"}** created successfully for ${createTeamResult.team?.hackathonName || "your hackathon"}!`,
          pendingAction: null,
        };
      }
      return {
        text: createTeamResult.message || "I couldn't create the team right now. Please try again.",
        pendingAction: null,
      };
    }

    if (inviteToTeamResult) {
      if (inviteToTeamResult.success) {
        return {
          text: `Team invitation sent to **${inviteToTeamResult.receiverName || "the candidate"}** for team **${inviteToTeamResult.teamName || "your team"}**.`,
          pendingAction: null,
        };
      }
      return {
        text: inviteToTeamResult.message || "I couldn't send the team invitation right now. Please try again.",
        pendingAction: null,
      };
    }
  }

  if (inviteToTeamResult) {
    if (inviteToTeamResult.success) {
      return {
        text: `Team invitation sent to **${inviteToTeamResult.receiverName || "the candidate"}** for team **${inviteToTeamResult.teamName || "your team"}**.`,
        pendingAction: null,
      };
    }
    return {
      text: inviteToTeamResult.message || "I couldn't send the team invitation right now. Please try again.",
      pendingAction: null,
    };
  }

  // --- CONFIRMATION PROTOCOL & PENDING ACTION DISPATCH ---

  if (activePendingAction) {
    const isPositiveConfirm =
      lowerMsg === "yes" ||
      lowerMsg === "yeah" ||
      lowerMsg === "yep" ||
      lowerMsg === "sure" ||
      lowerMsg === "do it" ||
      lowerMsg === "go ahead" ||
      lowerMsg === "send it" ||
      lowerMsg === "send request" ||
      lowerMsg === "send requests" ||
      lowerMsg === "confirm" ||
      lowerMsg === "okay" ||
      lowerMsg === "yes please" ||
      lowerMsg === "create it" ||
      lowerMsg === "invite them" ||
      lowerMsg === "accept it" ||
      lowerMsg === "accept" ||
      lowerMsg.startsWith("yes") ||
      lowerMsg.includes("confirm") ||
      lowerMsg.includes("send request") ||
      lowerMsg.includes("send requests") ||
      lowerMsg.includes("do it") ||
      lowerMsg.includes("go ahead") ||
      lowerMsg.includes("create it") ||
      lowerMsg.includes("accept it") ||
      lowerMsg.includes("invite them");

    const isNegativeCancel =
      lowerMsg === "no" ||
      lowerMsg === "nope" ||
      lowerMsg === "cancel" ||
      lowerMsg === "don't do it" ||
      lowerMsg === "dont do it" ||
      lowerMsg === "not now" ||
      lowerMsg === "stop" ||
      lowerMsg.includes("cancel") ||
      lowerMsg.includes("dont send") ||
      lowerMsg.includes("don't send") ||
      lowerMsg.includes("dont create") ||
      lowerMsg.includes("don't create");

    if (isNegativeCancel) {
      const actionLabel = activePendingAction.type ? activePendingAction.type.replace(/_/g, " ") : "action";
      return {
        text: `Action (${actionLabel}) canceled.`,
        pendingAction: null,
      };
    }

    // Check for target user change before confirmation (e.g. "Actually connect me with UI Designer instead")
    const isTargetChange =
      (lowerMsg.includes("connect with") || lowerMsg.includes("connect me with") || lowerMsg.includes("instead")) &&
      !isPositiveConfirm &&
      !lowerMsg.includes("yes");

    if (!isTargetChange && isPositiveConfirm) {
      if (activePendingAction.type === "send_connection_request") {
        return {
          toolCalls: [
            {
              name: "send_connection_request",
              args: { targetUserId: activePendingAction.targetUserId },
            },
          ],
          pendingAction: null,
        };
      }

      if (activePendingAction.type === "send_team_connection_requests") {
        const targetUserIds = activePendingAction.targetUserIds || [];
        const toolCalls = targetUserIds.map((id) => ({
          name: "send_connection_request",
          args: { targetUserId: id },
        }));
        return {
          toolCalls: toolCalls.length > 0 ? toolCalls : [{ name: "send_connection_request", args: { targetUserId: activePendingAction.targetUserId } }],
          pendingAction: null,
        };
      }

      if (activePendingAction.type === "accept_connection_request") {
        return {
          toolCalls: [
            {
              name: "accept_connection_request",
              args: {
                targetUserId: activePendingAction.targetUserId,
                connectionId: activePendingAction.connectionId,
              },
            },
          ],
          pendingAction: null,
        };
      }

      if (activePendingAction.type === "create_team") {
        return {
          toolCalls: [
            {
              name: "create_team",
              args: {
                teamName: activePendingAction.teamName || "Hackathon Squad",
                hackathonName: activePendingAction.hackathonName || "Hackathon Challenge",
                pendingInvitationIds: activePendingAction.pendingInvitationIds || [],
              },
            },
          ],
          pendingAction: null,
        };
      }

      if (activePendingAction.type === "invite_to_team") {
        return {
          toolCalls: [
            {
              name: "invite_to_team",
              args: {
                teamId: activePendingAction.teamId,
                receiverId: activePendingAction.receiverId,
                receiverName: activePendingAction.receiverName,
              },
            },
          ],
          pendingAction: null,
        };
      }
    }
  }

  // --- EXTERNAL REGISTRATION SAFETY INTENT ---
  const isExternalRegQuery =
    lowerMsg.includes("register me for") ||
    lowerMsg.includes("register for hackathon") ||
    lowerMsg.includes("apply for hackathon") ||
    lowerMsg.startsWith("register for") ||
    lowerMsg.startsWith("apply for");

  if (isExternalRegQuery) {
    const refHack = previousSelectedHackathon || (previousHackathons ? previousHackathons[0] : null);
    const regUrl = refHack?.registrationUrl || refHack?.url || "https://gethack.com/hackathons";
    const hackTitle = refHack ? (refHack.title || refHack.name) : "the hackathon";
    return {
      text: `I can't complete external registration directly from getHack. You can continue through the official registration page for **${hackTitle}**: ${regUrl}`,
    };
  }

  // --- ACCEPT CONNECTION REQUEST INTENT ---
  const isAcceptReqQuery =
    lowerMsg.includes("accept connection") ||
    lowerMsg.includes("accept request") ||
    lowerMsg.includes("accept the connection") ||
    lowerMsg.includes("accept current request") ||
    (lowerMsg.startsWith("accept ") && (lowerMsg.includes("request") || lowerMsg.includes("connection")));

  if (isAcceptReqQuery) {
    if (!networkData) {
      return { toolCalls: [{ name: "get_my_network", args: {} }] };
    }
    const incomingReqs = networkData.incoming || [];
    if (incomingReqs.length === 0) {
      return { text: "You don't have any pending incoming connection requests right now." };
    }

    let targetNameInMsg = userMessage.replace(/accept|connection|request|the|from|'s/gi, "").trim();
    let targetReq = null;
    if (targetNameInMsg) {
      targetReq = incomingReqs.find((r) => r.name && r.name.toLowerCase().includes(targetNameInMsg.toLowerCase()));
    }
    if (!targetReq) {
      targetReq = incomingReqs[0];
    }

    return {
      text: `Would you like me to accept the connection request from **${targetReq.name}**?`,
      pendingAction: {
        type: "accept_connection_request",
        targetUserId: targetReq.senderId || targetReq.userId || targetReq.id,
        connectionId: targetReq.requestId || targetReq.id,
        targetName: targetReq.name,
      },
    };
  }

  // --- CREATE TEAM INTENT ---
  const isCreateTeamReqQuery =
    lowerMsg.includes("create this team") ||
    (lowerMsg.includes("create team") && !lowerMsg.includes("who")) ||
    lowerMsg.includes("make this team") ||
    lowerMsg.includes("create a team with");

  if (isCreateTeamReqQuery) {
    const refHack = previousSelectedHackathon || (previousHackathons ? previousHackathons[0] : null);
    const hackTitle = refHack ? (refHack.title || refHack.name) : "Hackathon Challenge";
    const candidates = teammatesData?.teammates || previousTeammates || [];
    const candidateNamesStr = candidates.slice(0, 2).map((c) => c.name).join(" and ");
    const candidateIds = candidates.slice(0, 2).map((c) => c.userId || c.id || c._id);
    const teamName = `${hackTitle} Squad`;

    const membersDesc = candidateNamesStr ? ` with **${candidateNamesStr}**` : "";
    return {
      text: `Would you like me to create the team '**${teamName}**' for **${hackTitle}**${membersDesc}?`,
      pendingAction: {
        type: "create_team",
        teamName,
        hackathonName: hackTitle,
        pendingInvitationIds: candidateIds,
      },
    };
  }

  // --- INVITE TO TEAM INTENT ---
  const isInviteToTeamQuery =
    lowerMsg.includes("invite") && (lowerMsg.includes("to my team") || lowerMsg.includes("to team"));

  if (isInviteToTeamQuery) {
    let targetNameInMsg = userMessage.replace(/invite|to my team|to team|to the team|add/gi, "").trim();
    let targetCand = null;
    const candidatesPool = teammatesData?.teammates || (previousSelectedTeammate ? [previousSelectedTeammate] : null) || previousTeammates;

    if (candidatesPool && Array.isArray(candidatesPool)) {
      targetCand = candidatesPool.find((c) => c.name && targetNameInMsg && c.name.toLowerCase().includes(targetNameInMsg.toLowerCase()));
      if (!targetCand && (candidatesPool.length === 1 || lowerMsg.includes("him") || lowerMsg.includes("her") || lowerMsg.includes("them") || !targetNameInMsg)) {
        targetCand = previousSelectedTeammate || candidatesPool[0];
      }
    }

    if (!targetCand) {
      return { text: "Which teammate would you like to invite to your team?" };
    }

    const candName = targetCand.name;
    const candId = targetCand.userId || targetCand.id || targetCand._id;
    const sampleTeamId = "team_active_1";
    const sampleTeamName = "Hackathon Squad";

    return {
      text: `Would you like me to invite **${candName}** to your team '**${sampleTeamName}**'?`,
      pendingAction: {
        type: "invite_to_team",
        teamId: sampleTeamId,
        receiverId: candId,
        receiverName: candName,
      },
    };
  }

  // 4. Explicit Hackathon Selection Command
  const isExplicitHackathonSelection =
    /^(?:select|choose|pick|switch\s+to|i\s+want|show\s+details\s+for)\s+(?:the\s+)?(.+)$/i.test(lowerMsg) &&
    !lowerMsg.includes("teammate") &&
    !lowerMsg.includes("candidate") &&
    !lowerMsg.includes("user");

  if (isExplicitHackathonSelection && (previousHackathons || structuredContext.previousHackathons)) {
    const hackList = previousHackathons || structuredContext.previousHackathons || [];
    const targetTerm = userMessage
      .replace(/^(?:select|choose|pick|switch\s+to|i\s+want|show\s+details\s+for)\s+(?:the\s+)?/gi, "")
      .replace(/hackathon|event|competition/gi, "")
      .replace(/[?.!]/g, "")
      .trim();

    let matchedHackathon = null;
    const ordinals = extractOrdinalIndices(targetTerm, hackList.length);
    if (ordinals.length > 0) {
      matchedHackathon = hackList[ordinals[0]];
    }

    if (!matchedHackathon && targetTerm) {
      const targetLow = targetTerm.toLowerCase();
      if (targetLow === "a" || targetLow === "hackathon a") matchedHackathon = hackList[0];
      else if (targetLow === "b" || targetLow === "hackathon b") matchedHackathon = hackList[1];
      else if (targetLow === "c" || targetLow === "hackathon c") matchedHackathon = hackList[2];
      else {
        matchedHackathon = hackList.find(
          (h) =>
            (h.title && h.title.toLowerCase().includes(targetLow)) ||
            (h.name && h.name.toLowerCase().includes(targetLow))
        );
      }
    }

    if (matchedHackathon) {
      return {
        text: `Selected **${matchedHackathon.title || matchedHackathon.name}**. What would you like to know about it? You can ask for required skills, skill gap, or find teammates.`,
        recommendations: { hackathons: [matchedHackathon] },
      };
    }
  }

  // --- CONNECT INTENT (SEND CONNECTION REQUEST) ---
  let extractedDirectName = extractTargetUserNameFromMessage(userMessage) || extractTargetUserNameFromMessage(queryAnalysis.normalizedQuery);

  const isPronounConnect =
    /\b(connect\s+me\s+with|connect\s+with|send\s+(a\s+)?connection\s+request\s+to|send\s+req\s+to|i\s+want\s+to\s+connect\s+with|connect\s+me\s+wid)\s+(him|her|them|this\s+teammate|that\s+teammate|this\s+user|that\s+user|this\s+person|the\s+selected\s+teammate|the\s+best\s+teammate)\b/i.test(lowerMsg);

  if (isPronounConnect && !extractedDirectName) {
    const candidate = previousSelectedTeammate || (previousTeammates ? previousTeammates[0] : null);
    if (candidate && candidate.name) {
      extractedDirectName = candidate.name;
    }
  }

  const isDirectConnect = queryAnalysis.intent === "DIRECT_CONNECT_USER" || isPronounConnect || Boolean(extractedDirectName);

  const isConnectIntent =
    isDirectConnect ||
    lowerMsg.startsWith("connect with") ||
    lowerMsg.startsWith("send connection request") ||
    lowerMsg.startsWith("connect to") ||
    lowerMsg.startsWith("send requests to") ||
    lowerMsg.startsWith("invite ") ||
    (lowerMsg.includes("connect") && !lowerMsg.includes("network") && !lowerMsg.includes("how") && !lowerMsg.includes("discovers"));

  if (isConnectIntent) {
    const userProfile = context.userProfile || (profileData?.user ? profileData.user : profileData) || {};
    const currentUserId = userProfile.id || userProfile._id || userProfile.userId;
    const currentUserName = userProfile.name || "";

    // 1. Self-Connection Check
    const isSelfByKeyword =
      lowerMsg.includes("connect me with myself") ||
      lowerMsg.includes("connect with myself") ||
      (extractedDirectName && extractedDirectName.toLowerCase() === "myself");

    const isSelfByName =
      extractedDirectName &&
      currentUserName &&
      extractedDirectName.toLowerCase().trim() === currentUserName.toLowerCase().trim();

    if (isSelfByKeyword || isSelfByName) {
      return {
        text: "You can't send a connection request to yourself.",
      };
    }

    const candidatesForConnect = teammatesData?.teammates || (previousSelectedTeammate ? [previousSelectedTeammate] : null) || (previousTeammates ? previousTeammates : null) || (networkData?.connections ? networkData.connections : null);

    // Direct Name Matching (Explicit Direct Connection Request)
    if (extractedDirectName) {
      let matchingCandidates = [];
      if (candidatesForConnect && Array.isArray(candidatesForConnect)) {
        matchingCandidates = findMatchingUsersByName(candidatesForConnect, extractedDirectName);
      }

      // Check if direct find_teammates search was already executed for this target name
      const hasSearchedForName = Array.isArray(messages) && messages.some((m) => {
        if (m.role === "tool" && m.name === "find_teammates") {
          let content = m.content;
          if (typeof content === "string") {
            try { content = JSON.parse(content); } catch (e) {}
          }
          if (content && content.searchArgs && content.searchArgs.query) {
            return String(content.searchArgs.query).toLowerCase().trim() === extractedDirectName.toLowerCase().trim();
          }
        }
        return false;
      });

      if (matchingCandidates.length === 0 && !hasSearchedForName) {
        return {
          toolCalls: [
            {
              name: "find_teammates",
              args: {
                query: extractedDirectName,
                limit: 50,
                availability: "all",
                matchMode: "all",
              },
            },
          ],
        };
      }

      // A. Target user not found (only after executing direct DB search)
      if (matchingCandidates.length === 0) {
        return {
          text: `I couldn't find a getHack user named ${extractedDirectName}.`,
        };
      }

      // B. Multiple matching users -> Disambiguation
      if (matchingCandidates.length > 1) {
        return {
          text: `I found multiple users named ${extractedDirectName}. Which one do you mean?`,
          recommendations: { teammates: matchingCandidates },
        };
      }

      // C. Exactly 1 matching candidate
      const targetCandidate = matchingCandidates[0];
      const candidateId = targetCandidate.userId || targetCandidate.id || targetCandidate._id;
      const candidateName = targetCandidate.name;

      if (currentUserId && candidateId && String(currentUserId) === String(candidateId)) {
        return {
          text: "You can't send a connection request to yourself.",
        };
      }

      if (targetCandidate.connectionStatus === "connected" || targetCandidate.isConnected) {
        return {
          text: `You're already connected with **${candidateName}**.`,
          recommendations: { teammates: [targetCandidate] },
        };
      }
      if (targetCandidate.connectionStatus === "request_sent" || targetCandidate.isPending) {
        return {
          text: `You have already sent a connection request to **${candidateName}**.`,
          recommendations: { teammates: [targetCandidate] },
        };
      }
      if (targetCandidate.connectionStatus === "incoming_request" || targetCandidate.isIncoming) {
        return {
          text: `**${candidateName}** has already sent you a connection request.`,
          recommendations: { teammates: [targetCandidate] },
        };
      }
      if (targetCandidate.connectionStatus === "blocked" || targetCandidate.isBlocked) {
        return {
          text: "I can't send a connection request to this user.",
        };
      }

      return {
        text: `Would you like me to send a connection request to **${candidateName}**?`,
        pendingAction: {
          type: "send_connection_request",
          targetUserId: candidateId,
          targetName: candidateName,
        },
        recommendations: { teammates: [targetCandidate] },
      };
    }

    const ordinals = extractOrdinalIndices(userMessage, candidatesForConnect ? candidatesForConnect.length : 0);

    // Multi-candidate ordinal target resolution (e.g. "Connect me with the first two", "Send requests to those two", "Invite the second and third person")
    if (ordinals.length > 1 && candidatesForConnect) {
      const selectedTargetCandidates = ordinals.map((idx) => candidatesForConnect[idx]).filter(Boolean);
      if (selectedTargetCandidates.length > 0) {
        const targetUserIds = selectedTargetCandidates.map((t) => t.userId || t.id || t._id);
        const targetNames = selectedTargetCandidates.map((t) => t.name);
        const namesStr = targetNames.join(" and ");

        return {
          text: `Would you like me to send connection requests to **${namesStr}**?`,
          pendingAction: {
            type: "send_team_connection_requests",
            targetUserIds,
            targetNames,
          },
        };
      }
    }

    // Name-based multi-candidate matching (e.g. "Invite Py Dev and UI Designer")
    if (candidatesForConnect && Array.isArray(candidatesForConnect) && (lowerMsg.includes(" and ") || lowerMsg.includes(","))) {
      const matchedByName = candidatesForConnect.filter((c) => c.name && lowerMsg.includes(c.name.toLowerCase()));
      if (matchedByName.length > 1) {
        const targetUserIds = matchedByName.map((t) => t.userId || t.id || t._id);
        const targetNames = matchedByName.map((t) => t.name);
        const namesStr = targetNames.join(" and ");

        return {
          text: `Would you like me to send connection requests to **${namesStr}**?`,
          pendingAction: {
            type: "send_team_connection_requests",
            targetUserIds,
            targetNames,
          },
        };
      }
    }

    let targetCandidate = null;

    if (ordinals.length === 1 && candidatesForConnect) {
      targetCandidate = candidatesForConnect[ordinals[0]];
    }

    let targetNameInMsg = extractedDirectName;
    if (!targetNameInMsg) {
      if (lowerMsg.includes("py dev")) targetNameInMsg = "Py Dev";
      else if (lowerMsg.includes("ui designer")) targetNameInMsg = "UI Designer";
      else {
        targetNameInMsg = userMessage
          .replace(/connect me with|connect with|send a connection request to|send connection request to|connect to|connect|send requests to|invite|me with/gi, "")
          .trim();
        if (/^(him|her|them|this teammate|that teammate|this user|that user|this person)$/i.test(targetNameInMsg)) {
          targetNameInMsg = "";
        }
      }
    }

    if (!targetCandidate && candidatesForConnect && Array.isArray(candidatesForConnect)) {
      targetCandidate = candidatesForConnect.find(
        (t) =>
          (t.name && targetNameInMsg && t.name.toLowerCase() === targetNameInMsg.toLowerCase()) ||
          (t.name && targetNameInMsg && t.name.toLowerCase().includes(targetNameInMsg.toLowerCase()))
      );
      if (!targetCandidate && (candidatesForConnect.length === 1 || lowerMsg.includes("them") || lowerMsg.includes("this teammate") || lowerMsg.includes("him") || lowerMsg.includes("her") || !targetNameInMsg)) {
        targetCandidate = previousSelectedTeammate || candidatesForConnect[0];
      }
    }

    if (targetCandidate) {
      const candidateId = targetCandidate.userId || targetCandidate.id || targetCandidate._id;
      const candidateName = targetCandidate.name;

      if (targetCandidate.connectionStatus === "connected" || targetCandidate.isConnected) {
        return {
          text: `You're already connected with **${candidateName}**.`,
          recommendations: { teammates: [targetCandidate] },
        };
      }
      if (targetCandidate.connectionStatus === "request_sent" || targetCandidate.isPending) {
        return {
          text: `You have already sent a connection request to **${candidateName}**.`,
          recommendations: { teammates: [targetCandidate] },
        };
      }

      return {
        text: `Would you like me to send a connection request to **${candidateName}**?`,
        pendingAction: {
          type: "send_connection_request",
          targetUserId: candidateId,
          targetName: candidateName,
        },
      };
    }

    // If candidate list isn't cached yet, fetch candidates first to resolve
    if (targetNameInMsg) {
      return {
        toolCalls: [
          {
            name: "find_teammates",
            args: {
              skills: ["Python", "Machine Learning", "UI/UX", "Developer"],
              availability: "all",
            },
          },
        ],
      };
    }
  }



  const userProfile = context.userProfile || (profileData?.user ? profileData.user : profileData) || {};

  // --- PHASE 4: AGENTIC TEAM BUILDER (BUILD_TEAM INTENT) ---

  const isBuildTeamQuery =
    queryAnalysis.intent === "BUILD_TEAM" ||
    /\b(build|make|create|suggest|form)\s+(a\s+|my\s+|the\s+)?(best\s+)?team\b/i.test(lowerMsg) ||
    /\bwho\s+should\s+be\s+on\s+my\s+team\b/i.test(lowerMsg) ||
    /\bwhat\s+teammates\s+should\s+i\s+choose\b/i.test(lowerMsg) ||
    /\bwhich\s+teammates\s+should\s+i\s+choose\b/i.test(lowerMsg) ||
    /\bfind\s+teammates\s+i\s+should\s+invite\b/i.test(lowerMsg) ||
    /\bhelp\s+me\s+find\s+a\s+team\b/i.test(lowerMsg) ||
    /\bmake\s+a\s+team\s+for\s+me\b/i.test(lowerMsg) ||
    /\bhelp\s+me\s+build\s+team\b/i.test(lowerMsg) ||
    lowerMsg.includes("build team") ||
    lowerMsg.includes("build my team") ||
    lowerMsg.includes("build a team") ||
    lowerMsg.includes("create a team") ||
    lowerMsg.includes("make a team") ||
    lowerMsg.includes("make team") ||
    lowerMsg.includes("suggest a team") ||
    lowerMsg.includes("best team for") ||
    lowerMsg.includes("who should be on my team") ||
    lowerMsg.includes("which teammates should i choose") ||
    lowerMsg.includes("what teammates should i choose") ||
    lowerMsg.includes("find teammates i should invite") ||
    lowerMsg.includes("which team would be best") ||
    lowerMsg.includes("which team best") ||
    lowerMsg.includes("help me make a team") ||
    lowerMsg === "best team for this hackathon" ||
    lowerMsg === "which team would be best";

  const isWhyTeamFollowUp =
    lowerMsg === "why" ||
    lowerMsg === "why?" ||
    lowerMsg.includes("why these teammates") ||
    lowerMsg.includes("why these people") ||
    lowerMsg.includes("why this team") ||
    lowerMsg.includes("why did you choose this team") ||
    lowerMsg.includes("why did you recommend this team") ||
    lowerMsg.includes("why these candidate");

  if (isWhyTeamFollowUp && (teammatesData?.teammates || previousTeammates)) {
    const pool = teammatesData?.teammates || previousTeammates;
    const refHack = previousSelectedHackathon || (previousHackathons ? previousHackathons[0] : null);
    const hackTitle = refHack ? (refHack.title || refHack.name) : "this hackathon";
    const userRole = userProfile.role || "Full Stack Developer";
    const userSkillsText = (userProfile.skills || ["React", "JavaScript"]).slice(0, 3).join(", ");

    const teammatesListText = pool.slice(0, 2).map((t) => {
      const tSkills = (t.skills || []).slice(0, 3).join(", ");
      return `• **${t.name}** (${t.role || "Developer"}) covers **${tSkills || "key technical"}** requirements.`;
    }).join("\n");

    return {
      text: `I recommended this team composition for **${hackTitle}** because:\n\n• **You (${userRole})** cover the web and backend development side (${userSkillsText}).\n${teammatesListText}\n\nTogether, the team covers the major skill areas required for **${hackTitle}** with minimal skill overlap.`,
      recommendations: { teammates: pool.slice(0, 2) },
    };
  }

  if (isBuildTeamQuery) {
    // 1. Context Resolution for Hackathon
    let refHackathon = previousSelectedHackathon || null;

    if (!refHackathon && context && context.hackathonId) {
      if (searchData && Array.isArray(searchData.hackathons)) {
        refHackathon = searchData.hackathons.find((h) => (h.id || h._id) === context.hackathonId);
      }
      if (!refHackathon && hackathonDetailsData && hackathonDetailsData.hackathon) {
        refHackathon = hackathonDetailsData.hackathon;
      }
    }

    if (!refHackathon && previousHackathons && Array.isArray(previousHackathons) && previousHackathons.length > 0) {
      const extractedHackName = extractHackathonNameFromMessage(userMessage);
      if (extractedHackName) {
        refHackathon = previousHackathons.find(
          (h) =>
            (h.title && h.title.toLowerCase().includes(extractedHackName.toLowerCase())) ||
            (h.name && h.name.toLowerCase().includes(extractedHackName.toLowerCase()))
        );
      }
      if (!refHackathon) {
        refHackathon = previousHackathons[0];
      }
    }

    if (!refHackathon && searchData && Array.isArray(searchData.hackathons) && searchData.hackathons.length > 0) {
      refHackathon = searchData.hackathons[0];
    }

    if (!refHackathon) {
      const extractedHackName = extractHackathonNameFromMessage(userMessage);
      if (extractedHackName) {
        refHackathon = {
          id: "hack_" + extractedHackName.toLowerCase().replace(/[^a-z0-9]/g, ""),
          title: extractedHackName.toLowerCase().includes("hackathon") ? extractedHackName : `${extractedHackName} Hackathon`,
          skills: ["AI", "Python", "Machine Learning", "UI/UX"],
          requiredSkills: ["AI", "Python", "Machine Learning", "UI/UX"],
        };
      }
    }

    // Requirement #3: If no hackathon is selected/found in context or message, ask user to select/name one!
    if (!refHackathon) {
      return {
        text: "Which hackathon are you building a team for?\nSelect a hackathon or tell me its name.",
      };
    }

    const availableCandidatePool = teammatesData?.teammates || previousTeammates || null;

    // 2. Fetch candidates if not present in context or tool output
    if (!availableCandidatePool) {
      const targetHackId = refHackathon.id || refHackathon._id;
      const toolCalls = [];
      if (!profileData) {
        toolCalls.push({ name: "get_my_profile", args: {} });
      }
      const searchArgs = {
        limit: 50,
        availability: "available",
        matchMode: "complementary",
      };
      if (targetHackId) {
        searchArgs.hackathonId = targetHackId;
      }
      toolCalls.push({ name: "find_teammates", args: searchArgs });
      return { toolCalls };
    }

    // 3. Build Team Composition from Real Data
    const teamComp = buildTeamComposition(availableCandidatePool, userProfile, refHackathon);
    const { hackTitle, userRole, selectedTeammates, rationaleLines } = teamComp;

    const teammateCardsText = selectedTeammates.map((t) => {
      const skillsStr = (t.skills || []).join(" · ");
      const statusStr = t.connectionStatus === "connected" ? "Connected" : t.connectionStatus === "request_sent" ? "Request Sent" : "Available";
      return `**${t.name}**\n${t.role || "Developer"}\n${skillsStr}\nStatus: ${statusStr}`;
    }).join("\n\n");

    const unconnectedCandidates = selectedTeammates.filter(
      (t) => t.connectionStatus !== "connected" && t.connectionStatus !== "request_sent" && !t.isConnected && !t.isPending
    );

    let actionPrompt = "";
    let pendingActionObj = null;

    if (unconnectedCandidates.length > 0) {
      const targetNamesStr = unconnectedCandidates.map((t) => t.name).join(" and ");
      actionPrompt = `\n\nWould you like me to send connection requests to **${targetNamesStr}**?`;
      pendingActionObj = {
        type: "send_team_connection_requests",
        targetUserIds: unconnectedCandidates.map((t) => t.userId || t.id || t._id),
        targetNames: unconnectedCandidates.map((t) => t.name),
      };
    } else {
      actionPrompt = "\n\nYour team members are already connected!";
    }

    const responseText = `I recommend this team for **${hackTitle}**:\n\n**YOUR ROLE**\n${userRole}\n\n**RECOMMENDED TEAMMATES**\n\n${teammateCardsText}\n\nI recommend this team because:\n\n${rationaleLines.join("\n")}\n\nTogether, the team covers the major skill areas required for **${hackTitle}** with minimal skill overlap.${actionPrompt}`;

    return {
      text: responseText,
      recommendations: { teammates: selectedTeammates },
      pendingAction: pendingActionObj,
    };
  }

  // Detect Teammate Discovery & Best Teammate Requests
  const isComplementaryRequest =
    lowerMsg.includes("complement") ||
    lowerMsg.includes("complementary") ||
    lowerMsg.includes("complements") ||
    lowerMsg.includes("fill my skill gap") ||
    lowerMsg.includes("skill gap") ||
    lowerMsg.includes("different skills");

  const isBestTeammateQuery =
    /\b(best|strongest|top)\s+(teammate|teammates|candidate|candidates|person)\b/i.test(lowerMsg) ||
    /\bwhich\s+(teammate|candidate|person)\s+(is\s+)?(the\s+)?(best|strongest)\b/i.test(lowerMsg) ||
    /\bwhich\s+(teammate|candidate|person)\s+should\s+i\s+(choose|pick|select|invite|team\s+up\s+with)\b/i.test(lowerMsg) ||
    /\bwho\s+is\s+(the\s+)?(best|strongest)\s+(teammate|candidate|person)\b/i.test(lowerMsg) ||
    /\bwho\s+would\s+be\s+(the\s+)?(best|strongest)\s+(teammate|candidate|person)\b/i.test(lowerMsg) ||
    /\brecommend\s+(the\s+)?(best|strongest)\s+(teammate|candidate|person)\b/i.test(lowerMsg) ||
    /\bfind\s+(me\s+)?(the\s+)?(best|strongest)\s+(teammate|candidate|person)\b/i.test(lowerMsg) ||
    /\bsuggest\s+(the\s+)?(best|strongest)\s+(teammate|candidate|person)\b/i.test(lowerMsg) ||
    /\bwho\s+should\s+i\s+(choose|pick|select|invite|team\s+up\s+with)\b/i.test(lowerMsg) ||
    /\bwho\s+should\s+i\s+team\s+up\s+with\b/i.test(lowerMsg) ||
    lowerMsg.includes("which teammate best") ||
    lowerMsg.includes("which teammate is best") ||
    lowerMsg.includes("which one best teammates") ||
    lowerMsg.includes("which one best teammate") ||
    lowerMsg.includes("best teammate for") ||
    lowerMsg.includes("who is the best teammate") ||
    lowerMsg.includes("who would be the strongest teammate") ||
    lowerMsg.includes("top teammate") ||
    lowerMsg.includes("give me your top teammate") ||
    lowerMsg.includes("give me your top candidate") ||
    (lowerMsg.includes("which one is best") && (lowerMsg.includes("teammate") || lowerMsg.includes("candidate") || lowerMsg.includes("person"))) ||
    (lowerMsg.includes("who is best") && (lowerMsg.includes("teammate") || lowerMsg.includes("candidate") || lowerMsg.includes("person"))) ||
    ((lowerMsg === "which one is best" || lowerMsg === "which is the best" || lowerMsg === "which one should i choose" || lowerMsg === "which one is best?") && Boolean(previousTeammates));

  const isTeammateRequest =
    isComplementaryRequest ||
    isBestTeammateQuery ||
    lowerMsg.includes("teammate") ||
    lowerMsg.includes("teammates") ||
    lowerMsg.includes("someone who") ||
    lowerMsg.includes("someone skilled") ||
    lowerMsg.includes("skilled in") ||
    lowerMsg.includes("good at") ||
    lowerMsg.includes("need an ml") ||
    lowerMsg.includes("need a frontend") ||
    lowerMsg.includes("need a ui") ||
    lowerMsg.includes("designer") ||
    lowerMsg.includes("ui/ux") ||
    lowerMsg.includes("complementary") ||
    lowerMsg.includes("show me details for") ||
    lowerMsg.includes("candidate") ||
    lowerMsg.includes("candidates") ||
    lowerMsg.includes("team up") ||
    lowerMsg.includes("who to work with") ||
    lowerMsg.includes("who can join") ||
    lowerMsg.includes("join my team") ||
    lowerMsg.includes("provide me best teammates") ||
    lowerMsg.includes("provide me teammates") ||
    lowerMsg.includes("suggest teammates") ||
    lowerMsg.includes("find teammates") ||
    lowerMsg.includes("which teammate") ||
    lowerMsg.includes("who should i choose") ||
    lowerMsg.includes("who should i team up with") ||
    lowerMsg.includes("why him") ||
    lowerMsg.includes("why her") ||
    (lowerMsg.startsWith("why") && Boolean(previousSelectedTeammate)) ||
    (Boolean(previousSelectedTeammate) && (lowerMsg.includes("he") || lowerMsg.includes("she") || lowerMsg.includes("his") || lowerMsg.includes("her") || lowerMsg.includes("him") || lowerMsg.includes("them") || lowerMsg.includes("this person") || lowerMsg.includes("tell me about")));

  if (isTeammateRequest) {
    const availableCandidatePool = teammatesData?.teammates || previousTeammates || null;

    // 1. Follow-up query on previously selected best teammate
    const isWhyTeammateFollowUp =
      lowerMsg === "why" ||
      lowerMsg === "why?" ||
      lowerMsg.includes("why is this teammate best") ||
      lowerMsg.includes("why this teammate") ||
      lowerMsg.includes("why did you choose") ||
      (lowerMsg.startsWith("why ") && Boolean(previousSelectedTeammate));

    if (isWhyTeammateFollowUp && previousSelectedTeammate) {
      const skillsList = previousSelectedTeammate.skills?.join(", ") || "their domain expertise";
      const userSkillsText = Array.isArray(userProfile.skills) && userProfile.skills.length > 0 ? userProfile.skills.slice(0, 3).join(", ") : "your background";
      return {
        text: `**${previousSelectedTeammate.name}** was selected because their **${skillsList}** expertise provides the strongest complementary match for your profile (${userSkillsText}) and project goals.`,
        recommendations: { teammates: [previousSelectedTeammate] },
      };
    }

    const isTeammateSkillFollowUp =
      lowerMsg.includes("what skills") ||
      lowerMsg.includes("his skills") ||
      lowerMsg.includes("her skills") ||
      lowerMsg.includes("their skills") ||
      lowerMsg.includes("specializes in") ||
      lowerMsg.includes("specialise in") ||
      lowerMsg.includes("what does this teammate");

    if (isTeammateSkillFollowUp && previousSelectedTeammate) {
      const skillsList = previousSelectedTeammate.skills?.join(", ") || "General Software Development";
      return {
        text: `**${previousSelectedTeammate.name}** (${previousSelectedTeammate.role || "Developer"}) specializes in: **${skillsList}**.`,
        recommendations: { teammates: [previousSelectedTeammate] },
      };
    }

    const isTeammateProfileFollowUp =
      lowerMsg === "show their profile" ||
      lowerMsg === "show profile" ||
      lowerMsg.includes("show profile of") ||
      lowerMsg.includes("tell me about him") ||
      lowerMsg.includes("tell me about her") ||
      lowerMsg.includes("tell me about them") ||
      lowerMsg.includes("tell me about this user") ||
      lowerMsg.includes("tell me about this teammate") ||
      lowerMsg.includes("tell me about this person");

    if (isTeammateProfileFollowUp && previousSelectedTeammate) {
      const roleStr = previousSelectedTeammate.role || "Developer";
      const skillsStr = previousSelectedTeammate.skills?.join(", ") || "General";
      const bioStr = previousSelectedTeammate.bio || "No bio provided.";
      return {
        text: `Here are the profile details for **${previousSelectedTeammate.name}** (${roleStr}):\n\n• Skills: ${skillsStr}\n• Bio: ${bioStr}`,
        recommendations: { teammates: [previousSelectedTeammate] },
      };
    }

    // Direct candidate profile lookup ("Show me details for candidate Py Dev")
    if (lowerMsg.includes("show me details for") || lowerMsg.includes("profile of") || lowerMsg.includes("details for candidate")) {
      if (!availableCandidatePool) {
        return {
          toolCalls: [
            {
              name: "find_teammates",
              args: {
                limit: 50,
                availability: "available",
                matchMode: "all",
              },
            },
          ],
        };
      } else {
        const cleanedName = userMessage.replace(/show me details for candidate|show me details for teammate|show me details for|profile of|candidate|teammate/gi, "").replace(/[?.!]/g, "").trim();
        const matched = availableCandidatePool.find(c => c.name && cleanedName && c.name.toLowerCase().includes(cleanedName.toLowerCase()));
        if (matched) {
          return {
            text: `Here are the details for **${matched.name}** (${matched.role || "Developer"}):\n\n• Skills: ${matched.skills?.join(", ") || "General"}\n• Bio: ${matched.bio || "No bio provided."}`,
            recommendations: { teammates: [matched] },
          };
        }
      }
    }

    // Network connections teammate request
    if (lowerMsg.includes("network") || lowerMsg.includes("my connections")) {
      if (!networkData) {
        return {
          toolCalls: [{ name: "get_my_network", args: {} }],
        };
      }
      const connections = networkData.connections || networkData.teammates || [];
      if (connections.length === 0) {
        return {
          text: "I checked your network, but you don't have any connected teammates available at this time. Try searching for open candidates!",
        };
      }
      return {
        text: `I found ${connections.length} teammate${connections.length > 1 ? "s" : ""} from your network:\n\n${connections.map((c, i) => `${i + 1}. **${c.name}** — ${c.role} (${c.skills?.join(", ") || "General"})`).join("\n")}`,
        recommendations: { teammates: connections },
      };
    }

    // 0. SHOW_MORE_TEAMMATES Pagination Continuation Handler
    const isShowMoreTeammatesQuery =
      queryAnalysis.intent === "SHOW_MORE_TEAMMATES" ||
      /\b(show|find|give|get|fetch|see)\s+(me\s+)?(more|next)\s+(teammates?|candidates?|users?|people|teemmates?|teamates?)\b/i.test(lowerMsg) ||
      /\b(more|next)\s+(teammates?|candidates?|users?|people|teemmates?|teamates?)\b/i.test(lowerMsg) ||
      /\b(give\s+me\s+more|show\s+some\s+more\s+users|show\s+more\s+users|show\s+more|get\s+more)\b/i.test(lowerMsg) ||
      lowerMsg === "more teammates" ||
      lowerMsg === "show more" ||
      lowerMsg === "give me more" ||
      lowerMsg === "show more teammates" ||
      lowerMsg === "show me more teammates" ||
      lowerMsg === "show me more teemmates" ||
      lowerMsg === "show more teamates";

    if (isShowMoreTeammatesQuery) {
      const searchContext = extractTeammateSearchContext(messages);
      const extractedSkill = searchContext.activeSkills[0] || extractSkillFromMessage(userMessage);
      const refHackathon = previousSelectedHackathon || (previousHackathons && previousHackathons[0]) || null;
      const targetHackId = searchContext.activeHackathonId || context?.hackathonId || (refHackathon ? (refHackathon.id || refHackathon._id) : null);

      if (!isToolResponseTurn || !teammatesData) {
        let matchMode = searchContext.activeMatchMode || "all";
        if (extractedSkill && targetHackId) matchMode = "skill_and_hackathon";
        else if (extractedSkill) matchMode = "skill";
        else if (targetHackId) matchMode = "hackathon";

        const searchArgs = {
          limit: 5,
          availability: "available",
          matchMode,
          excludeUserIds: searchContext.shownIds,
        };
        if (extractedSkill) searchArgs.skills = [extractedSkill];
        if (targetHackId) searchArgs.hackathonId = targetHackId;

        const toolCalls = [];
        if (!profileData) toolCalls.push({ name: "get_my_profile", args: {} });
        toolCalls.push({ name: "find_teammates", args: searchArgs });

        return { toolCalls };
      }

      // Tool response turn: process returned candidates
      const teammates = teammatesData.teammates || [];

      if (teammates.length === 0) {
        return {
          text: "No more eligible teammates are available right now.",
          recommendations: { teammates: [] },
        };
      }

      let responseText = "";
      if (teammates.length < 5) {
        responseText = "Here are the remaining eligible teammates.";
      } else {
        if (extractedSkill) {
          responseText = `Here are 5 more eligible ${extractedSkill} teammates.`;
        } else if (targetHackId || lowerMsg.includes("hackathon")) {
          responseText = "Here are 5 more eligible teammates for this hackathon.";
        } else {
          responseText = "Here are 5 more eligible teammates.";
        }
      }

      return {
        text: responseText,
        recommendations: { teammates },
      };
    }

    // Candidate list resolution: use current tool output or previous conversation context

    // If candidate list is NOT yet populated, build tool calls
    if (!availableCandidatePool) {
      const extractedSkill = isComplementaryRequest ? null : extractSkillFromMessage(userMessage);
      const refHackathon = previousSelectedHackathon || (previousHackathons && previousHackathons[0]) || null;
      const isHackathonRequest =
        lowerMsg.includes("hackathon") ||
        lowerMsg.includes("this hackathon") ||
        Boolean(context && context.hackathonId) ||
        Boolean(refHackathon) ||
        /\b(a1|ai)\b/i.test(lowerMsg);

      const targetHackId = context?.hackathonId || (refHackathon ? (refHackathon.id || refHackathon._id) : null);

      if (isHackathonRequest && targetHackId && !hackathonDetailsData && !refHackathon) {
        const toolCalls = [{ name: "get_hackathon_details", args: { hackathonId: targetHackId } }];
        if (!profileData) toolCalls.push({ name: "get_my_profile", args: {} });
        return { toolCalls };
      }

      let matchMode = "all";
      if (isComplementaryRequest) matchMode = "complementary";
      else if (extractedSkill && isHackathonRequest) matchMode = "skill_and_hackathon";
      else if (extractedSkill) matchMode = "skill";
      else if (isHackathonRequest) matchMode = "hackathon";

      const searchArgs = {
        limit: 5,
        availability: "available",
        matchMode,
      };

      if (extractedSkill && !isComplementaryRequest) {
        searchArgs.skills = [extractedSkill];
      }
      if (targetHackId) {
        searchArgs.hackathonId = targetHackId;
      }

      const toolCalls = [];
      if (!profileData) {
        toolCalls.push({ name: "get_my_profile", args: {} });
      }
      toolCalls.push({ name: "find_teammates", args: searchArgs });

      return { toolCalls };
    }

    // Synthesize Teammate Output when candidates ARE available
    const teammates = availableCandidatePool;
    const candidatesAfterFilters =
      teammatesData?.candidatesAfterFilters !== undefined
        ? teammatesData.candidatesAfterFilters
        : teammates.length;
    const totalEligible = teammatesData?.totalEligible !== undefined ? teammatesData.totalEligible : candidatesAfterFilters;
    const hasUnavailableMatches = Boolean(teammatesData?.hasUnavailableMatches);
    const targetSkill = isComplementaryRequest ? null : extractSkillFromMessage(userMessage);
    const extractedHackName = extractHackathonNameFromMessage(userMessage);
    let refHackathon = previousSelectedHackathon || null;

    if (!refHackathon && previousHackathons && Array.isArray(previousHackathons) && previousHackathons.length > 0) {
      if (extractedHackName) {
        refHackathon = previousHackathons.find(
          (h) =>
            (h.title && h.title.toLowerCase().includes(extractedHackName.toLowerCase())) ||
            (h.name && h.name.toLowerCase().includes(extractedHackName.toLowerCase())) ||
            (h.themes && h.themes.some((t) => t.toLowerCase().includes(extractedHackName.toLowerCase()))) ||
            (h.skills && h.skills.some((s) => s.toLowerCase().includes(extractedHackName.toLowerCase())))
        );
      }
      if (!refHackathon) {
        refHackathon = previousHackathons[0];
      }
    }

    const isHackathonRequest = lowerMsg.includes("hackathon") || Boolean(context && context.hackathonId) || Boolean(refHackathon) || /\b(a1|ai)\b/i.test(lowerMsg);

    // 1. Zero matching candidates case
    if (candidatesAfterFilters === 0 || teammates.length === 0) {
      if (targetSkill) {
        if (hasUnavailableMatches) {
          return {
            text: `I found users with ${targetSkill} skills, but no ${targetSkill} teammates are available on getHack right now.`,
            recommendations: { teammates: [] },
          };
        }
        return {
          text: `I couldn't find any available teammates with ${targetSkill} skills on getHack right now. You can try another skill or check again later.`,
          recommendations: { teammates: [] },
        };
      }

      if (isHackathonRequest) {
        return {
          text: `I couldn't find any available teammates matching this hackathon on getHack right now.`,
          recommendations: { teammates: [] },
        };
      }

      return {
        text: `No eligible teammates are available on getHack right now.`,
        recommendations: { teammates: [] },
      };
    }

    // 2. Best Teammate Recommendation Intent (RECOMMEND_BEST_TEAMMATE -> EXACTLY 1 CARD)
    if (isBestTeammateQuery) {
      const ranked = rankBestTeammates(teammates, userProfile, targetSkill, refHackathon);
      const topMatch = ranked[0] || { teammate: teammates[0], matchingSkills: [], complementarySkills: [] };
      const bestTeammate = topMatch.teammate;

      const hackTitle = refHackathon ? (refHackathon.title || refHackathon.name) : (extractedHackName ? `${extractedHackName} Hackathon` : "this hackathon");
      const hackSkillsText = (refHackathon?.skills || refHackathon?.requiredSkills || []).join(", ");
      const userSkillsText = Array.isArray(userProfile.skills) && userProfile.skills.length > 0
        ? userProfile.skills.slice(0, 3).join(", ")
        : "your profile background";

      const compSkillsText = topMatch.complementarySkills.length > 0
        ? topMatch.complementarySkills.slice(0, 4).join(", ")
        : (bestTeammate.skills?.slice(0, 4).join(", ") || "their domain");

      let explanationText = "";
      if (refHackathon) {
        explanationText = `Based on the requirements of **${hackTitle}**${hackSkillsText ? ` (${hackSkillsText})` : ""} and your current profile (${userSkillsText}), I recommend **${bestTeammate.name}** as the strongest teammate match. Their **${compSkillsText}** skills complement your existing skill set.`;
      } else if (isHackathonRequest) {
        explanationText = `Based on the AI hackathon requirements and your current profile (${userSkillsText}), I recommend **${bestTeammate.name}** as the strongest teammate match. Their **${compSkillsText}** skills complement your existing skill set.`;
      } else if (targetSkill) {
        explanationText = `From the candidates available for ${targetSkill}, **${bestTeammate.name}** is the strongest match for your profile because of their **${compSkillsText}** expertise.`;
      } else {
        explanationText = `Based on your profile (${userSkillsText}), I recommend **${bestTeammate.name}** as the strongest teammate match.`;
      }

      return {
        text: explanationText,
        recommendations: { teammates: [bestTeammate] },
      };
    }

    // 3. Complementary Search Specific Response Handling
    if (isComplementaryRequest) {
      if (totalEligible === 0 || candidatesAfterFilters === 0 || teammates.length === 0) {
        return {
          text: "No eligible teammates are available on getHack right now.",
          recommendations: { teammates: [] },
        };
      }

      if (teammatesData?.hasWeakComplement) {
        return {
          text: "I found eligible teammates, but none are a strong complementary match for your current skills.",
          recommendations: { teammates: teammates.slice(0, 5) },
        };
      }

      let textMsg = "";
      if (isHackathonRequest) {
        textMsg = `I found ${candidatesAfterFilters} available teammate${candidatesAfterFilters > 1 ? "s" : ""} whose skills complement your profile and align with key hackathon requirements. I prioritized candidates who bring new technical capabilities to your team.`;
      } else {
        textMsg = `I found ${candidatesAfterFilters} available teammate${candidatesAfterFilters > 1 ? "s" : ""} whose skills complement your current stack. I prioritized candidates who add capabilities such as AI/ML, UI/UX, and other skills that are not already covered by your profile.`;
      }

      return {
        text: textMsg,
        recommendations: { teammates: teammates.slice(0, 5) },
      };
    }

    // 4. General Teammate Search (FIND_TEAMMATES -> UP TO 5 CARDS)
    let messageText = "";
    if (targetSkill && isHackathonRequest) {
      messageText = `I found ${candidatesAfterFilters} available teammate${candidatesAfterFilters > 1 ? "s" : ""} with ${targetSkill} skills matching this hackathon.`;
    } else if (targetSkill) {
      messageText = `I found ${candidatesAfterFilters} available teammate${candidatesAfterFilters > 1 ? "s" : ""} with ${targetSkill} skills.`;
    } else if (isHackathonRequest) {
      messageText = `I found ${candidatesAfterFilters} available teammate${candidatesAfterFilters > 1 ? "s" : ""} whose skills align with this hackathon's requirements.`;
    } else {
      messageText = `I found ${candidatesAfterFilters} available teammate${candidatesAfterFilters > 1 ? "s" : ""} for you on getHack.`;
    }

    return {
      text: messageText.trim(),
      recommendations: { teammates: teammates.slice(0, 5) },
    };
  }

  // --- PHASE 10: HACKATHON FOLLOW-UP CONTEXT & INTENT HANDLING ---

  const isBestFollowUp =
    queryAnalysis.intent === "RECOMMEND_BEST_HACKATHON" ||
    /\bwhich\s+(one\s+)?(is\s+)?(the\s+)?best\b/i.test(lowerMsg) ||
    /\bwhich\s+one\s+should\s+i\s+(choose|participate|join)\b/i.test(lowerMsg) ||
    /\bwhich\s+hackathon\s+should\s+i\s+(choose|participate|join)\b/i.test(lowerMsg) ||
    /\bwhich\s+(one\s+)?suits?\s+me\s+best\b/i.test(lowerMsg) ||
    /\bwhich\s+(one\s+)?would\s+you\s+recommend\b/i.test(lowerMsg) ||
    /\bwhat\s+do\s+you\s+recommend\b/i.test(lowerMsg) ||
    /\bwhich\s+is\s+better\s+for\s+me\b/i.test(lowerMsg) ||
    /\bwhich\s+hackathon\s+is\s+best\b/i.test(lowerMsg) ||
    lowerMsg === "which one is best" ||
    lowerMsg === "which is the best" ||
    lowerMsg === "which one should i choose" ||
    lowerMsg === "which one should i participate in" ||
    lowerMsg === "which hackathon is best for me" ||
    lowerMsg === "which is better for me" ||
    lowerMsg === "what do you recommend" ||
    lowerMsg === "which one would you recommend" ||
    lowerMsg === "which one suits me best";

  const isWhyFollowUp =
    lowerMsg === "why" ||
    lowerMsg === "why?" ||
    lowerMsg.startsWith("why ") ||
    lowerMsg.includes("why is that best") ||
    lowerMsg.includes("why this one") ||
    lowerMsg.includes("why do you recommend") ||
    lowerMsg.includes("why is it the best") ||
    lowerMsg.includes("why the selected hackathon");

  const isCompareFollowUp =
    lowerMsg === "compare them" ||
    lowerMsg === "compare" ||
    lowerMsg.includes("compare them") ||
    lowerMsg.includes("compare these") ||
    lowerMsg.includes("how do they compare");

  const positionalMatch = lowerMsg.match(
    /\b(first|1st|second|2nd|third|3rd|fourth|4th|fifth|5th|number\s*1|number\s*2|number\s*3|number\s*4|number\s*5)\s*(one|hackathon)?\b/i
  );

  const isDeadlineFollowUp =
    lowerMsg.includes("deadline") ||
    lowerMsg.includes("earliest deadline") ||
    lowerMsg.includes("closest registration deadline") ||
    lowerMsg.includes("closest deadline");

  const targetFollowUpSkill = extractSkillFromMessage(userMessage);

  const isExplicitSkillFollowUp =
    /\bwhich\s+(one\s+)?(is\s+)?(the\s+)?best\s+for\b/i.test(lowerMsg) ||
    /\bwhich\s+of\s+these\s+is\s+(the\s+)?best\s+for\b/i.test(lowerMsg) ||
    /\bwhich\s+one\s+for\b/i.test(lowerMsg);

  // 1. "Which one is best?" / "Compare them" / Explicit Skill-specific follow-up
  if ((isBestFollowUp || isCompareFollowUp || isExplicitSkillFollowUp) && !lowerMsg.includes("teammate")) {
    if (previousHackathons && previousHackathons.length > 0) {
      const ranked = rankBestHackathons(previousHackathons, userProfile, targetFollowUpSkill);
      const topMatch = ranked[0];
      const bestHackathon = topMatch.hackathon;

      const matchingSkills = topMatch.matchingSkills || [];
      const userSkillsText = matchingSkills.length > 0 ? matchingSkills.join(", ") : (userProfile.skills?.slice(0, 3).join(", ") || "your technical background");

      let explanationText = "";
      if (isCompareFollowUp) {
        explanationText = `I compared the ${previousHackathons.length} hackathons I just showed you. Based on your profile, **${bestHackathon.title || bestHackathon.name}** is the strongest overall match because it aligns closely with your skills (${userSkillsText}).`;
      } else if (targetFollowUpSkill) {
        explanationText = `From the hackathons I just showed you, **${bestHackathon.title || bestHackathon.name}** is the best match for ${targetFollowUpSkill} because it aligns with ${targetFollowUpSkill} experience.`;
      } else {
        explanationText = `Based on your profile, I'd recommend **${bestHackathon.title || bestHackathon.name}**. It is the strongest fit for your ${userSkillsText} experience and gives you the best opportunity to build with your existing strengths.`;
      }

      return {
        text: explanationText,
        recommendations: { hackathons: [bestHackathon] },
      };
    } else if (isBestFollowUp) {
      // Requirement 14: If no previous hackathon result, trigger new personalized search
      return {
        toolCalls: [
          { name: "get_my_profile", args: {} },
          { name: "search_hackathons", args: { limit: 20, status: "registration_open" } },
        ],
      };
    }
  }

  // 2. "Why?" follow-up
  if (isWhyFollowUp && !lowerMsg.includes("teammate")) {
    const targetHackathon = previousSelectedHackathon || (previousHackathons && previousHackathons.length > 0 ? previousHackathons[0] : null);

    if (targetHackathon) {
      const userSkillsText = Array.isArray(userProfile.skills) && userProfile.skills.length > 0
        ? userProfile.skills.slice(0, 3).join(", ")
        : "your current skills";

      return {
        text: `**${targetHackathon.title || targetHackathon.name}** is the strongest fit because its requirements align most closely with your ${userSkillsText} skills and background, giving you the best opportunity to build an impactful project.`,
        recommendations: { hackathons: [targetHackathon] },
      };
    }
  }

  // 3. Positional reference follow-up ("first one", "second one", etc.)
  if (positionalMatch && previousHackathons && previousHackathons.length > 0 && !lowerMsg.includes("teammate")) {
    const posStr = positionalMatch[1].toLowerCase();
    let idx = -1;
    if (/\b(first|1st|number\s*1)\b/.test(posStr)) idx = 0;
    else if (/\b(second|2nd|number\s*2)\b/.test(posStr)) idx = 1;
    else if (/\b(third|3rd|number\s*3)\b/.test(posStr)) idx = 2;
    else if (/\b(fourth|4th|number\s*4)\b/.test(posStr)) idx = 3;
    else if (/\b(fifth|5th|number\s*5)\b/.test(posStr)) idx = 4;

    if (idx >= 0 && previousHackathons[idx]) {
      const targetHackathon = previousHackathons[idx];
      let detailMsg = "";

      if (lowerMsg.includes("deadline")) {
        detailMsg = `The registration deadline for **${targetHackathon.title || targetHackathon.name}** is ${targetHackathon.registrationDeadline ? new Date(targetHackathon.registrationDeadline).toLocaleDateString() : "open for registration"}.`;
      } else if (lowerMsg.includes("skill") || lowerMsg.includes("needed") || lowerMsg.includes("require")) {
        const skillsList = (targetHackathon.skills || targetHackathon.requiredSkills || []).join(", ");
        detailMsg = `**${targetHackathon.title || targetHackathon.name}** requires skills in: ${skillsList || "General Software Development"}.`;
      } else {
        detailMsg = `Here are the details for **${targetHackathon.title || targetHackathon.name}**: It is an ${targetHackathon.mode || "Online"} hackathon. ${targetHackathon.description || ""}`;
      }

      return {
        text: detailMsg.trim(),
        recommendations: { hackathons: [targetHackathon] },
      };
    }
  }

  // 4. "Which one has the earliest deadline?" follow-up
  if (isDeadlineFollowUp && previousHackathons && previousHackathons.length > 0 && !lowerMsg.includes("teammate")) {
    const sorted = [...previousHackathons].sort((a, b) => {
      const dateA = a.registrationDeadline ? new Date(a.registrationDeadline).getTime() : Infinity;
      const dateB = b.registrationDeadline ? new Date(b.registrationDeadline).getTime() : Infinity;
      return dateA - dateB;
    });

    const earliestHackathon = sorted[0];
    const deadlineText = earliestHackathon.registrationDeadline
      ? new Date(earliestHackathon.registrationDeadline).toLocaleDateString()
      : "open for registration";

    return {
      text: `Among the hackathons I previously showed you, **${earliestHackathon.title || earliestHackathon.name}** has the closest registration deadline (${deadlineText}).`,
      recommendations: { hackathons: [earliestHackathon] },
    };
  }

  // --- PHASE 3: HACKATHON INTELLIGENCE INTENT DETECTION & PROCESSING ---
  const isHackathonDetailsIntent =
    lowerMsg.includes("tell me about this hackathon") ||
    lowerMsg.includes("tell me about it") ||
    lowerMsg.includes("what is this hackathon about") ||
    lowerMsg.includes("what is it about") ||
    lowerMsg.includes("give me details about this hackathon") ||
    lowerMsg.includes("explain this hackathon") ||
    lowerMsg.includes("explain the hackathon") ||
    lowerMsg.includes("what are the details") ||
    (lowerMsg.includes("details") && (lowerMsg.includes("hackathon") || lowerMsg.includes("event") || lowerMsg.includes("it") || lowerMsg.includes("this"))) ||
    (lowerMsg.includes("about") && (lowerMsg.includes("this hackathon") || lowerMsg.includes("the hackathon") || lowerMsg.includes("selected hackathon")));

  const isHackathonRequirementsIntent =
    queryAnalysis.intent === "HACKATHON_REQUIREMENTS" ||
    /\bwhat\s+skills\s+(do\s+i|are|does\s+it|does\s+this|is)\s+(require|required|need|needed)\b/i.test(lowerMsg) ||
    /\bwhat\s+technologies\s+(do\s+i|are|does\s+it|is)\s+(require|required|need|needed)\b/i.test(lowerMsg) ||
    /\bwhat\s+(tech\s+stack|technologies|skills)\s+(are|is)\s+(required|needed)\b/i.test(lowerMsg) ||
    /\bwhat\s+should\s+i\s+(know|learn)\s+(for\s+this|for\s+the)?\b/i.test(lowerMsg) ||
    /\bwhat\s+do\s+i\s+need\s+to\s+(know|participate)\b/i.test(lowerMsg) ||
    lowerMsg.includes("what skills do i require") ||
    lowerMsg.includes("what skills do i need") ||
    lowerMsg.includes("what skills are required") ||
    lowerMsg.includes("what skills are needed") ||
    lowerMsg.includes("what skills does this hackathon require") ||
    lowerMsg.includes("what technologies do i need") ||
    lowerMsg.includes("what should i know for this hackathon") ||
    lowerMsg.includes("what skills are needed for this hackathon") ||
    lowerMsg.includes("what do i need to know for this hackathon") ||
    lowerMsg.includes("what technologies are required") ||
    lowerMsg.includes("what tech stack") ||
    lowerMsg.includes("what do i require");

  const isHackathonDeadlineIntent =
    queryAnalysis.intent === "HACKATHON_DEADLINE" ||
    lowerMsg.includes("when is the deadline") ||
    lowerMsg.includes("when does registration close") ||
    lowerMsg.includes("how much time do i have") ||
    lowerMsg.includes("what is the registration deadline") ||
    lowerMsg.includes("is registration still open") ||
    (lowerMsg.includes("registration") && lowerMsg.includes("deadline")) ||
    lowerMsg.includes("last date to register");

  const isHackathonEligibilityIntent =
    lowerMsg.includes("am i eligible") ||
    lowerMsg.includes("can i participate") ||
    lowerMsg.includes("do i qualify") ||
    lowerMsg.includes("can i join this hackathon") ||
    lowerMsg.includes("can i join it") ||
    lowerMsg.includes("does this hackathon fit me") ||
    lowerMsg.includes("eligibility criteria");

  const isHackathonProfileFitIntent =
    lowerMsg.includes("how good is this hackathon for me") ||
    lowerMsg.includes("is this hackathon suitable for me") ||
    lowerMsg.includes("does this hackathon match my skills") ||
    lowerMsg.includes("how well do i match") ||
    lowerMsg.includes("should i participate") ||
    lowerMsg.includes("is this a good hackathon for me") ||
    lowerMsg.includes("how good is it for me") ||
    lowerMsg.includes("do i have those skills");

  const isHackathonSkillGapIntent =
    queryAnalysis.intent === "HACKATHON_SKILL_GAP" ||
    lowerMsg.includes("what skills am i missing") ||
    lowerMsg.includes("what should i learn for this hackathon") ||
    lowerMsg.includes("what am i missing for this hackathon") ||
    lowerMsg.includes("what am i missing") ||
    lowerMsg.includes("my skill gap") ||
    lowerMsg.includes("skill gap");

  const isHackathonTeamReqsIntent =
    lowerMsg.includes("what teammates do i need") ||
    lowerMsg.includes("what kind of teammate do i need") ||
    lowerMsg.includes("who should i team up with for this hackathon") ||
    lowerMsg.includes("what team do i need") ||
    lowerMsg.includes("teammates for this hackathon") ||
    (lowerMsg.includes("who should i team up with") && !lowerMsg.includes("best"));

  const isHackathonIntelQuery =
    isHackathonDetailsIntent ||
    isHackathonRequirementsIntent ||
    isHackathonDeadlineIntent ||
    isHackathonEligibilityIntent ||
    isHackathonProfileFitIntent ||
    isHackathonSkillGapIntent ||
    isHackathonTeamReqsIntent;

  if (isHackathonIntelQuery) {
    const extractedHackName = extractHackathonNameFromMessage(userMessage);
    let intelHackathon = previousSelectedHackathon || null;

    if (!intelHackathon && previousHackathons && Array.isArray(previousHackathons) && previousHackathons.length > 0) {
      if (extractedHackName) {
        intelHackathon = previousHackathons.find(
          (h) =>
            (h.title && h.title.toLowerCase().includes(extractedHackName.toLowerCase())) ||
            (h.name && h.name.toLowerCase().includes(extractedHackName.toLowerCase()))
        );
      }
      if (!intelHackathon) {
        intelHackathon = previousHackathons[0];
      }
    }

    if (!intelHackathon && hackathonDetailsData && hackathonDetailsData.hackathon) {
      intelHackathon = hackathonDetailsData.hackathon;
    }

    if (!intelHackathon) {
      if (extractedHackName) {
        return { toolCalls: [{ name: "get_hackathon_details", args: { hackathonId: extractedHackName } }] };
      }
      return { text: "Which hackathon are you asking about? Select a hackathon or tell me its name, and I'll show you the required skills." };
    }

    // 1. Details Intent
    if (isHackathonDetailsIntent && !lowerMsg.includes("teammate")) {
      const title = intelHackathon.title || intelHackathon.name;
      const organizer = intelHackathon.organizerName || "Organizer";
      const desc = intelHackathon.description || intelHackathon.shortDescription || "No description provided.";
      const mode = intelHackathon.mode || "Online";
      const loc = intelHackathon.location || "Online";
      const prize = intelHackathon.prizePool || "Prizes & Recognition";
      const skillsList = (intelHackathon.skills || intelHackathon.requiredSkills || []).join(", ") || "General Software Development";
      const deadline = intelHackathon.registrationDeadline ? new Date(intelHackathon.registrationDeadline).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "Open for registration";

      return {
        text: `**${title}** (by ${organizer})\n\n**Overview:** ${desc}\n\n**Key Details:**\n• Mode: ${mode} (${loc})\n• Registration Deadline: ${deadline}\n• Prizes: ${prize}\n• Key Skills Required: ${skillsList}`,
        recommendations: { hackathons: [intelHackathon] },
      };
    }

    // 2. Requirements Intent
    if (isHackathonRequirementsIntent && !lowerMsg.includes("teammate")) {
      const title = intelHackathon.title || intelHackathon.name;
      const reqSkills = intelHackathon.skills || intelHackathon.requiredSkills || intelHackathon.requirements || [];

      let text = `For **${title}**, the required skills are:\n\n`;
      if (reqSkills.length > 0) {
        text += reqSkills.map((s) => `• ${s}`).join("\n");
      } else {
        text += `• General Software Development & Problem Solving`;
      }
      text += `\n\nThese are based on the requirements listed for this hackathon.`;

      return {
        text: text.trim(),
        recommendations: { hackathons: [intelHackathon] },
      };
    }

    // 3. Deadline Intent
    if (isHackathonDeadlineIntent && !lowerMsg.includes("teammate")) {
      const title = intelHackathon.title || intelHackathon.name;
      const deadlineRaw = intelHackathon.registrationDeadline;
      const regUrl = intelHackathon.registrationUrl || "";

      if (!deadlineRaw) {
        return {
          text: `Registration for **${title}** is currently open. The official registration is handled on the external hackathon platform${regUrl ? `: [Register Here](${regUrl})` : "."}`,
          recommendations: { hackathons: [intelHackathon] },
        };
      }

      const deadlineDate = new Date(deadlineRaw);
      const now = new Date();
      const isClosed = deadlineDate.getTime() < now.getTime();
      const formattedDate = deadlineDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

      let text = "";
      if (isClosed) {
        text = `Registration for **${title}** closed on **${formattedDate}**.`;
      } else {
        const diffMs = deadlineDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        text = `Registration closes on **${formattedDate}**.\n\nYou have approximately **${diffDays} day${diffDays > 1 ? "s" : ""} remaining**.\n\nNote: The official registration is handled on the external hackathon platform.`;
      }

      return {
        text,
        recommendations: { hackathons: [intelHackathon] },
      };
    }

    // 4. Eligibility Intent
    if (isHackathonEligibilityIntent && !lowerMsg.includes("teammate")) {
      const title = intelHackathon.title || intelHackathon.name;
      const mode = intelHackathon.mode || "Online";
      const eligibilityRule = intelHackathon.eligibility || "Open to all participants";

      const hasSkills = Array.isArray(userProfile.skills) && userProfile.skills.length > 0;
      const hasLocation = Boolean(userProfile.location);

      let text = `You appear to meet the listed eligibility requirements for **${title}**.\n\nYour profile matches:\n✓ Mode: ${mode}\n✓ Eligibility criteria: ${eligibilityRule}\n✓ Technical background\n\n`;

      if (!hasSkills || !hasLocation) {
        text += `*Note: Please ensure your getHack profile location and skills are updated for exact verification.* `;
      }

      text += `However, verify final eligibility conditions on the official hackathon registration page.`;

      return {
        text,
        recommendations: { hackathons: [intelHackathon] },
      };
    }

    // 5. Profile Fit Intent
    if (isHackathonProfileFitIntent && !lowerMsg.includes("teammate")) {
      const title = intelHackathon.title || intelHackathon.name;
      const reqSkills = intelHackathon.skills || intelHackathon.requiredSkills || [];
      const userSkills = (userProfile.skills || []).map((s) => String(s));

      const matching = reqSkills.filter((rs) => userSkills.some((us) => us.toLowerCase().includes(rs.toLowerCase()) || rs.toLowerCase().includes(us.toLowerCase())));
      const gaps = reqSkills.filter((rs) => !matching.some((m) => m.toLowerCase() === rs.toLowerCase()));

      let fitLevel = "Strong";
      if (matching.length === 0 && reqSkills.length > 0) fitLevel = "Weak";
      else if (matching.length < reqSkills.length / 2) fitLevel = "Moderate";

      const userSkillsText = userSkills.slice(0, 3).join(", ") || "your background";
      const matchText = matching.join(", ");
      const gapText = gaps.join(", ");

      let text = `Fit: **${fitLevel}**\n\nWhy:\n`;
      if (matching.length > 0) {
        text += `• Your **${matchText}** skills align with the challenge requirements.\n`;
      }
      if (userSkills.length > 0) {
        text += `• Your technical background (${userSkillsText}) provides relevant problem-solving experience.\n`;
      }
      if (gaps.length > 0) {
        text += `• You may need additional expertise in **${gapText}** for some parts of the challenge.\n`;
      }

      text += `\nRecommendation:\n`;
      if (fitLevel === "Strong") {
        text += `This is a great hackathon for you! You have strong skills to build an impactful project.`;
      } else if (fitLevel === "Moderate") {
        text += `This is a good hackathon for you, especially if you team up with someone strong in **${gapText || "AI/ML"}**.`;
      } else {
        text += `You can participate to learn new technologies, or team up with teammates skilled in **${gapText || "the required tech stack"}**.`;
      }

      return {
        text,
        recommendations: { hackathons: [intelHackathon] },
      };
    }

    // 6. Skill Gap Intent
    if (isHackathonSkillGapIntent && !lowerMsg.includes("teammate")) {
      const title = intelHackathon.title || intelHackathon.name;
      const reqSkills = intelHackathon.skills || intelHackathon.requiredSkills || [];
      const userSkills = (userProfile.skills || []).map((s) => String(s));

      const matching = reqSkills.filter((rs) => userSkills.some((us) => us.toLowerCase().includes(rs.toLowerCase()) || rs.toLowerCase().includes(us.toLowerCase())));
      const gaps = reqSkills.filter((rs) => !matching.some((m) => m.toLowerCase() === rs.toLowerCase()));

      let text = `Based on your getHack profile:\n\nYou already have:\n${matching.length > 0 ? matching.map((s) => `• ${s}`).join("\n") : "• None of the required skills listed yet"}\n\nYou may need:\n${gaps.length > 0 ? gaps.map((s) => `• ${s}`).join("\n") : "• None! Your profile covers all listed requirements."}`;

      return {
        text,
        recommendations: { hackathons: [intelHackathon] },
      };
    }

    // 7. Team Requirements Intent (seamless bridge to teammate agent!)
    if (isHackathonTeamReqsIntent) {
      const title = intelHackathon.title || intelHackathon.name;
      const reqSkills = intelHackathon.skills || intelHackathon.requiredSkills || [];
      const userSkills = (userProfile.skills || []).map((s) => String(s));

      const matching = reqSkills.filter((rs) => userSkills.some((us) => us.toLowerCase().includes(rs.toLowerCase()) || rs.toLowerCase().includes(us.toLowerCase())));
      const gaps = reqSkills.filter((rs) => !matching.some((m) => m.toLowerCase() === rs.toLowerCase()));

      const availableCandidatePool = teammatesData?.teammates || previousTeammates || null;
      if (!availableCandidatePool) {
        const searchArgs = {
          limit: 50,
          availability: "available",
          matchMode: "complementary",
        };
        if (gaps.length > 0) searchArgs.skills = gaps;
        if (intelHackathon.id || intelHackathon._id) searchArgs.hackathonId = intelHackathon.id || intelHackathon._id;

        const toolCalls = [];
        if (!profileData) toolCalls.push({ name: "get_my_profile", args: {} });
        toolCalls.push({ name: "find_teammates", args: searchArgs });
        return { toolCalls };
      }

      const teammates = availableCandidatePool;
      let text = `To succeed in **${title}**, your team will need expertise in: **${reqSkills.join(", ") || "General Software Development"}**.\n\n`;
      text += `Since your profile covers **${userSkills.slice(0, 3).join(", ") || "your current skills"}**, you should look for teammates skilled in: **${gaps.length > 0 ? gaps.join(", ") : "complementary domain skills"}**.\n\n`;
      text += `Here are available teammates who cover these missing skills:`;

      return {
        text,
        recommendations: { teammates: teammates.slice(0, 5) },
      };
    }
  }

  // Hackathon Discovery Intent Detection (Phase 3 & Phase 8 refinement)
  const isHackathonDiscoveryIntent =
    !isTeammateRequest &&
    (lowerMsg.includes("hackathon") ||
     lowerMsg.includes("hackathons") ||
     lowerMsg.includes("hacathon") ||
     lowerMsg.includes("hackthons") ||
     lowerMsg.includes("hacathone") ||
     lowerMsg.includes("recommend a hackathon") ||
     lowerMsg.includes("recommend hackathon") ||
     lowerMsg.includes("suggest me hackathon") ||
     lowerMsg.includes("suggest hackathon") ||
     lowerMsg.includes("find hackathons") ||
     lowerMsg.includes("find online") ||
     lowerMsg.includes("show me hackathons") ||
     lowerMsg.includes("what hackathons can i join") ||
     lowerMsg.includes("which hackathon should i participate in") ||
     lowerMsg.includes("should i participate"));

  if (isHackathonDiscoveryIntent) {
    if (!searchData) {
      const searchArgs = {
        limit: 20,
        status: "registration_open",
      };

      const extractedSkills = [];
      if (/\b(javascript|js)\b/i.test(lowerMsg)) extractedSkills.push("JavaScript");
      if (/\b(python|py)\b/i.test(lowerMsg)) extractedSkills.push("Python");
      if (/\b(react|reactjs)\b/i.test(lowerMsg)) extractedSkills.push("React");
      if (/\b(node|nodejs|node\.js)\b/i.test(lowerMsg)) extractedSkills.push("Node.js");
      if (/\b(mongodb|mongo)\b/i.test(lowerMsg)) extractedSkills.push("MongoDB");
      if (/\b(c\+\+|cpp)\b/i.test(lowerMsg)) extractedSkills.push("C++");
      if (/\bjava\b/i.test(lowerMsg) && !/\bjavascript\b/i.test(lowerMsg)) extractedSkills.push("Java");
      if (/\b(ml|machine learning)\b/i.test(lowerMsg)) extractedSkills.push("Machine Learning");
      if (/\b(ai|a1|artificial intelligence)\b/i.test(lowerMsg)) extractedSkills.push("AI");

      if (extractedSkills.length > 0) {
        searchArgs.skills = extractedSkills;
      }

      const extractedThemes = [];
      if (/\b(ai|a1|artificial intelligence|machine learning|ml)\b/i.test(lowerMsg)) extractedThemes.push("AI");
      if (/\b(web3|blockchain|crypto)\b/i.test(lowerMsg)) extractedThemes.push("Web3");
      if (/\b(health|healthcare)\b/i.test(lowerMsg)) extractedThemes.push("Healthcare");
      if (/\b(fintech|finance)\b/i.test(lowerMsg)) extractedThemes.push("Fintech");
      if (/\b(cybersecurity|security)\b/i.test(lowerMsg)) extractedThemes.push("Cybersecurity");
      if (/\b(sustainability|climate|green)\b/i.test(lowerMsg)) extractedThemes.push("Sustainability");
      if (/\b(ui\/ux|design)\b/i.test(lowerMsg)) extractedThemes.push("UI/UX");

      if (extractedThemes.length > 0) {
        searchArgs.interests = extractedThemes;
      }

      if (/\bonline\b|\bremote\b|\bvirtual\b/i.test(lowerMsg)) {
        searchArgs.mode = "online";
      } else if (/\boffline\b|\bin-person\b|\bin person\b/i.test(lowerMsg)) {
        searchArgs.mode = "offline";
      }

      if (/\bindia\b/i.test(lowerMsg)) searchArgs.location = "India";
      else if (/\bdelhi\b/i.test(lowerMsg)) searchArgs.location = "Delhi";
      else if (/\bjaipur\b/i.test(lowerMsg)) searchArgs.location = "Jaipur";

      const toolCalls = [];
      if (!profileData) {
        toolCalls.push({ name: "get_my_profile", args: {} });
      }
      toolCalls.push({ name: "search_hackathons", args: searchArgs });

      return { toolCalls };
    }

    // Synthesize Hackathon Discovery Output when searchData IS available
    const hackathons = searchData.hackathons || [];
    const count = searchData.count !== undefined ? searchData.count : hackathons.length;
    const totalAvailable = searchData.totalAvailable !== undefined ? searchData.totalAvailable : count;
    const hasExactProfileMatch = searchData.hasExactProfileMatch;

    if (totalAvailable === 0 || count === 0 || hackathons.length === 0) {
      return {
        text: "No upcoming hackathons are available on getHack right now.",
        recommendations: { hackathons: [] },
      };
    }

    const userObj = profileData?.user || profileData || {};
    const userSkills = Array.isArray(userObj.skills) ? userObj.skills : [];

    let explanationText = "";

    if (hasExactProfileMatch === false) {
      explanationText = `I couldn't find a strong skill match for your exact profile, but here are the closest upcoming hackathons currently available on getHack:`;
    } else if (userSkills.length > 0) {
      explanationText = `I found ${count} upcoming hackathon${count > 1 ? "s" : ""} that could be a good fit for your profile (${userSkills.slice(0, 3).join(", ")}).`;
    } else {
      explanationText = `I found ${count} upcoming hackathon${count > 1 ? "s" : ""} currently available on getHack:`;
    }

    return {
      text: explanationText,
      recommendations: { hackathons: hackathons.slice(0, 5) },
    };
  }

  if (/\b(hi|hello|hey)\b/i.test(lowerMsg)) {
    return {
      text: `Hello! I'm **getHack AI**, your Hackathon Copilot. 🚀\n\nHow can I help you today? You can ask me to find hackathons, recommend events for your profile, or discover complementary teammates!`,
    };
  }

  return {
    text: `I understand you're asking about "${userMessage.trim()}". As **getHack AI — Your Hackathon Copilot**, I can help you search hackathons, analyze project deadlines, and recommend complementary teammates for your team!`,
  };
}

module.exports = {
  callLLM,
  SYSTEM_PROMPT,
  understandUserQuery,
  generateFallbackResponse,
  extractStructuredContext,
  extractOrdinalIndices,
  extractTeammateSearchContext,
  isContextResetCommand,
  checkAmbiguousReference,
  extractTargetUserNameFromMessage,
  findMatchingUsersByName,
};



