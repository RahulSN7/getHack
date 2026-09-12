// ---------------------------------------------------------------------------
// ChatContext.jsx — Stream Chat Client Context Provider
// Initializes and manages the Stream Chat client connection for the
// authenticated getHack user. Exposes chatClient and connection state.
// ---------------------------------------------------------------------------

import { createContext, useContext, useEffect, useState, useRef } from "react";
import { StreamChat } from "stream-chat";
import { useAuth } from "./useAuth";
import { chatService } from "../services/chatService";

const ChatCtx = createContext(null);

export function useChatContext() {
  const ctx = useContext(ChatCtx);
  if (!ctx) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return ctx;
}

export function ChatProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [chatClient, setChatClient] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const clientRef = useRef(null);
  const connectingRef = useRef(false);
  const [retryTrigger, setRetryTrigger] = useState(0);

  const retryConnect = () => {
    connectingRef.current = false;
    setError(null);
    setReady(false);
    setRetryTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    if (!isAuthenticated || !user) {
      // Disconnect if user logs out
      if (clientRef.current) {
        clientRef.current.disconnectUser().catch(() => {});
        clientRef.current = null;
        setChatClient(null);
        setReady(false);
      }
      return;
    }

    // Avoid duplicate connections
    if (connectingRef.current) return;

    let cancelled = false;

    async function connectChat() {
      connectingRef.current = true;
      setError(null);

      try {
        const data = await chatService.getChatToken();

        if (cancelled) return;

        const { token, apiKey, user: streamUser } = data;

        if (!token || !apiKey || !streamUser?.id) {
          throw new Error("Invalid chat token response.");
        }

        const client = StreamChat.getInstance(apiKey);

        // Check if singleton instance is already connected to this user
        if (client.userID && client.userID === String(streamUser.id) && client.user) {
          if (!cancelled) {
            clientRef.current = client;
            setChatClient(client);
            setReady(true);
          }
          return;
        }

        // Disconnect previous connection if connected to another user or stale
        if (client.userID || clientRef.current) {
          await client.disconnectUser().catch(() => {});
        }

        await client.connectUser(
          {
            id: String(streamUser.id),
            name: streamUser.name || user.name || "User",
            image: streamUser.image || user.profile?.avatar || "",
          },
          token
        );

        if (cancelled) {
          await client.disconnectUser().catch(() => {});
          return;
        }

        clientRef.current = client;
        setChatClient(client);
        setReady(true);
      } catch (err) {
        console.error("Stream Chat connection error:", err);
        if (!cancelled) {
          setError(err.message || "Failed to connect to chat.");
          setReady(false);
        }
      } finally {
        connectingRef.current = false;
      }
    }

    connectChat();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, user?._id || user?.id, retryTrigger]);

  return (
    <ChatCtx.Provider value={{ chatClient, ready, error, retryConnect }}>
      {children}
    </ChatCtx.Provider>
  );
}
