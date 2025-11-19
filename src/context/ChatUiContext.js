// ChatUiContext.js - controls visibility of single window chat panel
import React, { createContext, useContext, useState, useCallback } from "react";

const ChatUiContext = createContext(null);

export function ChatUiProvider({ children }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen(o => !o), []);
  const close = useCallback(() => setOpen(false), []);
  return (
    <ChatUiContext.Provider value={{ open, toggle, close }}>
      {children}
    </ChatUiContext.Provider>
  );
}

export function useChatUi() {
  const ctx = useContext(ChatUiContext);
  if (!ctx) throw new Error("useChatUi must be inside ChatUiProvider");
  return ctx;
}
