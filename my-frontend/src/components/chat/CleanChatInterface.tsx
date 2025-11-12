'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Send, 
  Users, 
  User, 
  Smile, 
  Paperclip, 
  MoreVertical,
  Search,
  Hash,
  Lock,
  Bot
} from 'lucide-react';

interface Message {
  id: string;
  message: string;
  user_id: string;
  create_at: number;
  username?: string;
  userAvatar?: string;
  isBot?: boolean;
}

interface Channel {
  id: string;
  name: string;
  display_name: string;
  type: 'O' | 'P' | 'D' | 'G'; // Open, Private, Direct, Group
  unread_count?: number;
}

interface TeamMember {
  id: string;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  nickname?: string;
  delete_at?: number;
}

interface ChatUser {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string;
  isOnline?: boolean;
}

interface UserData {
  summary: {
    pendingApprovals: number;
    inProcessTasks: number;
    completedRecently: number;
    totalPaymentRequests: number;
  };
  pendingTasks: Array<{
    id: string;
    type: string;
    title: string;
    amount: number;
    currency: string;
    clientName: string;
    createdAt: string;
    currentLevel: number;
    status: string;
  }>;
  recentPayments: Array<{
    id: string;
    requestId: string;
    clientName: string;
    totalAmount: number;
    currency: string;
    status: string;
    createdAt: string;
  }>;
  notifications: Array<{
    id: string;
    type: string;
    message: string;
    timestamp: string;
    priority: string;
  }>;
}

interface SearchUser {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: string;
  position: string;
}

