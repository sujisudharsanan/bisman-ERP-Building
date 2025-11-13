"use client";
import React from 'react';

interface Message {
  id: number;
  sender: string;
  text: string;
  time: string;
  isMine: boolean;
  avatar?: string; // Optional avatar for the message
}

interface ChatMessageProps {
  message: Message;
  avatar: string;
}

export default function ChatMessage({ message, avatar }: ChatMessageProps) {
  // Use message.avatar if provided, otherwise use the contact avatar
  const messageAvatar = message.avatar || avatar;
  
  // Check if this is a bot message (sender contains 'AI' or 'Bot')
  const isBotMessage = !message.isMine && (message.sender.includes('AI') || message.sender.includes('Bot') || message.sender.includes('BISMAN'));
  
  return (
    <div className={`flex ${message.isMine ? 'justify-end' : 'justify-start'} items-end gap-2`}>
      {/* Avatar for received messages */}
      {!message.isMine && (
        isBotMessage ? (
          // Bot avatar with gradient background - always visible
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-sm">🤖</span>
          </div>
        ) : (
          // Regular user avatar
          <div className="w-6 h-6 rounded-full flex-shrink-0 overflow-hidden bg-gray-200 flex items-center justify-center">
            <img
              src={messageAvatar}
              alt={message.sender}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(message.sender)}&background=random&size=24`;
              }}
            />
          </div>
        )
      )}

      {/* Message Bubble */}
      <div className={`flex flex-col ${message.isMine ? 'items-end' : 'items-start'} max-w-[70%]`}>
        <div
          className={`px-3 py-2 rounded-2xl shadow-sm ${
            message.isMine
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-br-none'
              : 'bg-white text-gray-800 rounded-bl-none'
          }`}
        >
          <p className="text-xs leading-relaxed break-words">{message.text}</p>
        </div>
        <span className="text-[9px] text-gray-400 mt-1 px-1">{message.time}</span>
      </div>

      {/* Avatar for sent messages */}
      {message.isMine && (
        <div className="w-6 h-6 rounded-full flex-shrink-0 overflow-hidden bg-blue-100 flex items-center justify-center">
          <img
            src="https://i.pravatar.cc/150?img=33"
            alt="Me"
            className="w-full h-full object-cover"
            onError={(e) => {
              // Fallback to emoji if image fails to load
              const target = e.currentTarget;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const span = document.createElement('span');
                span.className = 'text-xs';
                span.textContent = '👤';
                parent.replaceChildren(span);
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
