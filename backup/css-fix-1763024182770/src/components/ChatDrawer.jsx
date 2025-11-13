// ChatDrawer.jsx - positions SingleWindowChat as overlay/right panel
import React from "react";
import { useChatUi } from "../context/ChatUiContext";
import SingleWindowChat from "./SingleWindowChat";

export default function ChatDrawer({ usersProvider, chatBase }) {
  const { open, close } = useChatUi();
  return (
    <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: open ? '55%' : 0, transition: 'width 220ms ease', zIndex: 60, overflow: 'hidden', boxShadow: open ? '0 0 0 1px #1e293b, 0 8px 28px rgba(0,0,0,0.55)' : 'none' }}>
      {open && (
        <div style={{ height: '100%', background: '#0f172a', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #1f2937' }}>
            <span style={{ fontWeight: 600 }}>Team Chat</span>
            <button onClick={close} style={{ background: 'transparent', border: '1px solid #334155', color: '#e2e8f0', padding: '4px 10px', borderRadius: 6 }}>×</button>
          </div>
          <div style={{ flex: 1 }}>
            <SingleWindowChat usersProvider={usersProvider} chatBase={chatBase} />
          </div>
        </div>
      )}
    </div>
  );
}
