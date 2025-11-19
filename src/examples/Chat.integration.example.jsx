// Chat.integration.example.jsx - how to mount the single window chat
import React from "react";
import { AuthConfigProvider } from "../context/AuthConfigContext";
import SingleWindowChat from "../components/SingleWindowChat";

export default function ChatExample() {
  const getAuthToken = async () => null; // supply your token getter if needed
  const usersProvider = async () => {
    // TODO: replace with your users endpoint or return [] to use only bot
    return [
      { id: "u-1", name: "Abhi" },
      { id: "u-2", name: "Manager" }
    ];
  };

  return (
    <AuthConfigProvider getAuthToken={getAuthToken}>
      <div style={{ height: '80vh', padding: 16 }}>
        <SingleWindowChat usersProvider={usersProvider} />
      </div>
    </AuthConfigProvider>
  );
}
