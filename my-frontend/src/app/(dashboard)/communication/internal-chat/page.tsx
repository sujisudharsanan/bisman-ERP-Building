'use client';

import React, { useState, useMemo } from 'react';
import {
  MessageSquare,
  Users,
  Search,
  Plus,
  Send,
  Paperclip,
  MoreVertical,
  Phone,
  Video,
  Star,
  Archive,
  Trash2,
  Check,
  CheckCheck,
  Clock,
  Circle,
  Image as ImageIcon,
  File,
  Smile,
  Settings,
  Bell,
  BellOff
} from 'lucide-react';

// ============================================================================
// Type Definitions
// ============================================================================

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
  type: 'text' | 'image' | 'file';
  attachment?: {
    name: string;
    size: string;
    url: string;
  };
}

interface ChatRoom {
  id: string;
  name: string;
  type: 'direct' | 'group' | 'channel';
  participants: string[];
  participantCount?: number;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  isOnline?: boolean;
  isMuted?: boolean;
  isPinned?: boolean;
}

// ============================================================================
// Mock Data
// ============================================================================

const currentUserId = 'user1';

const mockChatRooms: ChatRoom[] = [
  {
    id: 'chat1',
    name: 'Rajesh Sharma',
    type: 'direct',
    participants: ['user1', 'user2'],
    lastMessage: 'The order has been dispatched from Mumbai hub',
    lastMessageTime: '10:30 AM',
    unreadCount: 3,
    isOnline: true
  },
  {
    id: 'chat2',
    name: 'Sales Team',
    type: 'group',
    participants: ['user1', 'user2', 'user3', 'user4', 'user5'],
    participantCount: 12,
    lastMessage: 'Meeting rescheduled to 3 PM',
    lastMessageTime: '9:45 AM',
    unreadCount: 0,
    isPinned: true
  },
  {
    id: 'chat3',
    name: 'Priya Patel',
    type: 'direct',
    participants: ['user1', 'user3'],
    lastMessage: 'Thanks for the update!',
    lastMessageTime: 'Yesterday',
    unreadCount: 0,
    isOnline: false
  },
  {
    id: 'chat4',
    name: 'Inventory Alerts',
    type: 'channel',
    participants: ['user1'],
    participantCount: 45,
    lastMessage: 'Low stock alert: SKU-12345',
    lastMessageTime: '8:00 AM',
    unreadCount: 12,
    isMuted: true
  },
  {
    id: 'chat5',
    name: 'Amit Kumar',
    type: 'direct',
    participants: ['user1', 'user4'],
    lastMessage: 'Can you check the payment status?',
    lastMessageTime: 'Yesterday',
    unreadCount: 1,
    isOnline: true
  },
  {
    id: 'chat6',
    name: 'Warehouse Operations',
    type: 'group',
    participants: ['user1', 'user2', 'user3'],
    participantCount: 8,
    lastMessage: 'Stock count completed for Section A',
    lastMessageTime: 'Monday',
    unreadCount: 0
  }
];

const mockMessages: Record<string, ChatMessage[]> = {
  chat1: [
    { id: 'm1', senderId: 'user2', senderName: 'Rajesh Sharma', content: 'Hi, I need an update on order #12345', timestamp: '10:15 AM', status: 'read', type: 'text' },
    { id: 'm2', senderId: 'user1', senderName: 'You', content: 'Sure, let me check the status for you', timestamp: '10:18 AM', status: 'read', type: 'text' },
    { id: 'm3', senderId: 'user1', senderName: 'You', content: 'The order is currently in transit from Mumbai hub', timestamp: '10:20 AM', status: 'read', type: 'text' },
    { id: 'm4', senderId: 'user2', senderName: 'Rajesh Sharma', content: 'Great! When can we expect delivery?', timestamp: '10:22 AM', status: 'read', type: 'text' },
    { id: 'm5', senderId: 'user1', senderName: 'You', content: 'Based on the current tracking, it should arrive by tomorrow evening', timestamp: '10:25 AM', status: 'delivered', type: 'text' },
    { id: 'm6', senderId: 'user2', senderName: 'Rajesh Sharma', content: 'The order has been dispatched from Mumbai hub', timestamp: '10:30 AM', status: 'read', type: 'text' },
    { id: 'm7', senderId: 'user2', senderName: 'Rajesh Sharma', content: 'Here is the tracking document', timestamp: '10:30 AM', status: 'read', type: 'file', attachment: { name: 'tracking_12345.pdf', size: '256 KB', url: '#' } },
    { id: 'm8', senderId: 'user2', senderName: 'Rajesh Sharma', content: 'Please confirm receipt', timestamp: '10:31 AM', status: 'read', type: 'text' }
  ],
  chat2: [
    { id: 'm1', senderId: 'user3', senderName: 'Priya Patel', content: 'Team, quarterly review meeting is scheduled for tomorrow', timestamp: '9:00 AM', status: 'read', type: 'text' },
    { id: 'm2', senderId: 'user4', senderName: 'Amit Kumar', content: 'What time?', timestamp: '9:15 AM', status: 'read', type: 'text' },
    { id: 'm3', senderId: 'user3', senderName: 'Priya Patel', content: 'Initially planned for 2 PM', timestamp: '9:20 AM', status: 'read', type: 'text' },
    { id: 'm4', senderId: 'user5', senderName: 'Sneha Reddy', content: 'I have a client call at 2. Can we reschedule?', timestamp: '9:30 AM', status: 'read', type: 'text' },
    { id: 'm5', senderId: 'user3', senderName: 'Priya Patel', content: 'Meeting rescheduled to 3 PM', timestamp: '9:45 AM', status: 'read', type: 'text' }
  ]
};

