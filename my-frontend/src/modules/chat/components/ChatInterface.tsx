'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Send, 
  Sparkles,
  MoreVertical,
  Paperclip,
  Smile,
  Maximize2,
  Minimize2,
  X,
  Settings,
  Phone,
  Plus,
  Link2,
  CheckSquare,
  ExternalLink
} from 'lucide-react';
import dynamic from 'next/dynamic';
import CallControls from './CallControls';
import IncomingCall, { IncomingCallData } from './IncomingCall';
import TaskDetailView from './TaskDetailView';
import { Theme } from 'emoji-picker-react';
import { useOcrUpload, isBillFile } from '@/hooks/useOcrUpload';
import { useChatSocket } from '../hooks/useChatSocket';
import { useSoundNotification } from '../hooks/useSoundNotification';

// Dynamically import EmojiPicker to avoid SSR issues
const EmojiPicker = dynamic(
  () => import('emoji-picker-react'),
  { ssr: false }
);

interface Message {
  id: string;
  message: string;
  user_id: string;
  create_at: number;
  username?: string;
  isBot?: boolean;
}

interface ChatUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  isOnline?: boolean;
  role?: string;
  roleName?: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority?: string;
}

type ActiveView = 'bey' | 'user' | 'task';

interface CleanChatInterfaceProps {
  onClose?: () => void;
}

