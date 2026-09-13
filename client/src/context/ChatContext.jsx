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
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const [chatClient, setChatClient] = useState(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  const clientRef = useRef(null);
  const connectionPromiseRef = useRef(null);
  const connectedUserIdRef = useRef(null);
  const [retryTrigger, setRetryTrigger] = useState(0);

  const retryConnect = () => {
    connectionPromiseRef.current = null;
    connectedUserIdRef.current = null;
    setError(null);
    setReady(false);
    setRetryTrigger((prev) => prev + 1);
  };

  useEffect(() => {
    // 1. Wait for AuthContext loading to complete before determining state
    if (authLoading) {
      return;
    }

    // 2. If unauthenticated or no valid user, disconnect existing client & reset state
    if (!isAuthenticated || !user) {
      if (clientRef.current) {
        clientRef.current.disconnectUser().catch(() => {});
        clientRef.current = null;
      }
      connectedUserIdRef.current = null;
      connectionPromiseRef.current = null;
      setChatClient(null);
      setReady(false);
      setError(null);
      return;
    }

    const currentUserIdStr = String(user._id || user.id || "");
    if (!currentUserIdStr) {
      return;
    }

    let isSubscribed = true;

    async function performConnect() {
      try {
        setError(null);

        const apiKey = import.meta.env.VITE_STREAM_API_KEY || "w4vu8ugf94ts";
        const client = StreamChat.getInstance(apiKey);

        // If client is already fully connected for this exact user
        if (client.userID === currentUserIdStr && client.user) {
          clientRef.current = client;
          connectedUserIdRef.current = currentUserIdStr;
          if (isSubscribed) {
            setChatClient(client);
            setReady(true);
            setError(null);
          }
          return;
        }

        // If a connection for this exact user is already in progress, await it
        if (connectionPromiseRef.current && connectedUserIdRef.current === currentUserIdStr) {
          const connectedClient = await connectionPromiseRef.current;
          if (isSubscribed) {
            clientRef.current = connectedClient;
            setChatClient(connectedClient);
            setReady(true);
            setError(null);
          }
          return;
        }

        // If client is connected to a different user, disconnect first
        if (client.userID && client.userID !== currentUserIdStr) {
          await client.disconnectUser().catch(() => {});
        }

        // Create and track the single connection promise for this user
        connectedUserIdRef.current = currentUserIdStr;
        const connectPromise = (async () => {
          const data = await chatService.getChatToken();
          const { token, apiKey: serverApiKey, user: streamUser } = data || {};
          const activeApiKey = serverApiKey || apiKey;

          if (!token || !activeApiKey || !streamUser?.id) {
            throw new Error("Invalid chat token response.");
          }

          const streamClient = StreamChat.getInstance(activeApiKey);

          if (streamClient.userID === String(streamUser.id) && streamClient.user) {
            return streamClient;
          }

          await streamClient.connectUser(
            {
              id: String(streamUser.id),
              name: streamUser.name || user.name || "User",
              image: streamUser.image || user.profile?.avatar || user.avatar || "",
            },
            token
          );

          return streamClient;
        })();

        connectionPromiseRef.current = connectPromise;
        const connectedClient = await connectPromise;

        clientRef.current = connectedClient;
        if (isSubscribed) {
          setChatClient(connectedClient);
          setReady(true);
          setError(null);
        }
      } catch (err) {
        console.error("[ChatContext] Connection error:", err);
        connectionPromiseRef.current = null;
        connectedUserIdRef.current = null;
        if (isSubscribed) {
          setError(err.message || "Failed to connect to chat.");
          setReady(false);
        }
      }
    }

    performConnect();

    return () => {
      isSubscribed = false;
    };
  }, [isAuthenticated, authLoading, user?._id || user?.id, retryTrigger]);

  return (
    <ChatCtx.Provider value={{ chatClient, ready, error, retryConnect }}>
      {children}
    </ChatCtx.Provider>
  );
}