// ============================================================================
// Sub-Components
// ============================================================================

function ChatRoomItem({ room, isActive, onClick }: { room: ChatRoom; isActive: boolean; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
        isActive ? 'bg-blue-50 border-l-2 border-blue-600' : 'hover:bg-gray-50'
      }`}
    >
      <div className="relative">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
          room.type === 'group' ? 'bg-green-500' : room.type === 'channel' ? 'bg-purple-500' : 'bg-blue-500'
        }`}>
          {room.type === 'group' ? <Users className="w-5 h-5" /> :
           room.type === 'channel' ? <MessageSquare className="w-5 h-5" /> :
           room.name.charAt(0)}
        </div>
        {room.isOnline && room.type === 'direct' && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center">
          <h4 className="font-medium text-gray-900 truncate flex items-center gap-1">
            {room.name}
            {room.isPinned && <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
            {room.isMuted && <BellOff className="w-3 h-3 text-gray-400" />}
          </h4>
          <span className="text-xs text-gray-500">{room.lastMessageTime}</span>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-500 truncate">{room.lastMessage}</p>
          {room.unreadCount > 0 && (
            <span className={`min-w-[20px] h-5 px-1.5 flex items-center justify-center text-xs font-medium text-white rounded-full ${
              room.isMuted ? 'bg-gray-400' : 'bg-blue-600'
            }`}>
              {room.unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[70%] ${isOwn ? 'order-2' : ''}`}>
        {!isOwn && (
          <p className="text-xs text-gray-500 mb-1 ml-1">{message.senderName}</p>
        )}
        <div className={`rounded-lg p-3 ${
          isOwn ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
        }`}>
          {message.type === 'file' && message.attachment && (
            <div className={`flex items-center gap-2 p-2 mb-2 rounded ${isOwn ? 'bg-blue-500' : 'bg-white'}`}>
              <File className="w-8 h-8" />
              <div>
                <p className="text-sm font-medium">{message.attachment.name}</p>
                <p className={`text-xs ${isOwn ? 'text-blue-200' : 'text-gray-500'}`}>{message.attachment.size}</p>
              </div>
            </div>
          )}
          <p className="text-sm">{message.content}</p>
        </div>
        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
          <span className={`text-xs ${isOwn ? 'text-gray-500' : 'text-gray-400'}`}>{message.timestamp}</span>
          {isOwn && (
            message.status === 'read' ? <CheckCheck className="w-4 h-4 text-blue-500" /> :
            message.status === 'delivered' ? <CheckCheck className="w-4 h-4 text-gray-400" /> :
            <Check className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
        <p className="text-gray-500">Choose a chat from the sidebar to start messaging</p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function InternalChatPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [messageInput, setMessageInput] = useState('');

  const filteredRooms = useMemo(() => {
    const sorted = [...mockChatRooms].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });

    if (!searchQuery) return sorted;
    return sorted.filter(room => 
      room.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const currentMessages = selectedRoom ? mockMessages[selectedRoom.id] || [] : [];

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    // In real app, send message to server
    console.log('Sending:', messageInput);
    setMessageInput('');
  };

  return (
    <div className="h-screen flex bg-white">
      {/* Sidebar */}
      <div className="w-80 border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold text-gray-900">Messages</h1>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg" title="New Chat">
                <Plus className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg" title="Settings">
                <Settings className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-auto">
          {filteredRooms.map((room) => (
            <ChatRoomItem
              key={room.id}
              room={room}
              isActive={selectedRoom?.id === room.id}
              onClick={() => setSelectedRoom(room)}
            />
          ))}
        </div>
      </div>

      {/* Chat Area */}
      {selectedRoom ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                selectedRoom.type === 'group' ? 'bg-green-500' : 
                selectedRoom.type === 'channel' ? 'bg-purple-500' : 'bg-blue-500'
              }`}>
                {selectedRoom.type === 'group' ? <Users className="w-5 h-5" /> :
                 selectedRoom.type === 'channel' ? <MessageSquare className="w-5 h-5" /> :
                 selectedRoom.name.charAt(0)}
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">{selectedRoom.name}</h2>
                <p className="text-xs text-gray-500">
                  {selectedRoom.type === 'direct' ? (
                    selectedRoom.isOnline ? 'Online' : 'Offline'
                  ) : (
                    `${selectedRoom.participantCount || selectedRoom.participants.length} members`
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {selectedRoom.type === 'direct' && (
                <>
                  <button className="p-2 hover:bg-gray-100 rounded-lg" title="Voice Call">
                    <Phone className="w-5 h-5 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded-lg" title="Video Call">
                    <Video className="w-5 h-5 text-gray-600" />
                  </button>
                </>
              )}
              <button className="p-2 hover:bg-gray-100 rounded-lg" title="More">
                <MoreVertical className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-auto p-4 bg-gray-50">
            {currentMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isOwn={message.senderId === currentUserId}
              />
            ))}
          </div>

          {/* Message Input */}
          <div className="p-4 border-t bg-white">
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-100 rounded-lg" title="Attach File">
                <Paperclip className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 hover:bg-gray-100 rounded-lg" title="Add Image">
                <ImageIcon className="w-5 h-5 text-gray-600" />
              </button>
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="w-full px-4 py-2 border rounded-full pr-10"
                />
                <button className="absolute right-3 top-1/2 transform -translate-y-1/2" title="Emoji">
                  <Smile className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <button 
                onClick={handleSendMessage}
                disabled={!messageInput.trim()}
                className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <EmptyChat />
      )}
    </div>
  );
}
