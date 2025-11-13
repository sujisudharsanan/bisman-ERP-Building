// ChatToggleButton.jsx - button to open/close chat drawer
import React from "react";
import { useChatUi } from "../context/ChatUiContext";

export default function ChatToggleButton({ label = "Chat" }) {
  const { toggle, open } = useChatUi();
  return (
    <button onClick={toggle} style={{ padding: '6px 14px', background: open ? '#3b82f6' : '#1f2937', color: '#fff', border: '1px solid #334155', borderRadius: 6 }}>
      {open ? 'Close ' + label : label}
    </button>
  );
}