export default function CleanChatInterface() {
  const { user } = useAuth();
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [newMessage]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize: Provision user and load team members
  useEffect(() => {
    if (!user?.email) return;
    
    (async () => {
      try {
        setLoading(true);
        
        // Step 1: Provision user
        await fetch('/api/mattermost/provision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user: {
              id: (user as any).id,
              email: (user as any).email,
              name: (user as any).name || (user as any).fullName || (user as any).username,
              role: (user as any).role || (user as any).roleName
            }
          })
        });

        // Step 2: Login
        const demoPass = 'TempPass123!';
        await fetch('/api/mattermost/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, password: demoPass }),
          credentials: 'include'
        });

        // Step 3: Load team members as chat users
        await loadChatUsers();

        // Step 4: Load user's ERP data (tasks, payments, notifications)
        await loadUserData();
        
      } catch (error) {
        console.error('[CleanChat] Initialization error:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.email]);

  // Load team members as chat users
  const loadChatUsers = async () => {
    try {
      const response = await fetch('/api/mattermost/team-members');
      if (response.ok) {
        const data = await response.json();
        const members: TeamMember[] = data.members || [];
        
        // Filter out deleted users and current user, convert to ChatUser format
        const users: ChatUser[] = members
          .filter((m: TeamMember) => !m.delete_at && m.email !== user?.email)
          .map((m: TeamMember) => ({
            id: m.id,
            name: m.first_name && m.last_name 
              ? `${m.first_name} ${m.last_name}` 
              : m.nickname || m.username,
            username: m.username,
            email: m.email,
            isOnline: true
          }));
        
        setChatUsers(users);
      }
    } catch (error) {
      console.error('[CleanChat] Failed to load chat users:', error);
    }
  };

  // Load user's ERP data (pending tasks, payments, etc.)
  const loadUserData = async () => {
    try {
      const response = await fetch('/api/chat-bot/user-data');
      if (response.ok) {
        const data = await response.json();
        setUserData(data.data);
      }
    } catch (error) {
      console.error('[CleanChat] Failed to load user data:', error);
    }
  };

  // Search users in the system
  const searchUsers = async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      const response = await fetch(`/api/chat-bot/search-users?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.data || []);
      }
    } catch (error) {
      console.error('[CleanChat] User search failed:', error);
    }
  };

  // Load messages for a channel
  const loadMessages = async (channelId: string) => {
    try {
      const response = await fetch(`/api/mattermost/messages?channelId=${channelId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('[CleanChat] Failed to load messages:', error);
    }
  };

  // Send a message
  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    // If no user selected, show bot response
    if (!selectedUser) {
      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        message: getBotResponse(newMessage),
        user_id: 'bot',
        create_at: Date.now(),
        username: 'Spark Assistant',
        isBot: true
      };
      
      setMessages(prev => [...prev, {
        id: `user-${Date.now()}`,
        message: newMessage,
        user_id: (user as any)?.id || 'current-user',
        create_at: Date.now(),
        username: 'You'
      }, botMessage]);
      
      setNewMessage('');
      return;
    }

    // Send to Mattermost if user is selected
    if (!activeChannel) return;

    try {
      const response = await fetch('/api/mattermost/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: activeChannel.id,
          message: newMessage
        })
      });

      if (response.ok) {
        setNewMessage('');
        // Reload messages to show the new one
        await loadMessages(activeChannel.id);
      }
    } catch (error) {
      console.error('[CleanChat] Failed to send message:', error);
    }
  };

  // Friendly bot conversation database
  const getBotResponse = (userMessage: string): string => {
    const msg = userMessage.toLowerCase().trim();
    
    // ===================
    // ERP DATA QUERIES
    // ===================
    
    // PENDING TASKS / APPROVALS
    if (msg.includes('pending') || msg.includes('approval')) {
      if (!userData) {
        return "Loading your data... Please try again in a moment! ⏳";
      }
      
      const pendingCount = userData.summary.pendingApprovals;
      
      if (pendingCount === 0) {
        return "✅ **Great news!** You have no pending approvals right now!\n\nYou're all caught up! 🎉";
      }
      
      const tasksList = userData.pendingTasks.slice(0, 3).map((task, idx) => 
        `${idx + 1}. **${task.clientName}** - ${task.currency} ${task.amount.toLocaleString()}\n   Level ${task.currentLevel} | ${task.status}`
      ).join('\n\n');
      
      return `📋 **You have ${pendingCount} pending approval${pendingCount > 1 ? 's' : ''}:**\n\n${tasksList}${pendingCount > 3 ? `\n\n...and ${pendingCount - 3} more` : ''}\n\nNeed details? Just ask!`;
    }
    
    // PAYMENT REQUESTS
    if (msg.includes('payment') && !msg.includes('can you do')) {
      if (!userData) {
        return "Loading your data... Please try again in a moment! ⏳";
      }
      
      const paymentCount = userData.recentPayments.length;
      
      if (paymentCount === 0) {
        return "💰 You have no recent payment requests.\n\nWant to create one? Go to Payment Requests in the sidebar!";
      }
      
      const paymentsList = userData.recentPayments.slice(0, 3).map((pr, idx) => 
        `${idx + 1}. **${pr.requestId}** - ${pr.clientName}\n   ${pr.currency} ${pr.totalAmount.toLocaleString()} | ${pr.status}`
      ).join('\n\n');
      
      return `💰 **Recent Payment Requests:**\n\n${paymentsList}${paymentCount > 3 ? `\n\n...and ${paymentCount - 3} more` : ''}`;
    }
    
    // NOTIFICATIONS
    if (msg.includes('notification') || msg.includes('alert')) {
      if (!userData) {
        return "Loading your data... Please try again in a moment! ⏳";
      }
      
      const notifCount = userData.notifications.length;
      
      if (notifCount === 0) {
        return "🔔 **No new notifications!**\n\nYou're all up to date! ✅";
      }
      
      const notifList = userData.notifications.slice(0, 3).map((notif, idx) => 
        `${idx + 1}. ${notif.priority === 'high' ? '🔴' : notif.priority === 'medium' ? '🟡' : '🟢'} ${notif.message}`
      ).join('\n\n');
      
      return `🔔 **Recent Notifications:**\n\n${notifList}${notifCount > 3 ? `\n\n...and ${notifCount - 3} more` : ''}`;
    }
    
    // DASHBOARD / SUMMARY
    if (msg.includes('dashboard') || msg.includes('summary') || msg.includes('overview') || (msg.includes('show') && msg.includes('status'))) {
      if (!userData) {
        return "Loading your data... Please try again in a moment! ⏳";
      }
      
      return `📊 **Your Dashboard Summary:**\n\n` +
        `✅ Pending Approvals: **${userData.summary.pendingApprovals}**\n` +
        `⚙️ In-Process Tasks: **${userData.summary.inProcessTasks}**\n` +
        `✔️ Completed Recently: **${userData.summary.completedRecently}**\n` +
        `💰 Payment Requests: **${userData.summary.totalPaymentRequests}**\n\n` +
        `Want details? Ask "show pending tasks" or "show payment requests"!`;
    }
    
    // SEARCH USERS
    if (msg.includes('find user') || msg.includes('search user') || (msg.includes('who is') && !msg.includes('who are you'))) {
      const searchTerm = msg.replace(/find user|search user|who is/g, '').trim();
      if (searchTerm.length >= 2) {
        searchUsers(searchTerm);
        return `🔍 Searching for "${searchTerm}"...\n\nCheck the user list for results!`;
      }
      return "👥 To search for a user, type:\n\"find user [name]\" or \"who is [name]\"";
    }
    
    // ===================
    // GENERAL CONVERSATIONS
    // ===================
    
    // Greetings
    if (msg.includes('hello') || msg.includes('hi') || msg.includes('hey') || msg === 'hii' || msg === 'hlo') {
      const greetings = [
        `Hello! 👋 I'm Spark Assistant. ${userData ? `You have ${userData.summary.pendingApprovals} pending task${userData.summary.pendingApprovals !== 1 ? 's' : ''}.` : ''} How can I help?`,
        `Hi there! 😊 ${userData && userData.summary.pendingApprovals > 0 ? '🔔 You have pending approvals!' : 'All clear!'} What can I do for you?`,
        "Hey! 🌟 I'm here to help. What do you need?",
        "Hello! ✨ Ready to assist you. How may I help?"
      ];
      return greetings[Math.floor(Math.random() * greetings.length)];
    }
    
    // How are you
    if (msg.includes('how are you') || msg.includes('how r u') || msg.includes('whats up') || msg.includes("what's up")) {
      return "I'm doing great! 😊 Thanks for asking! I'm here and ready to help you with anything you need. How about you?";
    }
    
    // Good responses
    if (msg.includes('good') || msg.includes('great') || msg.includes('awesome') || msg.includes('nice') || msg.includes('cool')) {
      return "That's wonderful to hear! 🎉 Is there anything I can help you with today?";
    }
    
    // Not good responses
    if (msg.includes('not good') || msg.includes('bad') || msg.includes('sad') || msg.includes('problem')) {
      return "I'm sorry to hear that! 😔 I'm here to help. Would you like to talk to a team member? You can select one from the left sidebar.";
    }
    
    // Help requests
    if (msg.includes('help') || msg.includes('assist') || msg.includes('support')) {
      return "I can help you with:\n\n📊 System information\n🧭 Navigation tips\n👥 Team collaboration\n📝 Quick questions\n\nSelect a team member from the left sidebar to start chatting with them directly!";
    }
    
    // Who are you
    if (msg.includes('who are you') || msg.includes('what are you') || msg.includes('your name')) {
      return "I'm Spark Assistant! ⚡ Your friendly AI helper for the BISMAN ERP system. I'm here 24/7 to assist you! 🤖";
    }
    
    // What can you do
    if (msg.includes('what can you do') || msg.includes('your features') || msg.includes('capabilities')) {
      return "I can:\n\n✨ Answer basic questions\n💬 Have friendly conversations\n🔍 Help you navigate the system\n� Connect you with team members\n📚 Provide system information\n\nJust ask me anything!";
    }
    
    // Thank you
    if (msg.includes('thank') || msg.includes('thanks') || msg.includes('thx')) {
      const thanks = [
        "You're welcome! 😊 Happy to help!",
        "No problem at all! 🌟 Anytime!",
        "Glad I could help! ✨",
        "You're very welcome! 😊 Feel free to ask anytime!"
      ];
      return thanks[Math.floor(Math.random() * thanks.length)];
    }
    
    // Goodbye
    if (msg.includes('bye') || msg.includes('goodbye') || msg.includes('see you') || msg.includes('gtg')) {
      const goodbyes = [
        "Goodbye! Have a great day! 👋",
        "See you later! Take care! 🌟",
        "Bye! Feel free to come back anytime! 😊",
        "Catch you later! Have an amazing day! ✨"
      ];
      return goodbyes[Math.floor(Math.random() * goodbyes.length)];
    }
    
    // Yes responses
    if (msg === 'yes' || msg === 'yeah' || msg === 'yep' || msg === 'sure' || msg === 'ok' || msg === 'okay') {
      return "Great! 😊 How can I help you? Feel free to ask me anything or select a team member to chat!";
    }
    
    // No responses
    if (msg === 'no' || msg === 'nope' || msg === 'nah') {
      return "No worries! 👍 Let me know if you need anything else!";
    }
    
    // Time questions
    if (msg.includes('time') || msg.includes('what time')) {
      const now = new Date();
      return `The current time is ${now.toLocaleTimeString()}. 🕐 Is there anything else I can help you with?`;
    }
    
    // Date questions
    if (msg.includes('date') || msg.includes('what day') || msg.includes('today')) {
      const now = new Date();
      return `Today is ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. 📅 How can I help you today?`;
    }
    
    // Love/like responses
    if (msg.includes('love you') || msg.includes('like you')) {
      return "Aww, that's sweet! 💙 I'm here to help you anytime! 🤗";
    }
    
    // Jokes
    if (msg.includes('joke') || msg.includes('funny')) {
      const jokes = [
        "Why did the ERP system go to therapy? It had too many issues to resolve! 😄",
        "What's an AI's favorite snack? Computer chips! 🍟😊",
        "Why don't programmers like nature? It has too many bugs! 🐛😂",
        "How do you comfort a JavaScript bug? You console it! 😄"
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    }
    
    // Weather
    if (msg.includes('weather')) {
      return "I can't check the weather right now, but I hope it's nice where you are! 🌤️ Is there anything else I can help with?";
    }
    
    // Bot questions
    if (msg.includes('are you real') || msg.includes('are you human')) {
      return "I'm an AI assistant! 🤖 Not human, but I'm here to help you just as much! Think of me as your digital helper! ✨";
    }
    
    // Compliments
    if (msg.includes('smart') || msg.includes('intelligent') || msg.includes('helpful')) {
      return "Thank you so much! 🌟 That means a lot! I always try my best to help! 😊";
    }
    
    // Default response with suggestions
    return "I'm Spark Assistant! 🤖 I'm here to help!\n\nTry asking:\n• Show pending tasks\n• Show dashboard\n• Show payment requests\n• Find user [name]\n• Tell me a joke\n• What time is it?\n\nOr select a team member to chat! 😊";
  };

  const handleUserClick = async (chatUser: ChatUser) => {
    setSelectedUser(chatUser);
    setMessages([]); // Clear bot messages
    
    // Create or get DM channel with this user
    try {
      const response = await fetch('/api/mattermost/create-dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: chatUser.username })
      });
      
      if (response.ok) {
        const data = await response.json();
        const channel = data.channel;
        setActiveChannel(channel);
        await loadMessages(channel.id);
      }
    } catch (error) {
      console.error('[CleanChat] Failed to create DM:', error);
    }
  };

  const getUserInitials = (username?: string) => {
    if (!username) return '??';
    const parts = username.split('.');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return username.slice(0, 2).toUpperCase();
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  // Filter users based on search
  const filteredUsers = chatUsers.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        Please log in to use chat
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-white dark:bg-gray-900">
      {/* Sidebar - Users List */}
      <div className="w-60 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            Team Members
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {chatUsers.length} online
          </p>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Spark Bot */}
        <div className="p-2">
          <button
            onClick={() => {
              setSelectedUser(null);
              setActiveChannel(null);
              setMessages([]);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
              !selectedUser
                ? 'bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white flex-shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">Spark Assistant</p>
              <p className="text-xs opacity-75">AI Bot</p>
            </div>
          </button>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((chatUser) => (
              <button
                key={chatUser.id}
                onClick={() => handleUserClick(chatUser)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  selectedUser?.id === chatUser.id
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                  {getUserInitials(chatUser.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{chatUser.name}</p>
                  <p className="text-xs opacity-75 truncate">{chatUser.email}</p>
                </div>
                {chatUser.isOnline && (
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                )}
              </button>
            ))
          ) : (
            <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No users found
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedUser || !selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="h-14 px-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {selectedUser ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                      {getUserInitials(selectedUser.name)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {selectedUser.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedUser.email}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Spark Assistant
                      </h3>
                      <p className="text-xs text-green-500">
                        ● Online
                      </p>
                    </div>
                  </>
                )}
              </div>
              <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                <MoreVertical className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length > 0 ? (
                messages.map((message) => (
                  <div key={message.id} className="flex gap-3">
                    {/* Avatar */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${
                      message.isBot 
                        ? 'bg-gradient-to-br from-blue-500 to-purple-500'
                        : 'bg-gradient-to-br from-green-400 to-blue-500'
                    }`}>
                      {message.isBot ? <Bot className="w-4 h-4" /> : getUserInitials(message.username)}
                    </div>

                    {/* Message Content */}
                    <div className="flex-1">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-900 dark:text-white">
                          {message.username || 'Unknown User'}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(message.create_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {message.message}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  {selectedUser ? (
                    <>
                      <User className="w-12 h-12 mb-2 opacity-50" />
                      <p>Start a conversation with {selectedUser.name}</p>
                    </>
                  ) : (
                    <>
                      <Bot className="w-12 h-12 mb-2 opacity-50" />
                      <p>Ask me anything or select a team member to chat!</p>
                    </>
                  )}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-end gap-2">
                <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 focus-within:ring-2 focus-within:ring-blue-500">
                  <textarea
                    ref={textareaRef}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={selectedUser ? `Message ${selectedUser.name}...` : "Chat with Spark Assistant..."}
                    rows={1}
                    className="w-full px-4 py-3 bg-transparent resize-none focus:outline-none text-gray-900 dark:text-white max-h-32 overflow-y-auto"
                    style={{ minHeight: '44px' }}
                  />
                  <div className="flex items-center gap-2 px-3 pb-2">
                    <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors">
                      <Smile className="w-4 h-4 text-gray-500" />
                    </button>
                    <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors">
                      <Paperclip className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            Select a user to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
