'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Settings
} from 'lucide-react';
import dynamic from 'next/dynamic';
import CallControls from './CallControls';
import { Theme } from 'emoji-picker-react';
import { useOcrUpload, isBillFile } from '@/hooks/useOcrUpload';

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

type ActiveView = 'mira' | 'user' | 'task';

interface CleanChatInterfaceProps {
  onClose?: () => void;
}

export default function CleanChatInterface({ onClose }: CleanChatInterfaceProps = {}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [thinking, setThinking] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('mira');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const taskFileInputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const shouldTriggerTaskCreation = useRef(false);

  // OCR Upload Hook
  const { uploadBill, isUploading, isProcessing, progress, error: ocrError, result: ocrResult, reset: resetOcr } = useOcrUpload();
  const [processingBillId, setProcessingBillId] = useState<string | null>(null);

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

  // Load chat users
  useEffect(() => {
    const loadUsers = async () => {
      try {
        // Get all users (empty query will return all active users now)
        const response = await fetch('/api/chat-bot/search-users?q=');
        if (response.ok) {
          const data = await response.json();
          console.log('[Chat] API response:', data);
          const users = data.data?.map((u: any) => ({
            id: u.id,
            name: u.fullName || u.username,
            email: u.email,
            avatar: u.profile_pic_url,
            isOnline: true,
            role: u.role,
            roleName: u.roleName
          })) || [];
          setChatUsers(users);
          console.log('[Chat] Loaded users:', users.length, 'users');
          console.log('[Chat] User details:', users.map((u: ChatUser) => ({ id: u.id, name: u.name, role: u.roleName || u.role })));
        } else {
          const errorText = await response.text();
          console.error('[Chat] Failed to load users - Status:', response.status, 'Response:', errorText);
        }
      } catch (error) {
        console.error('[Chat] Failed to load users:', error);
      }
    };
    loadUsers();
  }, []);

  // Real-time user search with debouncing
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/chat-bot/search-users?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        const users = data.data?.map((u: any) => ({
          id: u.id,
          name: u.fullName || u.username,
          email: u.email,
          avatar: u.profile_pic_url,
          isOnline: true,
          role: u.role,
          roleName: u.roleName
        })) || [];
        setSearchResults(users);
        console.log('[Chat] Search results for "' + query + '":', users.length, 'users');
      }
    } catch (error) {
      console.error('[Chat] Search failed:', error);
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
    return chatUsers.find(u => u.id === userId) || searchResults.find(u => u.id === userId);
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
    if (user && activeView === 'mira' && messages.length === 0) {
      loadGreeting();
    }
  }, [user, activeView]);

  // Load previous conversation when switching to Mira
  useEffect(() => {
    if (user && activeView === 'mira' && !conversationId) {
      loadLatestConversation();
    }
  }, [user, activeView]);

  // Listen for external task creation trigger (e.g., from dashboard Create button)
  useEffect(() => {
    const handleExternalCreateTask = () => {
      console.log('✨ External trigger for task creation - setting flag');
      shouldTriggerTaskCreation.current = true;
      
      // Switch to Mira view if not already there
      if (activeView !== 'mira') {
        setActiveView('mira');
      }
    };

    window.addEventListener('spark:createTask', handleExternalCreateTask);
    return () => window.removeEventListener('spark:createTask', handleExternalCreateTask);
  }, [activeView]);

  // Handle task creation when component is ready
  useEffect(() => {
    if (shouldTriggerTaskCreation.current && user && activeView === 'mira') {
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
          user_id: 'mira',
          create_at: Date.now(),
          username: 'AIVA',
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
          user_id: 'mira',
          create_at: Date.now(),
          username: 'AIVA',
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
              user_id: 'mira',
              create_at: Date.now(),
              username: 'AIVA',
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
            user_id: 'mira',
            create_at: Date.now(),
            username: 'AIVA',
            isBot: true
          };
          setMessages(prev => [...prev, errorMsg]);
        }
      } else {
        // Regular file attachment (not a bill)
        const botMsg: Message = {
          id: `bot-${Date.now()}`,
          message: `�📎 Added ${droppedFiles.length} file(s) to the task`,
          user_id: 'mira',
          create_at: Date.now(),
          username: 'AIVA',
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
          user_id: 'mira',
          create_at: Date.now(),
          username: 'AIVA',
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
              user_id: 'mira',
              create_at: Date.now(),
              username: 'AIVA',
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
            user_id: 'mira',
            create_at: Date.now(),
            username: 'AIVA',
            isBot: true
          };
          setMessages(prev => [...prev, errorMsg]);
        }
      } else {
        // Regular file attachment (not a bill)
        const botMsg: Message = {
          id: `bot-${Date.now()}`,
          message: `�📎 Added ${selectedFiles.length} file(s) to the task`,
          user_id: 'mira',
          create_at: Date.now(),
          username: 'AIVA',
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
          user_id: 'mira',
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
          message: `Hey ${firstName}! 👋 I'm AIVA (AI + Virtual Assistant), your intelligent operations assistant created by Bisman Corporation. How can I help you today?`,
          user_id: 'mira',
          create_at: Date.now(),
          username: 'AIVA',
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
        message: `Hey ${firstName}! 👋 I'm AIVA (AI + Virtual Assistant), your intelligent operations assistant created by Bisman Corporation. How can I help you today?`,
        user_id: 'mira',
        create_at: Date.now(),
        username: 'AIVA',
        isBot: true
      };
      setMessages([welcomeMessage]);
    }
  };

  const loadLatestConversation = async () => {
    try {
      const response = await fetch('/api/chat/conversation/latest', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.conversationId && data.messages && data.messages.length > 0) {
          setConversationId(data.conversationId);
          setMessages(data.messages);
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

  // Send a message to the intelligent chat engine
  const sendMessage = async () => {
    if (!newMessage.trim() || thinking) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      message: newMessage,
      user_id: (user as any)?.id || 'current-user',
      create_at: Date.now(),
      username: 'You'
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = newMessage;
    const msgLower = newMessage.toLowerCase().trim();
    setNewMessage('');

    // If chatting with a user (not AIVA), just send the message - no AI response
    if (activeView === 'user' && selectedUserId) {
      // TODO: Implement direct messaging via socket/API to the selected user
      // For now, just save the message without AI response
      console.log('[Chat] Direct message to user:', selectedUserId, messageToSend);
      
      // Save conversation to database (user-to-user chat)
      try {
        await fetch('/api/chat/direct-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            message: messageToSend,
            recipientId: selectedUserId,
            senderId: (user as any)?.id
          })
        });
      } catch (error) {
        console.error('[Chat] Failed to send direct message:', error);
      }
      return; // Don't get AI response for direct messages
    }

    setThinking(true);

    // Check if user wants to create a task (only for AIVA chat)
    if (msgLower.includes('create task') || msgLower.includes('new task') || 
        msgLower.includes('add task') || msgLower.includes('make task')) {
      setThinking(false);
      setShowTaskForm(true);
      
      const botMessage: Message = {
        id: `bot-${Date.now()}`,
        message: "✨ Great! Let's create a new task.\n\nPlease fill in the form below and I'll create the task for you! 📝",
        user_id: 'mira',
        create_at: Date.now(),
        username: 'AIVA',
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
          user_id: 'mira',
          create_at: Date.now(),
          username: data.persona?.name || 'AIVA',
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
          user_id: 'mira',
          create_at: Date.now(),
          username: 'Mira',
          isBot: true
        };
        setMessages(prev => [...prev, botMessage]);
      }
    } catch (error) {
      console.error('[Chat] Failed to send message:', error);
      const botMessage: Message = {
        id: `bot-error-${Date.now()}`,
        message: "Hmm, I'm having trouble connecting right now. Can you try again in a moment?",
        user_id: 'mira',
        create_at: Date.now(),
        username: 'Mira',
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
        ? 'fixed inset-0 z-50 h-screen w-screen' 
        : 'h-full rounded-lg'
    } bg-[#1e1e2e] dark:bg-[#1e1e2e]`}>
      {/* Left Sidebar - 40% - Full height */}
      <div className="bg-[#2b2d42] dark:bg-[#2b2d42] border-r border-gray-700/50 flex flex-col flex-shrink-0 w-[40%] h-full">
        {/* Sidebar Header */}
        <div className={`p-2.5 border-b border-gray-700/50 ${!isFullscreen ? 'rounded-tl-lg' : ''}`}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              B
            </div>
            <span className="text-white font-semibold truncate text-[13px]">Business ERP</span>
          </div>
        </div>

        {/* Search */}
        <div className="p-2.5">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full px-2.5 py-1.5 bg-[#1e1e2e] border border-gray-700/50 rounded text-gray-300 text-[12px] placeholder-gray-500 focus:outline-none focus:border-blue-500"
            />
            {isSearching && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2">
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          {searchQuery && searchResults.length === 0 && !isSearching && (
            <p className="text-gray-500 text-[10px] mt-1 px-1">No users found</p>
          )}
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto" style={{ height: openTasks.length > 0 ? `calc(100% - ${getTaskPanelHeight()})` : 'auto' }}>
          {/* Mira AI */}
          <button
            onClick={() => {
              setActiveView('mira');
              setSelectedUserId(null);
              setSelectedTaskId(null);
            }}
            className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-[#1e1e2e] transition-colors ${
              activeView === 'mira' ? 'bg-[#1e1e2e]' : ''
            }`}
          >
            <div className="relative flex-shrink-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#2b2d42]"></div>
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-white text-[13px] font-medium truncate">AIVA</p>
            </div>
          </button>

          {/* Team Members */}
          {displayUsers.length > 0 && (
            <>
              {displayUsers.map((chatUser) => (
                <button
                  key={chatUser.id}
                  onClick={() => {
                    setActiveView('user');
                    setSelectedUserId(chatUser.id);
                    setSelectedTaskId(null);
                    // Clear messages when switching to direct chat (start fresh conversation)
                    setMessages([]);
                    // Clear search after selecting user
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-[#1e1e2e] transition-colors ${
                    activeView === 'user' && selectedUserId === chatUser.id ? 'bg-[#1e1e2e]' : ''
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-[10px] font-bold">
                      {chatUser.name.slice(0, 2).toUpperCase()}
                    </div>
                    {chatUser.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#2b2d42]"></div>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-white text-[13px] truncate">{chatUser.name}</p>
                    {chatUser.roleName && (
                      <p className="text-gray-500 text-[10px] truncate">{chatUser.roleName.replace(/_/g, ' ')}</p>
                    )}
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Tasks Section with Separator */}
          {tasks.length > 0 && (
            <>
              <div className="px-3 py-2 mt-2">
                <div className="border-t border-gray-700/50"></div>
              </div>
              <div className="px-3 py-1">
                <p className="text-gray-400 text-[10px] font-semibold uppercase tracking-wide">Tasks</p>
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
                      message: `**Task: ${task.title}**\n\nStatus: ${task.status}\nPriority: ${task.priority || 'N/A'}\n\nTask details and updates will appear here.`,
                      user_id: 'system',
                      create_at: Date.now(),
                      username: 'Task Info',
                      isBot: true
                    }]);
                  }}
                  className={`w-full flex items-start gap-2 px-3 py-2 hover:bg-[#1e1e2e] transition-colors ${
                    activeView === 'task' && selectedTaskId === task.id ? 'bg-[#1e1e2e]' : ''
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                    task.status === 'DONE' ? 'bg-green-500' :
                    task.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                    task.status === 'CONFIRMED' ? 'bg-yellow-500' :
                    'bg-gray-400'
                  }`}></div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-white text-[13px] truncate">{task.title}</p>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>

        {/* Open Tasks Panel - Dynamic Height */}
        <div 
          className="border-t border-gray-700/50 bg-[#1e1e2e] overflow-y-auto transition-all duration-300"
          style={{ height: getTaskPanelHeight() }}
        >
          <div className="p-2.5 flex items-center justify-between border-b border-gray-700/50">
            <span className="text-gray-400 text-[11px] font-semibold uppercase">Open Tasks ({openTasks.length})</span>
            {openTasks.length > 0 && (
              <button
                onClick={() => setIsTaskPanelExpanded(!isTaskPanelExpanded)}
                className="text-gray-400 hover:text-white text-[10px] transition-colors"
              >
                {isTaskPanelExpanded ? '▼' : '▲'}
              </button>
            )}
          </div>
          
          {openTasks.length === 0 ? (
            <div className="p-3 text-center">
              <p className="text-gray-500 text-[11px]">No tasks opened yet</p>
              <p className="text-gray-600 text-[10px] mt-1">Click on tasks to view here</p>
            </div>
          ) : (
            <div className="p-1">
              {openTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 px-2 py-1.5 mb-1 bg-[#2b2d42] rounded hover:bg-[#353748] transition-colors group"
                >
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    task.status === 'DONE' ? 'bg-green-500' :
                    task.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                    task.status === 'CONFIRMED' ? 'bg-yellow-500' :
                    'bg-gray-400'
                  }`}></div>
                  <button
                    onClick={() => {
                      setActiveView('task');
                      setSelectedTaskId(task.id);
                      setSelectedUserId(null);
                    }}
                    className="flex-1 text-left min-w-0"
                  >
                    <p className="text-white text-[11px] truncate">{task.title}</p>
                    <p className="text-gray-500 text-[9px]">{task.status}</p>
                  </button>
                  <button
                    onClick={() => removeTaskFromPanel(task.id)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-400"
                    title="Remove from panel"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Settings */}
        <div className="p-2.5 border-t border-gray-700/50">
          <button className="text-gray-400 hover:text-white text-[11px] transition-colors">
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Chat Header */}
        <div className={`h-12 px-3 bg-[#1e1e2e] border-b border-gray-700/50 flex items-center justify-between ${!isFullscreen ? 'rounded-tr-lg' : ''}`}>
          <div className="flex items-center gap-2">
            {activeView === 'mira' && (
              <>
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-[#1e1e2e]"></div>
                </div>
                <div>
                  <h3 className="font-semibold text-white text-[13px]">
                    AIVA
                  </h3>
                  <p className="text-gray-400 text-[10px]">AI + Virtual Assistant</p>
                </div>
              </>
            )}
            {activeView === 'user' && selectedUserId && (
              <>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-[10px] font-bold">
                  {getSelectedUser(selectedUserId)?.name?.slice(0, 2).toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="font-semibold text-white text-[13px]">
                    {getSelectedUser(selectedUserId)?.name || 'Unknown User'}
                  </h3>
                  <p className="text-gray-400 text-[10px]">
                    {getSelectedUser(selectedUserId)?.email || getSelectedUser(selectedUserId)?.roleName?.replace(/_/g, ' ') || 'Direct Message'}
                  </p>
                </div>
              </>
            )}
            {activeView === 'task' && selectedTaskId && (
              <>
                <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center">
                  <span className="text-base">📋</span>
                </div>
                <div>
                  <h3 className="font-semibold text-white text-[13px]">
                    {tasks.find(t => t.id === selectedTaskId)?.title}
                  </h3>
                  <p className="text-gray-400 text-[10px]">
                    Status: {tasks.find(t => t.id === selectedTaskId)?.status}
                  </p>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* Jitsi Call Controls */}
            {(activeView === 'user' || activeView === 'task') && (
              <CallControls 
                threadId={activeView === 'user' ? selectedUserId || undefined : selectedTaskId || undefined}
                onError={(error) => console.error('Jitsi error:', error)}
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
          
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex gap-2 sm:gap-3 items-start ${!message.isBot ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              {message.isBot ? (
                <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white flex-shrink-0">
                  <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                </div>
              ) : (
                <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-full flex-shrink-0 overflow-hidden bg-blue-600">
                  {(user as any)?.profile_pic_url ? (
                    <img 
                      src={(user as any).profile_pic_url.replace('/uploads/', '/api/secure-files/')} 
                      alt={message.username || 'User'} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-blue-600 flex items-center justify-center text-white text-[10px] sm:text-xs md:text-sm font-bold">
                      {getUserInitials(message.username)}
                    </div>
                  )}
                </div>
              )}

              {/* Message Content */}
              <div className={`flex-1 max-w-[70%] ${!message.isBot ? 'flex flex-col items-end' : ''}`}>
                <div className={`flex items-baseline gap-1 mb-0.5 ${!message.isBot ? 'flex-row-reverse' : ''}`}>
                  <span className="font-semibold text-[11px] text-white">
                    {message.isBot ? 'AIVA' : message.username || 'You'}
                  </span>
                  <span className="text-[9px] text-gray-500">
                    {formatTime(message.create_at)}
                  </span>
                </div>
                <div className={`${
                  message.isBot 
                    ? 'text-gray-300' 
                    : 'bg-blue-600 text-white rounded-2xl px-2.5 py-1.5'
                } text-[13px] leading-relaxed whitespace-pre-wrap break-words`}>
                  {message.message}
                </div>
                
                {/* Feedback Buttons - Only for bot messages */}
                {message.isBot && activeView === 'mira' && (
                  <div className="flex gap-1 mt-1">
                    <button
                      onClick={() => handleFeedback(message.id, true)}
                      className={`flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                        feedbackGiven.get(message.id) === true
                          ? 'bg-green-600/20 text-green-400'
                          : 'bg-gray-700/30 text-gray-400 hover:bg-gray-700/50'
                      }`}
                      title="Helpful"
                    >
                      👍
                    </button>
                    <button
                      onClick={() => handleFeedback(message.id, false)}
                      className={`flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                        feedbackGiven.get(message.id) === false
                          ? 'bg-red-600/20 text-red-400'
                          : 'bg-gray-700/30 text-gray-400 hover:bg-gray-700/50'
                      }`}
                      title="Not helpful"
                    >
                      👎
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {/* Inline Task Creation Form */}
          {showTaskForm && activeView === 'mira' && (
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
                            user_id: 'mira',
                            create_at: Date.now(),
                            username: 'AIVA',
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
                              user_id: 'mira',
                              create_at: Date.now(),
                              username: 'AIVA',
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
                            user_id: 'mira',
                            create_at: Date.now(),
                            username: 'AIVA',
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
                            user_id: 'mira',
                            create_at: Date.now(),
                            username: 'AIVA',
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
                              user_id: 'mira',
                              create_at: Date.now(),
                              username: 'AIVA',
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
                            user_id: 'mira',
                            create_at: Date.now(),
                            username: 'AIVA',
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
                          user_id: 'mira',
                          create_at: Date.now(),
                          username: 'AIVA',
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
                    AIVA
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

        {/* Message Input - Fixed at bottom */}
        <div className="bg-[#1e1e2e] border-t border-gray-700/50 flex-shrink-0">
          {/* Attached Files Preview */}
          {attachedFiles.length > 0 && (
            <div className="p-3 pb-0">
              <div className="mb-2 flex flex-wrap gap-2">
                {attachedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-1.5 bg-[#2b2d42] rounded-lg px-2 py-1 text-xs text-gray-300 border border-gray-700/50">
                    <Paperclip className="w-3 h-3" />
                    <span className="max-w-[150px] truncate">{file.name}</span>
                    <button
                      onClick={() => removeAttachedFile(index)}
                      className="hover:text-red-400 transition-colors"
                      title="Remove file"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 relative flex items-center gap-2">
            {/* Settings icon - Left corner */}
            <button
              className="p-2 hover:bg-gray-700/30 rounded-lg transition-colors flex-shrink-0"
              title="Settings"
            >
              <Settings className="w-5 h-5 text-gray-400" />
            </button>

            {/* Input box - Aligned right */}
            <div className="flex-1 flex justify-end">
              <div className="w-[90%] flex items-start gap-2 bg-[#2b2d42] rounded-lg px-3 py-2 border border-gray-700/50 focus-within:border-blue-500 transition-all duration-200">
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
                className="p-0.5 hover:bg-gray-700/30 rounded transition-colors disabled:opacity-50 mt-0.5 flex-shrink-0"
                title="Attach file"
              >
                <Paperclip className="w-4 h-4 text-gray-400" />
              </button>
              
              {/* Input box - Expands upward */}
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
                placeholder="Type a message..."
                rows={1}
                disabled={thinking}
                className="flex-1 bg-transparent resize-none focus:outline-none text-gray-200 placeholder-gray-500 text-[13px] max-h-[200px] overflow-y-auto disabled:opacity-50 leading-relaxed"
                style={{ minHeight: '20px' }}
              />
              
              {/* Emoji button */}
              <button
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                disabled={thinking}
                className="p-0.5 hover:bg-gray-700/30 rounded transition-colors disabled:opacity-50 mt-0.5 flex-shrink-0"
                title="Add emoji"
              >
                <Smile className="w-4 h-4 text-gray-400" />
              </button>
              
              {/* Send button */}
              <button
                onClick={sendMessage}
                disabled={!newMessage.trim() || thinking}
                className="p-0.5 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed mt-0.5 flex-shrink-0"
              >
                <Send className={`w-4 h-4 text-blue-500 ${thinking ? 'animate-pulse' : ''}`} />
              </button>
              </div>
            </div>

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
      </div>
    </div>
  );
}
