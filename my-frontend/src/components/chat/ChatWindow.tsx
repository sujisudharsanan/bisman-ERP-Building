"use client";
import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Send, Smile, Maximize2, Minimize2, Settings, Trash2, Download, Paperclip, X } from 'lucide-react';
import ChatMessage from './ChatMessage';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import { useTranslation } from 'next-i18next';

interface Message {
  id: number;
  sender: string;
  text: string;
  time: string;
  isMine: boolean;
}

interface Contact {
  id: number;
  name: string;
  avatar: string;
  online: boolean;
}

interface ChatWindowProps {
  contact?: Contact;
  messages: Message[];
  onSendMessage?: (message: string) => Promise<void>;
  isLoading?: boolean;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  onClearChat?: () => void;
  onExportChat?: () => void;
  onOpenSettings?: () => void;
  onMinimize?: () => void;
  onClose?: () => void;
  onFilesSelected?: (files: File[]) => Promise<void> | void;
  onStartCall?: () => void;
}
export default function ChatWindow(props: ChatWindowProps) {
  const { t } = useTranslation('common');
  const { contact, messages, onSendMessage, isLoading, isFullScreen, onToggleFullScreen, onClearChat, onExportChat, onOpenSettings, onMinimize, onClose, onFilesSelected, onStartCall } = props;
  const [inputMessage, setInputMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll behavior: auto-scroll only if near bottom
  const containerRef = useRef<HTMLDivElement>(null);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);
  const [unseenCount, setUnseenCount] = useState(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      const threshold = 80; // px from bottom
      const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
      setIsUserScrolledUp(!atBottom);
    };
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, []);
  useEffect(() => {
    if (!isUserScrolledUp) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setUnseenCount(0);
    } else {
      // Increment unseen when scrolled up
      if (messages.length > 0) setUnseenCount(c => c + 1);
    }
  }, [messages, isUserScrolledUp]);

  // a11y: close emoji picker with Esc
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowEmojiPicker(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleSend = async () => {
    if (inputMessage.trim() && onSendMessage) {
      await onSendMessage(inputMessage);
      setInputMessage('');
    }
  };


  const handleEmojiClick = (emojiData: EmojiClickData) => {
    const input = inputRef.current;
    if (input) {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const textBefore = inputMessage.substring(0, start);
      const textAfter = inputMessage.substring(end);
      const newText = textBefore + emojiData.emoji + textAfter;
      setInputMessage(newText);
      setTimeout(() => {
        const newCursorPos = start + emojiData.emoji.length;
        input.setSelectionRange(newCursorPos, newCursorPos);
        input.focus();
      }, 0);
    }
  };


  // Drag and drop handlers
  useEffect(() => {
    const preventDefaults = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const highlight = () => setIsDragging(true);
    const unhighlight = () => setIsDragging(false);

    const dropHandler = (e: DragEvent) => {
      preventDefaults(e);
      setIsDragging(false);
      const dt = e.dataTransfer;
      if (!dt) return;
      const files = Array.from(dt.files || []);
      if (files.length === 0) return;
      setPendingFiles(files);
    };

    // Bind to window so dropping anywhere over the chat activates the overlay
    ['dragenter','dragover','dragleave','drop'].forEach(eventName => {
      window.addEventListener(eventName, preventDefaults);
    });
    window.addEventListener('dragenter', highlight);
    window.addEventListener('dragover', highlight);
    window.addEventListener('dragleave', unhighlight);
    window.addEventListener('drop', dropHandler);

    return () => {
      ['dragenter','dragover','dragleave','drop'].forEach(eventName => {
        window.removeEventListener(eventName, preventDefaults);
      });
      window.removeEventListener('dragenter', highlight);
      window.removeEventListener('dragover', highlight);
      window.removeEventListener('dragleave', unhighlight);
      window.removeEventListener('drop', dropHandler);
    };
  }, []);

  const clearPending = () => setPendingFiles([]);
  const acceptPending = async () => {
    if (pendingFiles.length === 0) return;
    try {
      await onFilesSelected?.(pendingFiles);
      // Synthetic echo of attachments
      for (const file of pendingFiles) {
        const desc = `📎 Attached: ${file.name} (${Math.ceil(file.size/1024)} KB)`;
        await onSendMessage?.(desc);
      }
    } finally {
      clearPending();
    }
  };

  if (!contact) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-[#071018]" role="region" aria-label="Chat window">
        <p className="text-gray-400 dark:text-gray-400 text-sm">Select a contact to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50 dark:bg-[#071018] min-w-0 overflow-hidden relative" role="region" aria-label={`Conversation with ${contact.name}`}>
      {/* Header */}
      <div className="bg-white dark:bg-[#071018] border-b border-gray-200 dark:border-gray-700 px-3 py-2.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative">
            <img
              src={contact.avatar}
              alt={contact.name}
              className="w-8 h-8 rounded-full object-cover"
              onError={(e) => {
                const target = e.currentTarget;
                target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(contact.name)}&background=random`;
              }}
            />
            {contact.online && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white" aria-label="Online" />}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{contact.name}</h3>
            <p className="text-[10px] text-green-500" aria-live="polite">{contact.online ? t('status.online') : t('status.offline')}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {!isFullScreen && onStartCall && (
            <button
              onClick={onStartCall}
              title={t('chat.start_call')}
              aria-label={t('chat.start_call')}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded-md focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-blue-400"
            >
              {t('chat.start_call')}
            </button>
          )}
          {isFullScreen && (
            <>
              <button
                onClick={onClearChat}
                title="Clear Chat"
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#0b1220] rounded-full transition-colors"
              >
                <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </button>
              <button
                onClick={onExportChat}
                title="Export Chat"
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Download className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={onOpenSettings}
                title="Settings"
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Settings className="w-4 h-4 text-gray-600" />
              </button>
            </>
          )}
            <button
              onClick={onToggleFullScreen}
              title={isFullScreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#0b1220] rounded-full transition-colors"
            >
              {isFullScreen ? (
                <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              ) : (
                <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              )}
            </button>
          {!isFullScreen && onMinimize && (
            <button
              onClick={onMinimize}
              title="Minimize to bottom"
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
          {!isFullScreen && onClose && (
            <button
              onClick={onClose}
              title="Close chat"
              className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900 rounded-full transition-colors group"
            >
              <X className="w-4 h-4 text-gray-600 dark:text-gray-300 group-hover:text-red-600" />
            </button>
          )}
          <button className="p-1.5 hover:bg-gray-100 rounded-full transition-colors">
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={containerRef} className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent" role="list" aria-label="Message list">
        {messages.map(message => (
          <ChatMessage key={message.id} message={message} avatar={contact.avatar} />
        ))}
        {isLoading && (
          <div className="flex items-start gap-2" role="status" aria-live="polite">
            <img src={contact.avatar} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
            <div className="bg-white dark:bg-[#0b1220] px-3 py-2 rounded-2xl shadow-sm">
              <div className="flex gap-1" aria-hidden>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      {unseenCount > 0 && isUserScrolledUp && (
        <button
          onClick={() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); setUnseenCount(0); setIsUserScrolledUp(false); }}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full shadow focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-blue-400"
          aria-label={t('chat.new_messages')}
        >
          {t('chat.new_messages')} • {unseenCount}
        </button>
      )}

      {/* Input Area pinned at bottom */}
      <div className="bg-white dark:bg-[#071018] border-t border-gray-200 dark:border-gray-700 p-2.5 relative">
        {/* Drag overlay */}
        {isDragging && pendingFiles.length === 0 && (
          <div className="absolute inset-0 z-40 bg-slate-900/40 flex items-center justify-center pointer-events-none">
            <div className="border-2 border-dashed border-white/70 rounded-xl px-6 py-4 bg-white/10 text-white text-sm">
              Drop files to attach
            </div>
          </div>
        )}

        {/* Pending files preview */}
        {pendingFiles.length > 0 && (
          <div className="absolute -top-24 left-2 right-2 z-40 bg-white dark:bg-[#0b1220] border border-slate-200 dark:border-gray-700 rounded-lg shadow p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-slate-700 dark:text-gray-200">Attachments ({pendingFiles.length})</span>
              <div className="flex gap-2">
                <button onClick={clearPending} className="text-xs text-slate-500 dark:text-gray-300 hover:underline">Clear</button>
                <button onClick={acceptPending} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Add</button>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {pendingFiles.map((f, idx) => (
                <div key={idx} className="px-2 py-1 bg-slate-100 dark:bg-[#0c1118] rounded text-[11px] text-slate-700 dark:text-gray-200 whitespace-nowrap">
                  {f.name}
                </div>
              ))}
            </div>
          </div>
        )}
        {/* Emoji Picker Popup */}
        {showEmojiPicker && (
          <div 
            ref={emojiPickerRef}
            className="absolute bottom-16 left-2 z-50 rounded-xl shadow-md"
          >
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              width={300}
              height={400}
              searchPlaceHolder="Search emoji..."
              previewConfig={{ showPreview: false }}
            />
          </div>
        )}
        
        <div className="flex items-center gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files;
              if (!files || files.length === 0) return;
              const list = Array.from(files);
              setPendingFiles(list);
              onFilesSelected?.(list);
              // reset so selecting same file again triggers change
              e.currentTarget.value = '';
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#0b1220] rounded-full transition-colors flex-shrink-0 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-blue-400"
            title="Attach files"
            aria-label="Attach files"
          >
            <Paperclip className="w-4 h-4 text-gray-500 dark:text-gray-300" />
          </button>
          <button 
            ref={emojiButtonRef}
            onClick={() => setShowEmojiPicker(s=>!s)}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-[#0b1220] rounded-full transition-colors flex-shrink-0 focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-blue-400"
            aria-label="Insert emoji"
          >
            <Smile className="w-4 h-4 text-gray-500" />
          </button>
          <input
            ref={inputRef}
            type="text"
            placeholder={t('chat.placeholder')}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e)=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); handleSend(); } }}
            disabled={isLoading}
            className="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-[#071018] rounded-full text-sm text-gray-900 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Message input"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !inputMessage.trim()}
            className="p-2 bg-blue-500 hover:bg-blue-600 rounded-full transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-blue-400"
            aria-label="Send message"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
