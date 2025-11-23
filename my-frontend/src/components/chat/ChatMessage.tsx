"use client";
import React from 'react';
import { useTranslation } from 'next-i18next';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();
  const { t } = useTranslation('common');
  const messageAvatar = message.avatar || avatar;
  const isBotMessage = !message.isMine && (message.sender.includes('AI') || message.sender.includes('Bot') || message.sender.includes('BISMAN'));
  return (
    <div className={`flex ${message.isMine ? 'justify-end' : 'justify-start'} items-end gap-2 chat-msg-enter`} role="listitem" aria-label={message.isMine ? t('message.you') : `${message.sender} ${t('message.assistant')}` }>
      {/* Avatar for received messages */}
      {!message.isMine && (
        isBotMessage ? (
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0" aria-hidden>
            <span className="text-white text-sm">🤖</span>
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full flex-shrink-0 overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
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
          className={`px-3 py-2 rounded-2xl shadow-sm focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-blue-400`}
        >
          <p className={`text-xs leading-relaxed break-words ${message.isMine ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>{message.text}</p>
        </div>
        <span className="text-[9px] text-gray-400 dark:text-gray-500 mt-1 px-1" aria-hidden>{message.time}</span>
      </div>

      {/* Avatar for sent messages */}
      {message.isMine && (
        <div className="w-6 h-6 rounded-full flex-shrink-0 overflow-hidden bg-blue-100 dark:bg-blue-900 flex items-center justify-center" aria-hidden>
          {user?.profile_pic_url ? (
            <img
              src={user.profile_pic_url.replace('/uploads/', '/api/secure-files/')}
              alt="Me"
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.currentTarget as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const span = document.createElement('span');
                  span.className = 'text-xs font-bold text-blue-600';
                  span.textContent = (user.username || (user as any).name || 'U').charAt(0).toUpperCase();
                  parent.replaceChildren(span);
                }
              }}
            />
          ) : (
            <span className="text-xs font-bold text-blue-600 dark:text-blue-300">
              {(user?.username || (user as any)?.name || 'U').charAt(0).toUpperCase()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
