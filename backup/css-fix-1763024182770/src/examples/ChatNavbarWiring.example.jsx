// ChatNavbarWiring.example.jsx - demonstrates adding chat toggle to nav
import React from "react";
import { AuthConfigProvider } from "../context/AuthConfigContext";
import { ChatUiProvider } from "../context/ChatUiContext";
import ChatToggleButton from "../components/ChatToggleButton";
import ChatDrawer from "../components/ChatDrawer";

function Navbar() {
  return (
    <div style={{ height: 56, background: '#0b1220', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12 }}>
      <div style={{ fontWeight: 600 }}>Super Admin Control Panel</div>
      <div style={{ marginLeft: 'auto' }}>
        <ChatToggleButton />
      </div>
    </div>
  );
}

function AppShell() {
  const usersProvider = async () => [ { id: 'u-1', name: 'Abhi' }, { id: 'u-2', name: 'Manager' } ];
  return (
    <>
      <Navbar />
      <div style={{ padding: 24 }}>Main Dashboard Content...</div>
      <ChatDrawer usersProvider={usersProvider} />
    </>
  );
}

export default function Root() {
  const getAuthToken = async () => null;
  return (
    <AuthConfigProvider getAuthToken={getAuthToken}>
      <ChatUiProvider>
        <AppShell />
      </ChatUiProvider>
    </AuthConfigProvider>
  );
}