export default function CleanChatInterface({ onClose }: CleanChatInterfaceProps = {}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [thinking, setThinking] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('bey');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Map<string, boolean>>(new Map());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [openTasks, setOpenTasks] = useState<Task[]>([]);
  const [isTaskPanelExpanded, setIsTaskPanelExpanded] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    serialNumber: '',
    title: '',
    description: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
    assigneeId: ''
  });
  const [taskAttachments, setTaskAttachments] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const taskFileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const shouldTriggerTaskCreation = useRef(false);
  
  // Separate state for Bey AI messages (persists when switching between chats)
  const beyMessagesRef = useRef<Message[]>([]);
  
  // Incoming call state
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [activeCallRoom, setActiveCallRoom] = useState<string | null>(null);

  // OCR Upload Hook
  const { uploadBill, isUploading, isProcessing, progress, error: ocrError, result: ocrResult, reset: resetOcr } = useOcrUpload();
  const [processingBillId, setProcessingBillId] = useState<string | null>(null);
  const [newMessageNotification, setNewMessageNotification] = useState<{username: string; message: string} | null>(null);

  // Sound Notification Hook
  const { playMessageSound, playCallRingtone, stopCallRingtone, playCallEndSound } = useSoundNotification();

  // Handle incoming socket messages
  const handleSocketMessage = useCallback((data: { threadId: string; message: any }) => {
    console.log('[ChatInterface] Socket message received:', data);
    console.log('[ChatInterface] Current thread:', currentThreadId, 'Message thread:', data.threadId);
    
    // Only add message if it's for the current thread and not from current user
    // Compare as strings to handle number/string mismatches
    if (String(data.threadId) === String(currentThreadId) && data.message) {
      const msg = data.message;
      
      // Skip if it's our own message (already added locally)
      if (String(msg.senderId) === String(user?.id) || String(msg.sender?.id) === String(user?.id)) {
        console.log('[ChatInterface] Skipping own message');
        return;
      }
      
      const newMsg: Message = {
        id: msg.id || `socket-${Date.now()}`,
        message: msg.content,
        user_id: String(msg.senderId || msg.sender?.id),
        create_at: new Date(msg.createdAt).getTime(),
        username: msg.sender?.username || 'User',
        isBot: false
      };
      
      console.log('[ChatInterface] Adding new message:', newMsg);
      
      setMessages(prev => {
        // Avoid duplicates
        if (prev.some(m => m.id === newMsg.id)) {
          console.log('[ChatInterface] Duplicate message, skipping');
          return prev;
        }
        return [...prev, newMsg];
      });
      
      // Show notification for new message
      setNewMessageNotification({
        username: msg.sender?.username || 'User',
        message: msg.content.length > 50 ? msg.content.substring(0, 50) + '...' : msg.content
      });
      
      // Auto-hide notification after 3 seconds
      setTimeout(() => setNewMessageNotification(null), 3000);
      
      // Play message notification sound
      playMessageSound();
    } else {
      console.log('[ChatInterface] Message not for current thread or no message data');
    }
  }, [currentThreadId, user?.id, playMessageSound]);

  // Handle incoming call - always show regardless of current view
  const handleIncomingCall = useCallback((data: IncomingCallData) => {
    console.log('[ChatInterface] 🔔 Incoming call received:', data);
    console.log('[ChatInterface] Current activeCallRoom:', activeCallRoom);
    console.log('[ChatInterface] Current user id:', user?.id, 'Caller id:', data.callerId);
    
    // Don't show if it's from ourselves or if we're already in a call
    if (String(data.callerId) === String(user?.id)) {
      console.log('[ChatInterface] Ignoring call from self');
      return;
    }
    
    if (!activeCallRoom) {
      setIncomingCall(data);
    }
  }, [activeCallRoom]);

  // Handle call accepted by other user
  const handleCallAccepted = useCallback((data: { callId: string; roomName: string; acceptedBy: number; acceptedByName: string }) => {
    console.log('[ChatInterface] Call accepted by:', data.acceptedByName);
    // The person who initiated the call will see this when someone accepts
  }, []);

  // Handle call rejected by other user
  const handleCallRejected = useCallback((data: { callId: string; rejectedBy: number; rejectedByName: string; reason: string }) => {
    console.log('[ChatInterface] Call rejected by:', data.rejectedByName);
  }, []);

  // Chat Socket Hook for real-time messaging
  const { connected: socketConnected, socket: chatSocket, joinThread, leaveThread, sendTyping } = useChatSocket({
    onNewMessage: handleSocketMessage,
    onIncomingCall: handleIncomingCall,
    onCallAccepted: handleCallAccepted,
    onCallRejected: handleCallRejected
  });

  // Handle accepting incoming call
  const handleAcceptIncomingCall = useCallback((call: IncomingCallData) => {
    console.log('[ChatInterface] Accepting call:', call.callId);
    console.log('[ChatInterface] Call data:', call);
    setIncomingCall(null);
    
    // Set the caller as selected user so CallControls will be rendered
    setSelectedUserId(String(call.callerId));
    setActiveView('user');
    
    // Set the room to join - this triggers CallControls to auto-join
    setActiveCallRoom(call.roomName);
    
    // Notify the caller that we accepted
    if (chatSocket) {
      chatSocket.emit('chat:call:accept', {
        callId: call.callId,
        roomName: call.roomName,
        callerId: call.callerId
      });
    }
    
    // Navigate to the thread
    if (call.threadId) {
      setCurrentThreadId(call.threadId);
    }
  }, [chatSocket]);

  // Handle rejecting incoming call
  const handleRejectIncomingCall = useCallback((call: IncomingCallData) => {
    console.log('[ChatInterface] Rejecting call:', call.callId);
    setIncomingCall(null);
    
    // Notify the caller that we rejected
    if (chatSocket) {
      chatSocket.emit('chat:call:reject', {
        callId: call.callId,
        callerId: call.callerId,
        reason: 'declined'
      });
    }
  }, [chatSocket]);

  // Handle call timeout
  const handleCallTimeout = useCallback((call: IncomingCallData) => {
    console.log('[ChatInterface] Call timed out:', call.callId);
    setIncomingCall(null);
    
    // Notify the caller that we didn't answer
    if (chatSocket) {
      chatSocket.emit('chat:call:reject', {
        callId: call.callId,
        callerId: call.callerId,
        reason: 'no_answer'
      });
    }
  }, [chatSocket]);

  // Join/leave thread when currentThreadId changes
  useEffect(() => {
    if (currentThreadId && socketConnected) {
      console.log('[ChatInterface] Joining socket thread:', currentThreadId);
      joinThread(currentThreadId);
      
      return () => {
        console.log('[ChatInterface] Leaving socket thread:', currentThreadId);
        leaveThread(currentThreadId);
      };
    }
  }, [currentThreadId, socketConnected, joinThread, leaveThread]);

  // Auto-resize textarea with expansion
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200); // Max 200px height
      textareaRef.current.style.height = newHeight + 'px';
    }
  }, [newMessage]);

  // Auto-scroll to bottom when new messages arrive or task form opens
  useEffect(() => {
    // Small delay to ensure DOM has updated
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, showTaskForm]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Load chat users - only those with existing conversations
  useEffect(() => {
    const loadUsers = async () => {
      try {
        // First, get all chat threads to know who has conversations
        const threadsRes = await fetch('/api/chat/threads', { credentials: 'include' });
        let threadUserIds: Set<string> = new Set();
        
        if (threadsRes.ok) {
          const threadsData = await threadsRes.json();
          const threads = threadsData.data || [];
          // Extract user IDs from thread members (users we have conversations with)
          threads.forEach((thread: any) => {
            if (thread.members && thread.members.length === 2) {
              thread.members.forEach((member: any) => {
                if (String(member.id) !== String(user?.id)) {
                  threadUserIds.add(String(member.id));
                }
              });
            }
          });
        }
        
        // Get all users (empty query will return all active users now)
        const response = await fetch('/api/users/search?q=&limit=50');
  if (response.ok) {
          const data = await response.json();
          console.log('[Chat] API response:', data);
          // Backend returns { users: [...] } format
          const users = (data.users || data.data || [])
            .map((u: any) => ({
              id: String(u.id), // Ensure ID is always a string
              name: u.fullName || u.username || u.email?.split('@')[0] || '',
              email: u.email,
              avatar: u.profile_pic_url || u.profilePic,
              isOnline: true,
              role: u.role,
              roleName: u.roleName || u.role,
              hasConversation: threadUserIds.has(String(u.id))
            }))
            // Filter out Admin users only, show all other users
            .filter((u: ChatUser & { hasConversation?: boolean }) => {
              const roleName = (u.roleName || u.role || '').toLowerCase();
              const isAdmin = roleName === 'admin' || roleName === 'super_admin' || roleName === 'superadmin';
              // Show user if not admin (show all users, not just those with conversations)
              return !isAdmin;
            })
            // Sort users with conversations first
            .sort((a: ChatUser & { hasConversation?: boolean }, b: ChatUser & { hasConversation?: boolean }) => {
              if (a.hasConversation && !b.hasConversation) return -1;
              if (!a.hasConversation && b.hasConversation) return 1;
              return (a.name || '').localeCompare(b.name || '');
            });
          setChatUsers(users);
          console.log('[Chat] Loaded users:', users.length, 'users (conversations first)');
          console.log('[Chat] User details:', users.map((u: ChatUser & { hasConversation?: boolean }) => ({ id: u.id, name: u.name, role: u.roleName || u.role, hasChat: u.hasConversation })));
        } else {
          const errorText = await response.text();
          // Treat 404 as a non-fatal case in development where the chat-bot user search route
          // might not be present. Log as a warning to avoid triggering Next's dev overlay.
          if (response.status === 404) {
            console.warn('[Chat] Users API route not found (404) - this may be expected in dev. Response:', errorText);
            setChatUsers([]);
          } else {
            console.error('[Chat] Failed to load users - Status:', response.status, 'Response:', errorText);
          }
        }
      } catch (error) {
        // Downgrade to warn for expected or recoverable failures so dev overlay doesn't block UI
        console.warn('[Chat] Failed to load users (non-fatal):', error);
      }
    };
    loadUsers();
  }, [user]);

  // Listen for task open events from dashboard
  useEffect(() => {
    const handleOpenTaskInChat = (event: CustomEvent) => {
      const task = event.detail;
      console.log('[Chat] Received openTaskInChat event:', task);
      if (task && task.id) {
        console.log('[Chat] Opening task from dashboard:', task);
        // Add to open tasks panel
        const taskForPanel: Task = {
          id: String(task.id),
          title: task.title || 'Untitled Task',
          status: task.status || 'DRAFT',
          priority: task.priority
        };
        setOpenTasks(prev => {
          if (prev.find(t => t.id === taskForPanel.id)) {
            return prev; // Already exists
          }
          return [...prev, taskForPanel];
        });
        setIsTaskPanelExpanded(true);
        // Switch to task view
        setActiveView('task');
        setSelectedTaskId(String(task.id));
        setSelectedUserId(null);
        // If chat is minimized, expand it
        setIsFullscreen(true);
      }
    };

    // Listen for both direct event (when chat is already open) and internal event (when chat just opened)
    window.addEventListener('openTaskInChat', handleOpenTaskInChat as EventListener);
    window.addEventListener('openTaskInChatInternal', handleOpenTaskInChat as EventListener);
    return () => {
      window.removeEventListener('openTaskInChat', handleOpenTaskInChat as EventListener);
      window.removeEventListener('openTaskInChatInternal', handleOpenTaskInChat as EventListener);
    };
  }, []); // No dependencies - event handler uses functional updates

  // Real-time user search with debouncing
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        // Backend returns { users: [...] } format
        const users = (data.users || data.data || [])
          .map((u: any) => ({
            id: String(u.id), // Ensure ID is string for consistent comparison
            name: u.fullName || u.username || u.email?.split('@')[0] || '',
            email: u.email,
            avatar: u.profile_pic_url || u.profilePic,
            isOnline: true,
            role: u.role,
            roleName: u.roleName || u.role
          }))
          // Filter out Admin users from search results
          .filter((u: ChatUser) => {
            const roleName = (u.roleName || u.role || '').toLowerCase();
            const isAdmin = roleName === 'admin' || roleName === 'super_admin' || roleName === 'superadmin';
            return !isAdmin;
          });
        setSearchResults(users);
        console.log('[Chat] Search results for "' + query + '":', users.length, 'users');
      } else {
        const errorText = await response.text();
        if (response.status === 404) {
          console.warn('[Chat] User search route not found (404) - treating as no results. Response:', errorText);
          setSearchResults([]);
        } else {
          console.error('[Chat] User search failed - Status:', response.status, 'Response:', errorText);
        }
      }
    } catch (error) {
      console.warn('[Chat] Search failed (non-fatal):', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle search input change with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce search - trigger after 300ms of no typing
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(query);
    }, 300);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Get users to display - search results if searching, otherwise default users
  const displayUsers = searchQuery.trim() ? searchResults : chatUsers;

  // Helper to find selected user from all known users
  const getSelectedUser = (userId: string | null): ChatUser | undefined => {
    if (!userId) return undefined;
    // Use String() comparison to handle type mismatches (number vs string IDs)
    return chatUsers.find(u => String(u.id) === String(userId)) || searchResults.find(u => String(u.id) === String(userId));
  };

  // Load tasks
  useEffect(() => {
    const loadTasks = async () => {
      try {
        const response = await fetch('/api/tasks');
        if (response.ok) {
          const data = await response.json();
          const taskList = data.tasks?.slice(0, 10).map((t: any) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority
          })) || [];
          setTasks(taskList);
        }
      } catch (error) {
        console.error('[Chat] Failed to load tasks:', error);
      }
    };
    loadTasks();
  }, []);

  // Load personalized greeting with pending tasks
  useEffect(() => {
    if (user && activeView === 'bey' && messages.length === 0) {
      loadGreeting();
    }
  }, [user, activeView]);

  // Load previous conversation when switching to Bey
  useEffect(() => {
    if (user && activeView === 'bey' && !conversationId) {
      loadLatestConversation();
    }
  }, [user, activeView]);

  // Listen for external task creation trigger (e.g., from dashboard Create button)
  useEffect(() => {
    const handleExternalCreateTask = () => {
      console.log('✨ External trigger for task creation - setting flag');
      shouldTriggerTaskCreation.current = true;
      
      // Switch to Bey view if not already there
      if (activeView !== 'bey') {
        setActiveView('bey');
      }
    };

    window.addEventListener('spark:createTask', handleExternalCreateTask);
    return () => window.removeEventListener('spark:createTask', handleExternalCreateTask);
  }, [activeView]);

  // Handle task creation when component is ready
  useEffect(() => {
    if (shouldTriggerTaskCreation.current && user && activeView === 'bey') {
      console.log('✨ Triggering task creation now that component is ready');
      shouldTriggerTaskCreation.current = false;
      
      // Use setTimeout to ensure DOM is ready
      setTimeout(() => {
        // Add user message
        const userMessage: Message = {
          id: `user-${Date.now()}`,
          message: 'create task now',
          user_id: (user as any)?.id || 'current-user',
          create_at: Date.now(),
          username: 'You'
        };
        setMessages(prev => [...prev, userMessage]);
        
        // Show task form
        setShowTaskForm(true);
        
        // Add bot response
        const botMessage: Message = {
          id: `bot-${Date.now()}`,
          message: "✨ Great! Let's create a new task.\n\nPlease fill in the form below and I'll create the task for you! 📝",
          user_id: 'bey',
          create_at: Date.now(),
          username: 'Bey',
          isBot: true
        };
        setMessages(prev => [...prev, botMessage]);
      }, 100); // Small delay to ensure component is mounted
    }
  }, [user, activeView, shouldTriggerTaskCreation.current]);

  // Generate unique serial number when task form opens
  useEffect(() => {
    if (showTaskForm && !taskFormData.serialNumber) {
      // Generate unique serial number: TASK-YYYYMMDD-HHMMSS-XXX
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
      const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
      const serialNumber = `TASK-${dateStr}-${timeStr}-${randomStr}`;
      
      console.log('🔢 Generated serial number:', serialNumber);
      setTaskFormData(prev => ({ ...prev, serialNumber }));
    }
  }, [showTaskForm]);

  // Set default assignee to Operations Manager when task form opens
  useEffect(() => {
    if (showTaskForm && chatUsers.length > 0 && !taskFormData.assigneeId) {
      // Find Operations Manager (or operations_manager role)
      const operationsManager = chatUsers.find(u => 
        u.name?.toLowerCase().includes('operations manager') ||
        u.email?.toLowerCase().includes('operations') ||
        (u as any).role?.toLowerCase().includes('operations_manager') ||
        (u as any).roleName?.toLowerCase().includes('operations_manager')
      );
      
      if (operationsManager) {
        console.log('✅ Auto-selecting Operations Manager as default approver:', operationsManager.name);
        setTaskFormData(prev => ({ ...prev, assigneeId: operationsManager.id }));
      }
    }
  }, [showTaskForm, chatUsers]);

  // Drag and drop handlers for file attachments
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (showTaskForm) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if leaving the chat container entirely
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (showTaskForm && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      setTaskAttachments(prev => [...prev, ...droppedFiles]);
      console.log('📎 Files dropped:', droppedFiles.map(f => f.name));
      
      // Check if any file is a bill/invoice
      const billFiles = droppedFiles.filter(file => isBillFile(file));
      
      if (billFiles.length > 0) {
        // Show analyzing message
        const analyzingMsg: Message = {
          id: `bot-analyzing-${Date.now()}`,
          message: `� Analyzing ${billFiles.length} bill/invoice file(s)...\n\nI'll extract the data and pre-fill the task form for you!`,
          user_id: 'bey',
          create_at: Date.now(),
          username: 'Bey',
          isBot: true
        };
        setMessages(prev => [...prev, analyzingMsg]);
        
        // Process first bill file with OCR
        try {
          const result = await uploadBill(billFiles[0]);
          
          if (result && result.parsed) {
            const { parsed, suggestedTask, confidence, billId } = result;
            
            // Store bill ID for task creation
            setProcessingBillId(billId);
            
            // Pre-fill task form with extracted data
            setTaskFormData(prev => ({
              ...prev,
              title: suggestedTask?.title || `Payment: ${parsed.vendorName || 'Vendor'}`,
              description: suggestedTask?.description || 
                `Invoice #${parsed.invoiceNumber || 'N/A'}\nAmount: ${parsed.currency || '₹'}${parsed.totalAmount || 'N/A'}\nVendor: ${parsed.vendorName || 'N/A'}\n\nExtracted from bill attachment.`,
              priority: suggestedTask?.priority || 'MEDIUM'
            }));
            
            // Show success message with extracted data
            const successMsg: Message = {
              id: `bot-ocr-success-${Date.now()}`,
              message: `✅ Bill analyzed successfully! (${confidence}% confidence)\n\n📋 **Extracted Data:**\n` +
                `• Vendor: ${parsed.vendorName || 'N/A'}\n` +
                `• Invoice #: ${parsed.invoiceNumber || 'N/A'}\n` +
                `• Amount: ${parsed.currency || '₹'}${parsed.totalAmount || 'N/A'}\n` +
                `• Date: ${parsed.invoiceDate || 'N/A'}\n\n` +
                `I've pre-filled the task form. Please review and submit! 📝`,
              user_id: 'bey',
              create_at: Date.now(),
              username: 'Bey',
              isBot: true
            };
            setMessages(prev => [...prev, successMsg]);
          } else {
            throw new Error('OCR processing failed');
          }
        } catch (error) {
          console.error('OCR Error:', error);
          const errorMsg: Message = {
            id: `bot-ocr-error-${Date.now()}`,
            message: `⚠️ I couldn't extract data from the bill automatically.\n\nPlease fill in the task details manually. The bill is still attached.`,
            user_id: 'bey',
            create_at: Date.now(),
            username: 'Bey',
            isBot: true
          };
          setMessages(prev => [...prev, errorMsg]);
        }
      } else {
        // Regular file attachment (not a bill)
        const botMsg: Message = {
          id: `bot-${Date.now()}`,
          message: `�📎 Added ${droppedFiles.length} file(s) to the task`,
          user_id: 'bey',
          create_at: Date.now(),
          username: 'Bey',
          isBot: true
        };
        setMessages(prev => [...prev, botMsg]);
      }
    }
  };

  // Handle task file selection from button with OCR detection
  const handleTaskFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setTaskAttachments(prev => [...prev, ...selectedFiles]);
      console.log('📎 Files selected:', selectedFiles.map(f => f.name));
      
      // Check if any file is a bill/invoice
      const billFiles = selectedFiles.filter(file => isBillFile(file));
      
      if (billFiles.length > 0 && showTaskForm) {
        // Show analyzing message
        const analyzingMsg: Message = {
          id: `bot-analyzing-${Date.now()}`,
          message: `� Analyzing ${billFiles.length} bill/invoice file(s)...\n\nI'll extract the data and pre-fill the task form for you!`,
          user_id: 'bey',
          create_at: Date.now(),
          username: 'Bey',
          isBot: true
        };
        setMessages(prev => [...prev, analyzingMsg]);
        
        // Process first bill file with OCR
        try {
          const result = await uploadBill(billFiles[0]);
          
          if (result && result.parsed) {
            const { parsed, suggestedTask, confidence, billId } = result;
            
            // Store bill ID for task creation
            setProcessingBillId(billId);
            
            // Pre-fill task form with extracted data
            setTaskFormData(prev => ({
              ...prev,
              title: suggestedTask?.title || `Payment: ${parsed.vendorName || 'Vendor'}`,
              description: suggestedTask?.description || 
                `Invoice #${parsed.invoiceNumber || 'N/A'}\nAmount: ${parsed.currency || '₹'}${parsed.totalAmount || 'N/A'}\nVendor: ${parsed.vendorName || 'N/A'}\n\nExtracted from bill attachment.`,
              priority: suggestedTask?.priority || 'MEDIUM'
            }));
            
            // Show success message with extracted data
            const successMsg: Message = {
              id: `bot-ocr-success-${Date.now()}`,
              message: `✅ Bill analyzed successfully! (${confidence}% confidence)\n\n📋 **Extracted Data:**\n` +
                `• Vendor: ${parsed.vendorName || 'N/A'}\n` +
                `• Invoice #: ${parsed.invoiceNumber || 'N/A'}\n` +
                `• Amount: ${parsed.currency || '₹'}${parsed.totalAmount || 'N/A'}\n` +
                `• Date: ${parsed.invoiceDate || 'N/A'}\n\n` +
                `I've pre-filled the task form. Please review and submit! 📝`,
              user_id: 'bey',
              create_at: Date.now(),
              username: 'Bey',
              isBot: true
            };
            setMessages(prev => [...prev, successMsg]);
          } else {
            throw new Error('OCR processing failed');
          }
        } catch (error) {
          console.error('OCR Error:', error);
          const errorMsg: Message = {
            id: `bot-ocr-error-${Date.now()}`,
            message: `⚠️ I couldn't extract data from the bill automatically.\n\nPlease fill in the task details manually. The bill is still attached.`,
            user_id: 'bey',
            create_at: Date.now(),
            username: 'Bey',
            isBot: true
          };
          setMessages(prev => [...prev, errorMsg]);
        }
      } else {
        // Regular file attachment (not a bill)
        const botMsg: Message = {
          id: `bot-${Date.now()}`,
          message: `�📎 Added ${selectedFiles.length} file(s) to the task`,
          user_id: 'bey',
          create_at: Date.now(),
          username: 'Bey',
          isBot: true
        };
        setMessages(prev => [...prev, botMsg]);
      }
    }
  };

  // Remove attachment
  const removeAttachment = (index: number) => {
    setTaskAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const loadGreeting = async () => {
    try {
      const response = await fetch('/api/chat/greeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const greetingMessage: Message = {
          id: `bot-greeting-${Date.now()}`,
          message: data.greeting || 'Hello! How can I help you today?',
          user_id: 'bey',
          create_at: Date.now(),
          isBot: true
        };
        setMessages([greetingMessage]);
      } else {
        // Fallback to simple welcome
        const fullName = (user as any).name || (user as any).fullName || (user as any).username || 'there';
        const firstName = fullName.split(/[\s_]+/)[0]; // Extract first name only
        const welcomeMessage: Message = {
          id: `bot-welcome-${Date.now()}`,
          message: `Hey ${firstName}! 👋 I'm Bey, your intelligent assistant for BISMAN ERP. How can I help you today?`,
          user_id: 'bey',
          create_at: Date.now(),
          username: 'Bey',
          isBot: true
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('[Chat] Failed to load greeting:', error);
      // Fallback greeting
      const fullName = (user as any).name || (user as any).fullName || (user as any).username || 'there';
      const firstName = fullName.split(/[\s_]+/)[0]; // Extract first name only
      const welcomeMessage: Message = {
        id: `bot-welcome-${Date.now()}`,
        message: `Hey ${firstName}! 👋 I'm Bey, your intelligent assistant for BISMAN ERP. How can I help you today?`,
        user_id: 'bey',
        create_at: Date.now(),
        username: 'Bey',
        isBot: true
      };
      setMessages([welcomeMessage]);
    }
  };

  const loadLatestConversation = async () => {
    try {
      // Only load if we're in Bey view
      if (activeView !== 'bey') return;
      
      const response = await fetch('/api/chat/conversation/latest', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.conversationId && data.messages && data.messages.length > 0) {
          // Filter to only include messages that are part of Bey conversation
          // (has isBot flag or is a user message to bot)
          const beyMessages = data.messages.filter((m: Message) => 
            m.isBot === true || m.isBot === false // All messages from this API are Bey conversations
          );
          setConversationId(data.conversationId);
          setMessages(beyMessages);
          console.log('[Chat] Loaded Bey conversation:', beyMessages.length, 'messages');
        } else {
          // No conversation found, show empty
          setMessages([]);
          setConversationId(null);
        }
      }
    } catch (error) {
      console.error('[Chat] Failed to load conversation:', error);
    }
  };

  const saveConversation = async () => {
    try {
      await fetch('/api/chat/conversation/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          conversationId,
          messages,
          contextType: 'general'
        })
      });
    } catch (error) {
      console.error('[Chat] Failed to save conversation:', error);
    }
  };

  const handleFeedback = async (messageId: string, helpful: boolean) => {
    try {
      const response = await fetch('/api/chat/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messageId,
          helpful
        })
      });
      
      if (response.ok) {
        setFeedbackGiven(prev => new Map(prev).set(messageId, helpful));
      }
    } catch (error) {
      console.error('[Chat] Failed to submit feedback:', error);
    }
  };

  // Format call duration for display
  const formatCallDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins} min ${secs} sec`;
    }
    return `${secs} sec`;
  };

  // Handle call start - add message to chat (only in user chat view)
  const handleCallStart = async (callType: 'audio' | 'video', roomName: string) => {
    // Only add call messages in user chat view
    if (activeView !== 'user') return;
    
    const callMessage: Message = {
      id: `call-start-${Date.now()}`,
      message: `📞 ${callType === 'video' ? 'Video' : 'Audio'} call started`,
      user_id: String(user?.id),
      create_at: Date.now(),
      username: (user as any)?.name || 'You',
      isBot: false
    };
    setMessages(prev => [...prev, callMessage]);
    
    // Send call message to thread if we have one
    if (currentThreadId) {
      try {
        await fetch(`/api/chat/threads/${currentThreadId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            content: `📞 Started a ${callType} call. Join: ${window.location.origin}/call/${roomName}`,
            type: 'call'
          })
        });
      } catch (error) {
        console.error('[Chat] Failed to send call message:', error);
      }
    }
  };

  // Handle call end - add message to chat with duration or missed status (only in user chat view)
  const handleCallEnd = async (duration: number, wasAnswered: boolean) => {
    // Only add call messages in user chat view
    if (activeView !== 'user') return;
    
    let callEndMessage: Message;
    let messageContent: string;
    
    if (wasAnswered && duration > 0) {
      // Call was answered - show duration
      messageContent = `📞 Call ended • Duration: ${formatCallDuration(duration)}`;
      callEndMessage = {
        id: `call-end-${Date.now()}`,
        message: messageContent,
        user_id: String(user?.id),
        create_at: Date.now(),
        username: (user as any)?.name || 'You',
        isBot: false
      };
    } else {
      // Call was not answered - show missed
      messageContent = `📞 Missed call`;
      callEndMessage = {
        id: `call-missed-${Date.now()}`,
        message: messageContent,
        user_id: String(user?.id),
        create_at: Date.now(),
        username: (user as any)?.name || 'You',
        isBot: false
      };
    }
    
    setMessages(prev => [...prev, callEndMessage]);
    
    // Send call end message to thread if we have one
    if (currentThreadId) {
      try {
        await fetch(`/api/chat/threads/${currentThreadId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            content: messageContent,
            type: 'call'
          })
        });
      } catch (error) {
        console.error('[Chat] Failed to send call end message:', error);
      }
    }
  };

  // Handle missed call
  const handleCallMissed = async () => {
    // This is called in addition to handleCallEnd when wasAnswered is false
    // Can be used for additional missed call handling like notifications
    console.log('[Chat] Call was missed');
  };

  // Send a message to the intelligent chat engine
  const sendMessage = async () => {
    if (!newMessage.trim() || thinking) return;

    const messageToSend = newMessage.trim();
    const msgLower = messageToSend.toLowerCase();
    
    // Handle slash commands
    if (messageToSend.startsWith('/')) {
      // /status done command - mark task as complete
      if (msgLower.startsWith('/status done') && activeView === 'task' && selectedTaskId) {
        setNewMessage('');
        const systemMsg: Message = {
          id: `system-${Date.now()}`,
          message: '✅ System: Task status updated to COMPLETED',
          user_id: 'system',
          create_at: Date.now(),
          username: 'System',
          isBot: true
        };
        setMessages(prev => [...prev, systemMsg]);
        
        // Update task status via API
        try {
          await fetch(`/api/tasks/${selectedTaskId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ status: 'DONE' })
          });
          // Update local tasks
          setOpenTasks(prev => prev.map(t => t.id === selectedTaskId ? { ...t, status: 'DONE' } : t));
          setTasks(prev => prev.map(t => t.id === selectedTaskId ? { ...t, status: 'DONE' } : t));
        } catch (error) {
          console.error('[Chat] Failed to update task status:', error);
        }
        return;
      }
      
      // /link task command - link a task
      if (msgLower.startsWith('/link task ')) {
        const taskId = messageToSend.substring(11).trim();
        if (taskId) {
          setNewMessage('');
          const linkMsg: Message = {
            id: `user-${Date.now()}`,
            message: `📋 Linked task: ${taskId}`,
            user_id: (user as any)?.id || 'current-user',
            create_at: Date.now(),
            username: 'You'
          };
          setMessages(prev => [...prev, linkMsg]);
        }
        return;
      }
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      message: messageToSend,
      user_id: (user as any)?.id || 'current-user',
      create_at: Date.now(),
      username: 'You'
    };

    setMessages(prev => [...prev, userMessage]);
    setNewMessage('');

    // If chatting with a user (not Bey), use thread-based messaging
    if (activeView === 'user' && selectedUserId) {
      console.log('[Chat] Direct message to user:', selectedUserId, messageToSend);
      
      try {
        let threadId = currentThreadId;
        
        // Create thread if it doesn't exist
        if (!threadId) {
          const createRes = await fetch('/api/chat/threads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              title: `Chat`,
              memberIds: [parseInt(selectedUserId)]
            })
          });
          
          if (createRes.ok) {
            const createData = await createRes.json();
            threadId = createData.data?.id;
            setCurrentThreadId(threadId);
          } else {
            console.error('[Chat] Failed to create thread');
            return;
          }
        }
        
        // Send message to thread
        if (threadId) {
          const msgRes = await fetch(`/api/chat/threads/${threadId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              content: messageToSend,
              type: 'text'
            })
          });
          
          if (!msgRes.ok) {
            console.error('[Chat] Failed to send message');
          }
        }
      } catch (error) {
        console.error('[Chat] Failed to send direct message:', error);
      }
      return; // Don't get AI response for direct messages
    }

    setThinking(true);

    // Check if user wants to create a task (only for Bey chat)
    if (msgLower.includes('create task') || msgLower.includes('new task') || 
        msgLower.includes('add task') || msgLower.includes('make task')) {
      setThinking(false);
      setShowTaskForm(true);
      
      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        message: "✨ Great! Let's create a new task.\n\nPlease fill in the form below and I'll create the task for you! 📝",
        user_id: 'bey',
        create_at: Date.now(),
        username: 'Bey',
        isBot: true
      };
      setMessages(prev => [...prev, botMessage]);
      return;
    }

    try {
      const response = await fetch('/api/chat/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: messageToSend,
          conversationId,
          userId: (user as any)?.id || 'guest',
          userName: (user as any)?.name || (user as any)?.fullName || 'User',
          context: {
            role: (user as any)?.role || (user as any)?.roleName,
            email: (user as any)?.email
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        const botMessage: Message = {
          id: `bot-${Date.now()}`,
          message: data.response || data.reply || data.message || "I'm here to help! Could you rephrase that?",
          user_id: 'bey',
          create_at: Date.now(),
          username: data.persona?.name || 'Bey',
          isBot: true
        };

        setMessages(prev => [...prev, botMessage]);
        
        // Save conversation to database
        await saveConversation();
      } else {
        // Error response
        const botMessage: Message = {
          id: `bot-error-${Date.now()}`,
          message: "Oops! Something went wrong on my end. Mind trying that again? 😅",
          user_id: 'bey',
          create_at: Date.now(),
          username: 'Bey',
          isBot: true
        };
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('[Chat] Failed to send message:', error);
      const botMessage: Message = {
        id: `bot-error-${Date.now()}`,
        message: "Hmm, I'm having trouble connecting right now. Can you try again in a moment?",
        user_id: 'bey',
        create_at: Date.now(),
        username: 'Bey',
        isBot: true
      };
      setMessages(prev => [...prev, botMessage]);
    } finally {
      setThinking(false);
    }
  };

  const getUserInitials = (username?: string) => {
    if (!username || username === 'You') {
      const name = (user as any)?.name || (user as any)?.fullName || (user as any)?.username;
      if (!name) return 'U';
      const parts = name.split(' ');
      if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return name.slice(0, 2).toUpperCase();
    }
    return username.slice(0, 2).toUpperCase();
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const handleEmojiClick = (emojiData: any) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setAttachedFiles(prev => [...prev, ...newFiles]);
    }
    // Reset input so the same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addTaskToPanel = (task: Task) => {
    if (!openTasks.find(t => t.id === task.id)) {
      setOpenTasks(prev => [...prev, task]);
      setIsTaskPanelExpanded(true);
    }
  };

  const removeTaskFromPanel = (taskId: string) => {
    setOpenTasks(prev => prev.filter(t => t.id !== taskId));
    if (openTasks.length <= 1) {
      setIsTaskPanelExpanded(false);
    }
  };

  // Calculate task panel height based on number of open tasks
  const getTaskPanelHeight = () => {
    if (openTasks.length === 0) return '20%';
    if (openTasks.length === 1) return '25%';
    if (openTasks.length === 2) return '35%';
    if (openTasks.length >= 3) return '50%';
    return '20%';
  };

  if (!user) {
    return (
      <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
        Please log in to use chat
      </div>
    );
  }

  return (
    <div className={`flex overflow-hidden ${
      isFullscreen 
        ? 'fixed top-0 right-0 z-50 h-screen w-[33.33vw] shadow-2xl border-l border-gray-700/50' 
        : 'h-full rounded-lg'
    } bg-[#1e1e2e] dark:bg-[#1e1e2e]`}>
      
      {/* Incoming Call Modal */}
      {incomingCall && (
        <IncomingCall
          call={incomingCall}
          onAccept={handleAcceptIncomingCall}
          onReject={handleRejectIncomingCall}
          onTimeout={handleCallTimeout}
          timeoutDuration={30}
        />
      )}
      
      {/* New Message Notification Toast */}
      {newMessageNotification && (
        <div className="fixed top-4 right-4 z-[100] animate-slide-in-right">
          <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 max-w-sm">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              💬
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{newMessageNotification.username}</p>
              <p className="text-xs text-blue-100 truncate">{newMessageNotification.message}</p>
            </div>
            <button 
              onClick={() => setNewMessageNotification(null)}
              className="text-white/70 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {/* Left Sidebar - 28% - Reduced for more room */}
      <div className="bg-[#2b2d42] dark:bg-[#2b2d42] border-r border-gray-700/50 flex flex-col flex-shrink-0 w-[28%] h-full">
        {/* Sidebar Header with Integrated Search */}
        <div className={`p-3 border-b border-gray-700/50 ${!isFullscreen ? 'rounded-tl-lg' : ''}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
              B
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-white font-semibold text-sm">BISMAN ERP</span>
            </div>
            {/* Socket connection indicator */}
            <div 
              className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`}
              title={socketConnected ? 'Connected' : 'Disconnected'}
            />
          </div>
          
          {/* Integrated Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full px-3 py-2 bg-[#1e1e2e] border border-gray-700/50 rounded-lg text-gray-300 text-sm placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          {searchQuery && searchResults.length === 0 && !isSearching && (
            <p className="text-gray-500 text-xs mt-2 px-1">No contacts found</p>
          )}
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto" style={{ height: openTasks.length > 0 ? `calc(100% - ${getTaskPanelHeight()})` : 'auto' }}>
          {/* Bey AI Assistant */}
          <button
            onClick={async () => {
              // Always clear messages first to prevent showing old data
              setMessages([]);
              setConversationId(null); // Reset to trigger fresh load
              
              setActiveView('bey');
              setSelectedUserId(null);
              setSelectedTaskId(null);
              setCurrentThreadId(null);
              
              // Always load fresh Bey conversation from API
              if (user) {
                await loadLatestConversation();
              }
            }}
            className={`w-full flex items-center gap-3 px-3 py-3 hover:bg-[#1e1e2e] transition-colors ${
              activeView === 'bey' ? 'bg-[#1e1e2e] border-l-2 border-blue-500' : ''
            }`}
          >
            <div className="relative flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#2b2d42]"></div>
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-white text-sm font-semibold">Bey</p>
              <p className="text-gray-500 text-xs">AI Assistant</p>
            </div>
          </button>

          {/* Team Members */}
          {displayUsers.length > 0 && (
            <>
              {displayUsers.map((chatUser) => (
                <button
                  key={chatUser.id}
                  onClick={async () => {
                    // Clear everything first - reset all state
                    setMessages([]);
                    setCurrentThreadId(null);
                    setConversationId(null); // Clear Bey conversation ID
                    
                    // Then set the new view
                    setActiveView('user');
                    setSelectedUserId(String(chatUser.id));
                    setSelectedTaskId(null);
                    setSearchQuery('');
                    setSearchResults([]);
                    
                    // Load or create thread with this user
                    try {
                      // First, get all threads and find one with this user
                      const threadsRes = await fetch('/api/chat/threads', { credentials: 'include' });
                      if (threadsRes.ok) {
                        const threadsData = await threadsRes.json();
                        const threads = threadsData.data || [];
                        
                        // Find existing 1-on-1 thread with this user
                        const existingThread = threads.find((t: any) => 
                          t.members?.length === 2 && 
                          t.members.some((m: any) => String(m.id) === String(chatUser.id))
                        );
                        
                        if (existingThread) {
                          setCurrentThreadId(existingThread.id);
                          // Load messages for this thread
                          const messagesRes = await fetch(`/api/chat/threads/${existingThread.id}/messages`, { credentials: 'include' });
                          if (messagesRes.ok) {
                            const messagesData = await messagesRes.json();
                            const threadMessages = (messagesData.messages || []).map((m: any) => ({
                              id: m.id,
                              message: m.content,
                              user_id: String(m.senderId), // Ensure string for comparison
                              create_at: new Date(m.createdAt).getTime(),
                              username: m.sender?.username || 'User',
                              isBot: false
                            }));
                            setMessages(threadMessages);
                          }
                        }
                        // If no thread exists, one will be created when first message is sent
                      }
                    } catch (error) {
                      console.error('[Chat] Failed to load thread:', error);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#1e1e2e] transition-colors ${
                    activeView === 'user' && selectedUserId === chatUser.id ? 'bg-[#1e1e2e]' : ''
                  }`}
                >
                  {/* Professional Avatar - Photo or Clean Initials */}
                  <div className="relative flex-shrink-0">
                    {chatUser.avatar ? (
                      <img 
                        src={chatUser.avatar.startsWith('/uploads/') 
                          ? chatUser.avatar.replace('/uploads/', '/api/secure-files/') 
                          : chatUser.avatar}
                        alt={chatUser.name}
                        className="w-9 h-9 rounded-full object-cover border border-gray-600/50"
                        onError={(e) => {
                          // Fallback to initials on image load error
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-9 h-9 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs font-semibold border border-gray-500/30 ${chatUser.avatar ? 'hidden' : ''}`}>
                      {chatUser.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                    </div>
                    {/* Online Status Indicator */}
                    {chatUser.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#2b2d42]"></div>
                    )}
                  </div>
                  {/* Name & Role with Professional Hierarchy */}
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-white text-sm font-medium truncate">{chatUser.name}</p>
                    {chatUser.roleName && (
                      <p className="text-gray-500 text-[11px] truncate capitalize">{chatUser.roleName.replace(/_/g, ' ').toLowerCase()}</p>
                    )}
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Tasks Section with Professional Design */}
          {tasks.length > 0 && (
            <>
              <div className="px-3 py-2 mt-3">
                <div className="border-t border-gray-700/30"></div>
              </div>
              <div className="px-3 py-2 flex items-center justify-between">
                <p className="text-gray-400 text-xs font-semibold">Recent Tasks</p>
                <span className="text-gray-600 text-[10px]">{tasks.length}</span>
              </div>
              {tasks.slice(0, 5).map((task) => (
                <button
                  key={task.id}
                  onClick={() => {
                    setActiveView('task');
                    setSelectedTaskId(task.id);
                    setSelectedUserId(null);
                    addTaskToPanel(task);
                    setMessages([{
                      id: `task-info-${Date.now()}`,
                      message: `📋 **Task: ${task.title}**\n\nStatus: ${task.status}\nPriority: ${task.priority || 'N/A'}\n\nTask details and updates will appear here.`,
                      user_id: 'system',
                      create_at: Date.now(),
                      username: 'Task Info',
                      isBot: true
                    }]);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-[#1e1e2e] transition-colors ${
                    activeView === 'task' && selectedTaskId === task.id ? 'bg-[#1e1e2e] border-l-2 border-purple-500' : ''
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    task.status === 'DONE' ? 'bg-green-500' :
                    task.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                    task.status === 'CONFIRMED' ? 'bg-yellow-500' :
                    'bg-gray-500'
                  }`}></div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-white text-sm truncate">{task.title}</p>
                    <p className="text-gray-500 text-[10px] capitalize">{task.status.toLowerCase().replace(/_/g, ' ')}</p>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Open Tasks Panel - Professional Minimalist Design */}
        <div 
          className="border-t border-gray-700/50 bg-[#1e1e2e] overflow-y-auto transition-all duration-300"
          style={{ height: getTaskPanelHeight() }}
        >
          <div className="p-3 flex items-center justify-between border-b border-gray-700/50">
            <div className="flex items-center gap-2">
              <span className="text-gray-300 text-xs font-semibold">Open Tasks</span>
              {openTasks.length > 0 && (
                <span className="px-1.5 py-0.5 bg-blue-600/20 text-blue-400 text-[10px] font-medium rounded">
                  {openTasks.length}
                </span>
              )}
            </div>
            {openTasks.length > 0 && (
              <button
                onClick={() => setIsTaskPanelExpanded(!isTaskPanelExpanded)}
                className="text-gray-400 hover:text-white text-xs transition-colors p-1 hover:bg-gray-700/30 rounded"
              >
                {isTaskPanelExpanded ? '−' : '+'}
              </button>
            )}
          </div>
          
          {openTasks.length === 0 ? (
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 text-gray-500 text-xs">
                <CheckSquare className="w-4 h-4 text-gray-600" />
                <span>No pending tasks</span>
              </div>
            </div>
          ) : (
            <div className="p-2">
              {openTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2.5 px-2.5 py-2 mb-1 bg-[#2b2d42]/50 rounded-lg hover:bg-[#353748] transition-colors group border border-transparent hover:border-gray-700/50"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    task.status === 'DONE' ? 'bg-green-500' :
                    task.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                    task.status === 'CONFIRMED' ? 'bg-yellow-500' :
                    'bg-gray-500'
                  }`}></div>
                  <button
                    onClick={() => {
                      setActiveView('task');
                      setSelectedTaskId(task.id);
                      setSelectedUserId(null);
                    }}
                    className="flex-1 text-left min-w-0"
                  >
                    <p className="text-white text-xs font-medium truncate">{task.title}</p>
                    <p className="text-gray-500 text-[10px] capitalize">{task.status.toLowerCase().replace(/_/g, ' ')}</p>
                  </button>
                  <button
                    onClick={() => removeTaskFromPanel(task.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500 hover:text-red-400 p-1"
                    title="Remove from panel"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-gray-700/50">
          <button className="flex items-center gap-2 text-gray-400 hover:text-white text-xs transition-colors w-full px-2 py-2 rounded-lg hover:bg-gray-700/30">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Chat Header - Professional Design */}
        <div className={`h-14 px-4 bg-[#2b2d42] border-b border-gray-700/50 flex items-center justify-between ${!isFullscreen ? 'rounded-tr-lg' : ''}`}>
          <div className="flex items-center gap-3">
            {activeView === 'bey' && (
              <>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#2b2d42]"></div>
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">Bey</h3>
                  <p className="text-gray-400 text-xs">Your AI Assistant • Always available</p>
                </div>
              </>
            )}
            {activeView === 'user' && selectedUserId && (
              <>
                <div className="relative">
                  {getSelectedUser(selectedUserId)?.avatar ? (
                    <img 
                      src={getSelectedUser(selectedUserId)?.avatar?.startsWith('/uploads/') 
                        ? getSelectedUser(selectedUserId)?.avatar?.replace('/uploads/', '/api/secure-files/') 
                        : getSelectedUser(selectedUserId)?.avatar}
                      alt={getSelectedUser(selectedUserId)?.name}
                      className="w-10 h-10 rounded-full object-cover border border-gray-600/50"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-white text-sm font-semibold border border-gray-500/30">
                      {getSelectedUser(selectedUserId)?.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || 'U'}
                    </div>
                  )}
                  {getSelectedUser(selectedUserId)?.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#2b2d42]"></div>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-white text-sm">
                    {getSelectedUser(selectedUserId)?.name || 'Unknown User'}
                  </h3>
                  <p className="text-gray-400 text-xs capitalize">
                    {getSelectedUser(selectedUserId)?.roleName?.replace(/_/g, ' ').toLowerCase() || getSelectedUser(selectedUserId)?.email || 'Direct Message'}
                  </p>
                </div>
              </>
            )}
            {activeView === 'task' && selectedTaskId && (
              <>
                <div className="w-9 h-9 rounded-lg bg-purple-600/20 border border-purple-500/30 flex items-center justify-center">
                  <CheckSquare className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white text-sm truncate">
                      {tasks.find(t => t.id === selectedTaskId)?.title}
                    </h3>
                    <button
                      onClick={() => {
                        // Open task in full detail view
                        window.dispatchEvent(new CustomEvent('openTaskInChat', { detail: { id: selectedTaskId } }));
                      }}
                      className="p-1 hover:bg-gray-700/30 rounded transition-colors"
                      title="View Task Details"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-gray-400 hover:text-white" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500">Chatting about:</span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      tasks.find(t => t.id === selectedTaskId)?.status === 'DONE' 
                        ? 'bg-green-500/20 text-green-400' 
                        : tasks.find(t => t.id === selectedTaskId)?.status === 'IN_PROGRESS'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-gray-600/50 text-gray-400'
                    }`}>
                      {tasks.find(t => t.id === selectedTaskId)?.status?.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Jitsi Call Controls */}
            {(activeView === 'user' || activeView === 'task') && (
              <CallControls 
                threadId={activeView === 'user' ? selectedUserId || undefined : selectedTaskId || undefined}
                taskTitle={activeView === 'task' && selectedTaskId 
                  ? tasks.find(t => t.id === selectedTaskId)?.title 
                  : activeView === 'user' && selectedUserId 
                    ? getSelectedUser(selectedUserId)?.name 
                    : undefined}
                participantName={(user as any)?.name || (user as any)?.fullName || (user as any)?.username || 'User'}
                targetUserIds={selectedUserId ? [parseInt(selectedUserId)] : []}
                socket={chatSocket}
                joinRoomName={activeCallRoom}
                joinCallType="video"
                onError={(error) => console.error('Jitsi error:', error)}
                onCallStart={handleCallStart}
                onCallEnd={(duration, wasAnswered) => {
                  handleCallEnd(duration, wasAnswered);
                  setActiveCallRoom(null); // Clear active call when ended
                }}
                onCallMissed={handleCallMissed}
                onCallJoined={() => {
                  console.log('[ChatInterface] Successfully joined incoming call');
                }}
              />
            )}
            
            {/* Fullscreen Toggle - 50% smaller */}
            <button 
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1 hover:bg-gray-700/30 rounded transition-colors"
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3 h-3 text-gray-400" />
              ) : (
                <Maximize2 className="w-3 h-3 text-gray-400" />
              )}
            </button>
            
            {/* Close button - 50% smaller */}
            {onClose && (
              <button 
                onClick={onClose}
                className="p-1 hover:bg-gray-700/30 rounded transition-colors"
                aria-label="Close chat"
              >
                <span className="text-gray-400 text-xs">✕</span>
              </button>
            )}
          </div>
        </div>

        {/* Task Detail View - Show when a task is selected */}
        {activeView === 'task' && selectedTaskId ? (
          <TaskDetailView
            taskId={selectedTaskId}
            currentUserId={(user as any)?.id}
            onClose={() => {
              setActiveView('bey');
              setSelectedTaskId(null);
            }}
            onMarkComplete={(taskId) => {
              // Update task status in open tasks panel
              setOpenTasks(prev => prev.map(t => 
                t.id === taskId ? { ...t, status: 'COMPLETED' } : t
              ));
            }}
            onCancel={(taskId) => {
              // Update task status in open tasks panel
              setOpenTasks(prev => prev.map(t => 
                t.id === taskId ? { ...t, status: 'CANCELLED' } : t
              ));
            }}
          />
        ) : (
        <>
        {/* Messages */}
        <div 
          ref={chatContainerRef}
          className={`flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 space-y-2 sm:space-y-3 bg-[#1e1e2e] relative ${isDragging ? 'ring-2 ring-blue-500 ring-inset' : ''}`}
          style={{ scrollBehavior: 'smooth' }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {/* Drag overlay */}
          {isDragging && showTaskForm && (
            <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-sm z-10 flex items-center justify-center pointer-events-none">
              <div className="bg-[#2b2d42] border-2 border-blue-500 border-dashed rounded-lg p-8 text-center">
                <Paperclip className="w-12 h-12 text-blue-400 mx-auto mb-3" />
                <p className="text-white font-semibold text-lg mb-1">Drop files here</p>
                <p className="text-gray-400 text-sm">Files will be attached to your task</p>
              </div>
            </div>
          )}
          
          {/* Empty State - When no messages in user chat */}
          {messages.length === 0 && activeView === 'user' && selectedUserId && (
            <div className="flex-1 flex flex-col items-center justify-center h-full min-h-[300px]">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center mb-4 shadow-lg">
                <Send className="w-8 h-8 text-gray-500 transform -rotate-45" />
              </div>
              <h3 className="text-white text-lg font-medium mb-1">Start a conversation</h3>
              <p className="text-gray-500 text-sm text-center max-w-[250px]">
                Send a message to {chatUsers.find(u => u.id === selectedUserId)?.name || 'this user'}
              </p>
              <div className="mt-6 flex items-center gap-2 text-gray-600 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500/50"></div>
                <span>Messages are encrypted end-to-end</span>
              </div>
            </div>
          )}
          
          {messages.map((message) => {
            // Check if message is from current user - works for both bot chat and user chat
            const isFromCurrentUser = !message.isBot && (
              message.user_id === String(user?.id) || 
              message.user_id === (user as any)?.id ||
              message.user_id === 'current-user'
            );
            
            // Check if this is a call message
            const isCallMessage = message.message.startsWith('📞');
            const isMissedCall = message.message.includes('Missed call');
            const isCallEnded = message.message.includes('Call ended');
            const isCallStarted = message.message.includes('call started');
            const isOutgoingCall = message.message.includes('outgoing') || isFromCurrentUser;
            
            // WhatsApp-style call message rendering
            if (isCallMessage) {
              return (
                <div 
                  key={message.id} 
                  className={`flex ${isOutgoingCall ? 'justify-end' : 'justify-start'} my-2`}
                >
                  <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                    isOutgoingCall ? 'bg-[#005c4b]' : 'bg-[#2b2d42]'
                  } shadow-sm max-w-[280px]`}>
                    {/* Call Icon with Background */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isMissedCall ? 'bg-red-500/20' : 
                      isCallEnded ? 'bg-gray-600/30' : 
                      'bg-green-500/20'
                    }`}>
                      {isMissedCall ? (
                        <Phone className="w-5 h-5 text-red-400 transform rotate-[135deg]" />
                      ) : isCallEnded ? (
                        <Phone className="w-5 h-5 text-gray-400" />
                      ) : (
                        <Phone className="w-5 h-5 text-green-400" />
                      )}
                    </div>
                    
                    {/* Call Details */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${
                        isMissedCall ? 'text-red-400' : 'text-white'
                      }`}>
                        {isMissedCall ? 'Missed call' : 
                         isCallEnded ? 'Call ended' : 
                         isOutgoingCall ? 'Outgoing call' : 'Incoming call'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {/* Arrow icon for direction */}
                        <svg className={`w-3 h-3 ${
                          isMissedCall ? 'text-red-400' : 
                          isOutgoingCall ? 'text-green-400 rotate-45' : 'text-blue-400 -rotate-45'
                        }`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className="text-[11px] text-gray-400">
                          {formatTime(message.create_at)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Callback button for missed calls */}
                    {isMissedCall && (
                      <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <Phone className="w-4 h-4 text-green-400" />
                      </button>
                    )}
                  </div>
                </div>
              );
            }
            
            return (
            <div 
              key={message.id} 
              className={`flex ${isFromCurrentUser ? 'justify-end' : 'justify-start'} mb-2`}
            >
              {/* Message Bubble Container */}
              <div className={`relative ${
                message.isBot 
                  ? 'flex gap-2 items-start w-full' 
                  : 'max-w-[80%]'
              }`}>
                {/* Bot Avatar - Only show for Bey assistant */}
                {message.isBot && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white flex-shrink-0 mt-1">
                    <Sparkles className="w-3 h-3" />
                  </div>
                )}
                
                {/* Message Bubble */}
                <div className={`relative ${message.isBot ? 'flex-1' : ''} ${
                  message.isBot 
                    ? 'bg-transparent text-gray-100' 
                    : isFromCurrentUser
                      ? 'bg-[#005c4b] rounded-2xl rounded-tr-md px-3 py-2 shadow-sm'
                      : 'bg-[#2b2d42] rounded-2xl rounded-tl-md px-3 py-2 shadow-sm'
                }`}>
                  {/* Bubble tail for first message or different sender */}
                  {!message.isBot && (
                    <div className={`absolute top-0 ${
                      isFromCurrentUser 
                        ? '-right-1.5 border-l-[8px] border-l-[#005c4b] border-t-[8px] border-t-transparent border-b-[0px]' 
                        : '-left-1.5 border-r-[8px] border-r-[#2b2d42] border-t-[8px] border-t-transparent border-b-[0px]'
                    } w-0 h-0`} style={{ borderStyle: 'solid' }} />
                  )}
                  
                  {/* Sender name - show for received messages (not from current user, not bot) */}
                  {!message.isBot && !isFromCurrentUser && (
                    <p className="text-[11px] font-semibold mb-1 text-blue-400">
                      {message.username || getSelectedUser(selectedUserId)?.name || 'User'}
                    </p>
                  )}
                  
                  {/* Message Text */}
                  <div className={`leading-relaxed whitespace-pre-wrap break-words ${
                    message.isBot ? 'text-sm text-gray-100' : 'text-[13px] text-white'
                  }`}>
                    {message.message}
                  </div>
                  
                  {/* Time & Read Receipt - Only for user messages (WhatsApp style) */}
                  {!message.isBot && (
                    <div className={`flex items-center gap-1 mt-1 ${isFromCurrentUser ? 'justify-end' : 'justify-end'}`}>
                      <span className="text-[10px] text-gray-400">
                        {formatTime(message.create_at)}
                      </span>
                      {/* Double checkmark for sent messages */}
                      {isFromCurrentUser && (
                        <svg className="w-4 h-3 text-blue-400" viewBox="0 0 16 11" fill="none">
                          <path d="M11.071 0.929L4.5 7.5L1.929 4.929" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M14.571 0.929L8 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </div>
                  )}
                  
                  {/* Bot message time - subtle, at the end */}
                  {message.isBot && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-gray-500">
                        {formatTime(message.create_at)}
                      </span>
                      {/* Feedback Buttons - Bottom of bot messages */}
                      {activeView === 'bey' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleFeedback(message.id, true)}
                            className={`p-1 text-[11px] rounded transition-colors ${
                              feedbackGiven.get(message.id) === true
                                ? 'text-green-400'
                                : 'text-gray-500 hover:text-green-400'
                            }`}
                            title="Helpful"
                          >
                            👍
                          </button>
                          <button
                            onClick={() => handleFeedback(message.id, false)}
                            className={`p-1 text-[11px] rounded transition-colors ${
                              feedbackGiven.get(message.id) === false
                                ? 'text-red-400'
                                : 'text-gray-500 hover:text-red-400'
                            }`}
                            title="Not helpful"
                          >
                            👎
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
          })}
          
          {/* Inline Task Creation Form */}
          {showTaskForm && activeView === 'bey' && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white flex-shrink-0 mt-1">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="flex-1 max-h-[450px] overflow-hidden">
                <div className="bg-[#2b2d42] border-2 border-blue-500/50 rounded-lg flex flex-col max-h-full">
                  <div className="flex items-center justify-between p-3 pb-2 flex-shrink-0">
                    <h4 className="font-semibold text-white flex items-center gap-2">
                      ✨ Create New Task
                    </h4>
                  </div>
                  
                  {/* Scrollable Form Content */}
                  <div className="overflow-y-auto px-3 space-y-2.5 flex-1 custom-scrollbar"
                    style={{ maxHeight: 'calc(450px - 120px)' }}
                  >
                  
                  {/* OCR Processing Indicator */}
                  {(isUploading || isProcessing) && (
                    <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-3 flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                      <div className="flex-1">
                        <p className="text-blue-400 text-sm font-medium">
                          🔍 Analyzing bill with OCR...
                        </p>
                        {progress > 0 && (
                          <div className="mt-1.5 bg-gray-700 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-blue-500 h-full transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            ></div>
                          </div>
                        )}
                        <p className="text-gray-400 text-xs mt-1">
                          Extracting vendor, invoice number, amount, and dates...
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* OCR Success Indicator */}
                  {ocrResult && processingBillId && (
                    <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3">
                      <p className="text-green-400 text-sm font-medium mb-2">
                        ✅ Bill data extracted ({ocrResult.confidence}% confidence)
                      </p>
                      <div className="text-xs text-gray-300 space-y-1">
                        {ocrResult.parsed.vendorName && (
                          <p>• Vendor: {ocrResult.parsed.vendorName}</p>
                        )}
                        {ocrResult.parsed.invoiceNumber && (
                          <p>• Invoice #: {ocrResult.parsed.invoiceNumber}</p>
                        )}
                        {ocrResult.parsed.totalAmount && (
                          <p>• Amount: {ocrResult.parsed.currency || '₹'}{ocrResult.parsed.totalAmount}</p>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* OCR Error */}
                  {ocrError && (
                    <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                      <p className="text-red-400 text-sm font-medium">
                        ⚠️ OCR processing failed
                      </p>
                      <p className="text-gray-400 text-xs mt-1">
                        Please fill in the details manually
                      </p>
                    </div>
                  )}
                  
                  {/* Serial Number (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Serial Number
                    </label>
                    <input
                      type="text"
                      value={taskFormData.serialNumber}
                      readOnly
                      className="w-full px-3 py-1.5 border border-gray-600 rounded-lg bg-gray-800 text-gray-400 text-sm font-mono cursor-not-allowed"
                      title="Auto-generated unique identifier"
                    />
                  </div>
                  
                  {/* Task Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Task Title *
                    </label>
                    <input
                      type="text"
                      value={taskFormData.title}
                      onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                      placeholder="Enter task title..."
                      className="w-full px-3 py-1.5 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-[#1e1e2e] text-white text-sm"
                    />
                  </div>
                  
                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={taskFormData.description}
                      onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                      placeholder="Describe the task..."
                      rows={2}
                      className="w-full px-3 py-1.5 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-[#1e1e2e] text-white resize-none text-sm"
                    />
                  </div>
                  
                  {/* Priority */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Priority
                    </label>
                    <div className="flex gap-2">
                      {(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const).map((priority) => (
                        <button
                          key={priority}
                          onClick={() => setTaskFormData({ ...taskFormData, priority })}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            taskFormData.priority === priority
                              ? priority === 'URGENT'
                                ? 'bg-red-500 text-white'
                                : priority === 'HIGH'
                                ? 'bg-orange-500 text-white'
                                : priority === 'MEDIUM'
                                ? 'bg-yellow-500 text-white'
                                : 'bg-green-500 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {priority}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {/* Assign To */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Assign To *
                    </label>
                    <select
                      value={taskFormData.assigneeId}
                      onChange={(e) => setTaskFormData({ ...taskFormData, assigneeId: e.target.value })}
                      className="w-full px-3 py-1.5 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-[#1e1e2e] text-white text-sm"
                    >
                      <option value="">Select user...</option>
                      {chatUsers.map((chatUser) => (
                        <option key={chatUser.id} value={chatUser.id}>
                          {chatUser.name} ({chatUser.email})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* File Attachments */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Attachments
                    </label>
                    <div className="space-y-2">
                      {/* File Upload Button */}
                      <button
                        type="button"
                        onClick={() => taskFileInputRef.current?.click()}
                        className="w-full px-3 py-2 border-2 border-dashed border-gray-600 rounded-lg hover:border-blue-500 hover:bg-blue-500/5 transition-colors flex items-center justify-center gap-2 text-gray-400 hover:text-blue-400 text-sm"
                      >
                        <Paperclip className="w-4 h-4" />
                        <span>Click to attach files or drag & drop</span>
                      </button>
                      <input
                        ref={taskFileInputRef}
                        type="file"
                        multiple
                        onChange={handleTaskFileSelect}
                        className="hidden"
                      />
                      
                      {/* Attached Files List */}
                      {taskAttachments.length > 0 && (
                        <div className="space-y-1.5">
                          {taskAttachments.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 px-2.5 py-1.5 bg-[#1e1e2e] border border-gray-600 rounded-lg group"
                            >
                              <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-white text-xs truncate">{file.name}</p>
                                <p className="text-gray-500 text-[10px]">
                                  {(file.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeAttachment(index)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded text-red-400"
                                title="Remove file"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                  
                  {/* Actions - Fixed at bottom */}
                  <div className="flex flex-col gap-2 p-3 pt-2 border-t border-gray-700 flex-shrink-0 bg-[#2b2d42]">
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                        if (!taskFormData.title || !taskFormData.assigneeId) {
                          const botMsg: Message = {
                            id: `bot-${Date.now()}`,
                            message: '⚠️ Please fill in the required fields: Title and Assignee',
                            user_id: 'bey',
                            create_at: Date.now(),
                            username: 'Bey',
                            isBot: true
                          };
                          setMessages(prev => [...prev, botMsg]);
                          return;
                        }
                        
                        try {
                          // Create FormData for file upload
                          const formData = new FormData();
                          formData.append('serialNumber', taskFormData.serialNumber);
                          formData.append('title', taskFormData.title);
                          formData.append('description', taskFormData.description);
                          formData.append('priority', taskFormData.priority);
                          formData.append('assigneeId', taskFormData.assigneeId);
                          formData.append('status', 'IN_PROGRESS');
                          
                          // Append files
                          taskAttachments.forEach((file) => {
                            formData.append('attachments', file);
                          });
                          
                          const response = await fetch('/api/tasks', {
                            method: 'POST',
                            credentials: 'include',
                            body: formData
                          });
                          
                          if (response.ok) {
                            const successMsg: Message = {
                              id: `bot-${Date.now()}`,
                              message: `✅ Task created and moved to IN PROGRESS!\n\n� ${taskFormData.serialNumber}\n�📝 "${taskFormData.title}"\n🎯 Priority: ${taskFormData.priority}\n👤 Assigned to: ${chatUsers.find(u => u.id === taskFormData.assigneeId)?.name}`,
                              user_id: 'bey',
                              create_at: Date.now(),
                              username: 'Bey',
                              isBot: true
                            };
                            setMessages(prev => [...prev, successMsg]);
                            setShowTaskForm(false);
                            setTaskFormData({ serialNumber: '', title: '', description: '', priority: 'MEDIUM', assigneeId: '' });
                            setTaskAttachments([]);
                          } else {
                            throw new Error('Failed to create task');
                          }
                        } catch (error) {
                          const errorMsg: Message = {
                            id: `bot-${Date.now()}`,
                            message: '❌ Sorry, I couldn\'t create the task. Please try again or contact support.',
                            user_id: 'bey',
                            create_at: Date.now(),
                            username: 'Bey',
                            isBot: true
                          };
                          setMessages(prev => [...prev, errorMsg]);
                        }
                      }}
                      className="flex-1 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      ✅ Create Task
                    </button>
                    <button
                      onClick={async () => {
                        if (!taskFormData.title) {
                          const botMsg: Message = {
                            id: `bot-${Date.now()}`,
                            message: '⚠️ Please enter a task title to save as draft',
                            user_id: 'bey',
                            create_at: Date.now(),
                            username: 'Bey',
                            isBot: true
                          };
                          setMessages(prev => [...prev, botMsg]);
                          return;
                        }
                        
                        try {
                          console.log('[Draft] Saving draft with data:', {
                            serialNumber: taskFormData.serialNumber,
                            title: taskFormData.title,
                            description: taskFormData.description,
                            priority: taskFormData.priority,
                            assigneeId: taskFormData.assigneeId,
                            status: 'DRAFT'
                          });
                          
                          // Create FormData for file upload
                          const formData = new FormData();
                          formData.append('serialNumber', taskFormData.serialNumber);
                          formData.append('title', taskFormData.title);
                          formData.append('description', taskFormData.description);
                          formData.append('priority', taskFormData.priority);
                          if (taskFormData.assigneeId) {
                            formData.append('assigneeId', taskFormData.assigneeId);
                          }
                          formData.append('status', 'DRAFT');
                          
                          // Append files
                          taskAttachments.forEach((file) => {
                            formData.append('attachments', file);
                          });
                          
                          const response = await fetch('/api/tasks', {
                            method: 'POST',
                            credentials: 'include',
                            body: formData
                          });
                          
                          const responseData = await response.json();
                          console.log('[Draft] API response:', response.status, responseData);
                          
                          if (response.ok) {
                            const successMsg: Message = {
                              id: `bot-${Date.now()}`,
                              message: `💾 Task saved as draft!\n\n🔢 ${taskFormData.serialNumber}\n📝 "${taskFormData.title}"\n\nYou can find it in the DRAFT column and complete it later.`,
                              user_id: 'bey',
                              create_at: Date.now(),
                              username: 'Bey',
                              isBot: true
                            };
                            setMessages(prev => [...prev, successMsg]);
                            setShowTaskForm(false);
                            setTaskFormData({ serialNumber: '', title: '', description: '', priority: 'MEDIUM', assigneeId: '' });
                            setTaskAttachments([]);
                          } else {
                            throw new Error(responseData.error || 'Failed to save draft');
                          }
                        } catch (error: any) {
                          console.error('[Draft] Error saving draft:', error);
                          const errorMsg: Message = {
                            id: `bot-${Date.now()}`,
                            message: `❌ Sorry, I couldn't save the draft. Error: ${error.message}\n\nPlease try again.`,
                            user_id: 'bey',
                            create_at: Date.now(),
                            username: 'Bey',
                            isBot: true
                          };
                          setMessages(prev => [...prev, errorMsg]);
                        }
                      }}
                      className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                    >
                      💾 Save to Draft
                    </button>
                    </div>
                    <button
                      onClick={() => {
                        setShowTaskForm(false);
                        setTaskFormData({ serialNumber: '', title: '', description: '', priority: 'MEDIUM', assigneeId: '' });
                        setTaskAttachments([]);
                        const cancelMsg: Message = {
                          id: `bot-${Date.now()}`,
                          message: 'Task creation cancelled. How else can I help you?',
                          user_id: 'bey',
                          create_at: Date.now(),
                          username: 'Bey',
                          isBot: true
                        };
                        setMessages(prev => [...prev, cancelMsg]);
                      }}
                      className="w-full px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      ❌ Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Thinking indicator */}
          {thinking && (
            <div className="flex gap-2 items-start">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white flex-shrink-0">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="flex items-baseline gap-1 mb-0.5">
                  <span className="font-semibold text-[11px] text-white">
                    Bey
                  </span>
                  <span className="text-[9px] text-gray-500">
                    thinking...
                  </span>
                </div>
                <div className="text-gray-400">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} className="h-4" />
        </div>

        {/* Message Input - Fixed at bottom with Quick Actions */}
        <div className="bg-[#1e1e2e] border-t border-gray-700/50 flex-shrink-0">
          {/* Attached Files Preview */}
          {attachedFiles.length > 0 && (
            <div className="px-4 pt-3">
              <div className="flex flex-wrap gap-2">
                {attachedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-1.5 bg-[#2b2d42] rounded-lg px-2.5 py-1.5 text-xs text-gray-300 border border-gray-700/50">
                    <Paperclip className="w-3 h-3 text-gray-500" />
                    <span className="max-w-[150px] truncate">{file.name}</span>
                    <button
                      onClick={() => removeAttachedFile(index)}
                      className="hover:text-red-400 transition-colors ml-1"
                      title="Remove file"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 relative">
            {/* Quick Actions Popup */}
            {showQuickActions && (
              <div className="absolute bottom-full left-3 mb-2 bg-[#2b2d42] rounded-lg shadow-xl border border-gray-700/50 overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                <div className="p-1">
                  <button
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowQuickActions(false);
                    }}
                    className="flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-700/50 rounded-lg transition-colors text-left"
                  >
                    <Paperclip className="w-4 h-4 text-blue-400" />
                    <div>
                      <p className="text-white text-sm font-medium">Attach File</p>
                      <p className="text-gray-500 text-xs">Upload documents or images</p>
                    </div>
                  </button>
                  
                  {activeView === 'user' && (
                    <button
                      onClick={() => {
                        // Trigger task linking dialog
                        setNewMessage('/link task ');
                        setShowQuickActions(false);
                        textareaRef.current?.focus();
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-700/50 rounded-lg transition-colors text-left"
                    >
                      <Link2 className="w-4 h-4 text-purple-400" />
                      <div>
                        <p className="text-white text-sm font-medium">Link Task</p>
                        <p className="text-gray-500 text-xs">Reference a task in chat</p>
                      </div>
                    </button>
                  )}
                  
                  {activeView === 'task' && selectedTaskId && (
                    <button
                      onClick={() => {
                        setNewMessage('/status done');
                        setShowQuickActions(false);
                        textareaRef.current?.focus();
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 hover:bg-gray-700/50 rounded-lg transition-colors text-left"
                    >
                      <CheckSquare className="w-4 h-4 text-green-400" />
                      <div>
                        <p className="text-white text-sm font-medium">Mark Complete</p>
                        <p className="text-gray-500 text-xs">Update task status to done</p>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex items-end gap-2">
              {/* Quick Actions Button */}
              <button
                onClick={() => setShowQuickActions(!showQuickActions)}
                className={`p-2 rounded-lg transition-all flex-shrink-0 ${
                  showQuickActions 
                    ? 'bg-blue-600 text-white' 
                    : 'hover:bg-gray-700/30 text-gray-400 hover:text-white'
                }`}
                title="Quick Actions"
              >
                <Plus className={`w-5 h-5 transition-transform ${showQuickActions ? 'rotate-45' : ''}`} />
              </button>

              {/* Input Container */}
              <div className="flex-1 flex items-end gap-2 bg-[#2b2d42] rounded-xl px-3 py-2 border border-gray-700/50 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx,.txt"
                />
              
                {/* Attachment button */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={thinking}
                  className="p-1 hover:bg-gray-700/30 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                  title="Attach file"
                >
                  <Paperclip className="w-4 h-4 text-gray-500 hover:text-gray-300" />
                </button>
              
                {/* Input box */}
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
                  placeholder={activeView === 'task' ? 'Type a message about this task...' : 'Type a message...'}
                  rows={1}
                  disabled={thinking}
                  className="flex-1 bg-transparent resize-none focus:outline-none text-gray-200 placeholder-gray-500 text-sm max-h-[200px] overflow-y-auto disabled:opacity-50 leading-relaxed py-0.5"
                  style={{ minHeight: '24px' }}
                />
              
                {/* Emoji button */}
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  disabled={thinking}
                  className="p-1 hover:bg-gray-700/30 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                  title="Add emoji"
                >
                  <Smile className="w-4 h-4 text-gray-500 hover:text-gray-300" />
                </button>
              </div>
              
              {/* Send button - Clean paper plane style */}
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || thinking}
                className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                  newMessage.trim() && !thinking
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                }`}
                title="Send message"
              >
                <Send className={`w-4 h-4 ${thinking ? 'animate-pulse' : ''}`} />
              </button>
            </div>

            {/* Slash Command Hint */}
            {newMessage.startsWith('/') && (
              <div className="mt-2 px-1">
                <p className="text-gray-500 text-xs">
                  💡 Commands: <code className="text-blue-400">/status done</code> • <code className="text-blue-400">/link task TSK-ID</code>
                </p>
              </div>
            )}

            {/* Emoji Picker Popup */}
            {showEmojiPicker && (
              <div ref={emojiPickerRef} className="absolute bottom-full mb-2 right-3 z-50">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme={Theme.DARK}
                  width={300}
                  height={400}
                  searchPlaceHolder="Search emoji..."
                  previewConfig={{ showPreview: false }}
                />
              </div>
            )}
          </div>
        </div>
        </>
        )}
      </div>
    </div>
  );
}
