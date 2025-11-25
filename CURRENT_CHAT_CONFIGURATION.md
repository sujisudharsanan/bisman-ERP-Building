# Current Chat System Configuration - Spark Assistant
## November 25, 2025

## 🎯 Overview

You are currently using **Spark Assistant** - a unified intelligent chat system with AI-powered responses and task creation capabilities.

## 📊 System Architecture

```
┌─────────────────────────────────────────┐
│         Root Layout (layout.tsx)        │
│              renders on all             │
│            authenticated pages          │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│          ChatGuard.tsx                  │
│  • Checks authentication                │
│  • Hides on public pages (/login, etc.) │
│  • Manages open/close state             │
└─────────────────┬───────────────────────┘
                  │
                  ├─────────────────┐
                  ▼                 ▼
    ┌──────────────────────┐  ┌──────────────────────┐
    │ BismanFloatingWidget │  │ CleanChatInterface   │
    │  (When closed)       │  │  (When open)         │
    │  • Floating button   │  │  • Spark Assistant   │
    │  • Bottom-right      │  │  • Chat window       │
    │  • Blue/Yellow       │  │  • Task creation     │
    └──────────────────────┘  └──────────────────────┘
```

## 🔧 Component Breakdown

### 1. **ChatGuard.tsx** (Entry Point)
**Location**: `/my-frontend/src/components/ChatGuard.tsx`

**Purpose**: Controls when and where the chat appears

**Key Features**:
- ✅ Shows only on authenticated pages
- ✅ Hides on public pages (`/`, `/auth/login`, `/auth/register`)
- ✅ Manages `isChatOpen` state
- ✅ Renders floating button OR chat window (not both)

**State Management**:
```typescript
const [isChatOpen, setIsChatOpen] = useState(false);
```

**Rendering Logic**:
```typescript
// Show floating button when closed
{!isChatOpen && <BismanFloatingWidget onOpen={() => setIsChatOpen(true)} />}

// Show chat window when open
{isChatOpen && (
  <div className="fixed bottom-4 right-4 w-[400px] h-[600px]">
    <CleanChatInterface onClose={() => setIsChatOpen(false)} />
  </div>
)}
```

---

### 2. **BismanFloatingWidget** (Floating Button)
**Location**: `/my-frontend/src/components/BismanFloatingWidget.tsx`

**Purpose**: Animated floating button to open chat

**Props**:
- `onOpen`: Callback to open chat
- `position`: "bottom-right"
- `primaryColor`: "#0A3A63" (Blue)
- `accentColor`: "#FFC20A" (Yellow)
- `size`: 72 (pixels)

**Appearance**:
- 🎨 Blue/Yellow gradient circle
- 🅱️ Bisman logo in center
- 💫 Hover animations
- 📍 Fixed position: bottom-right corner

---

### 3. **CleanChatInterface** (Main Chat)
**Location**: `/my-frontend/src/components/chat/CleanChatInterface.tsx`

**Purpose**: Full-featured Spark Assistant chat interface

#### 📋 Key Features:

##### A. **Spark Assistant Bot**
- 🤖 AI-powered responses
- 💬 Conversational interface
- 📊 ERP data integration
- 🔍 Natural language understanding

##### B. **Task Creation** (Your Recent Addition!)
- 📝 Inline form in chat
- ⚡ Triggered by typing: "create task", "new task", "add task", "make task"
- 🎯 Triggered by "+ Create" button click
- 🎨 Gradient border styling

##### C. **User Search**
- 🔍 Search team members
- 👥 Direct messaging (DM) capability
- 📧 Shows email and role

##### D. **API Integration**
Multiple backend endpoints:

**1. Chat Endpoints**:
```typescript
/api/chat/greeting      // Get personalized greeting
/api/chat/message       // Send message, get AI response
```

**2. Bot Endpoints**:
```typescript
/api/chat-bot/user-data       // Get user's ERP data
/api/chat-bot/search-users    // Search for team members
```

**3. Task Endpoints**:
```typescript
/api/tasks              // GET (list), POST (create)
/api/tasks/[id]         // GET, PATCH, DELETE
```

---

## 🎨 UI Components Structure

### Main Layout:
```
┌───────────────────────────────────────┐
│ ┌─ Header ──────────────────────────┐ │
│ │ 👤 Spark Assistant      [⋮] [✕]  │ │
│ └───────────────────────────────────┘ │
│                                       │
│ ┌─ Sidebar (Users) ─┐ ┌─ Messages ─┐ │
│ │ 🔍 Search...      │ │            │ │
│ │                   │ │ User: Hi   │ │
│ │ 🤖 Spark (bot)    │ │ Bot: Hello │ │
│ │ 👤 John Doe       │ │            │ │
│ │ 👤 Jane Smith     │ │ [Form]     │ │
│ │                   │ │            │ │
│ └───────────────────┘ └────────────┘ │
│                                       │
│ ┌─ Input Box ──────────────────────┐ │
│ │ Type a message... [📎] [😊] [→] │ │
│ └───────────────────────────────────┘ │
└───────────────────────────────────────┘
```

### Task Form (Inline):
```
┌─────────────────────────────────────┐
│ ✨ Create New Task                  │
├─────────────────────────────────────┤
│ Title:                              │
│ [_____________________________]     │
│                                     │
│ Description:                        │
│ [_____________________________]     │
│ [_____________________________]     │
│                                     │
│ Priority:                           │
│ [LOW] [MEDIUM] [HIGH] [URGENT]     │
│                                     │
│ Assign to:                          │
│ [▼ Select user...]                 │
│                                     │
│         [Create] [Cancel]           │
└─────────────────────────────────────┘
```

---

## 🎯 Task Creation Flow

### Method 1: Type in Chat
```
User types: "create task"
     ↓
CleanChatInterface.sendMessage() detects keyword
     ↓
setShowTaskForm(true)
     ↓
Inline form appears below messages
     ↓
User fills form and clicks "Create"
     ↓
POST /api/tasks
     ↓
Task created → Success message
```

### Method 2: "+ Create" Button
```
User clicks "+ Create" in DRAFT column
     ↓
hub-incharge/page.tsx dispatches CustomEvent('spark:createTask')
     ↓
CleanChatInterface event listener catches it
     ↓
Automatically adds "create task now" message
     ↓
setShowTaskForm(true)
     ↓
Form appears → User fills → Submit → Task created
```

---

## 🔌 Backend Integration

### Chat Service:
**Endpoint**: `/api/chat/*`  
**Location**: `/my-backend/routes/ultimate-chat.js`

**Features**:
- Intent detection (greetings, tasks, help, etc.)
- Entity extraction (dates, amounts, names)
- Context-aware responses
- Self-learning capabilities

### Task Workflow:
**Endpoint**: `/api/tasks`  
**Location**: `/my-backend/routes/taskRoutes.js`

**Socket.IO**:
- Real-time task updates
- Live status changes
- Collaborative editing

---

## 📦 State Management

### CleanChatInterface State:
```typescript
// UI State
const [isChatOpen, setIsChatOpen] = useState(false);
const [loading, setLoading] = useState(true);
const [showTaskForm, setShowTaskForm] = useState(false);

// Chat State
const [messages, setMessages] = useState<Message[]>([]);
const [newMessage, setNewMessage] = useState('');
const [chatUsers, setChatUsers] = useState<ChatUser[]>([]);
const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);

// Task Form State
const [taskFormData, setTaskFormData] = useState({
  title: '',
  description: '',
  priority: 'MEDIUM',
  assigneeId: ''
});

// ERP Data
const [userData, setUserData] = useState<UserData | null>(null);
const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
```

---

## 🎨 Styling & Theming

### Colors:
- **Primary**: Blue gradient (`from-blue-500 to-purple-500`)
- **Accent**: Yellow (`#FFC20A`)
- **Background**: Dark (`bg-[#071018]`) / Light (`bg-white`)
- **Text**: Gray scale for readability

### Dimensions:
- **Chat Window**: 400px × 600px
- **Floating Button**: 72px circle
- **Position**: Fixed bottom-right
- **Z-index**: 999 (above most content)

### Animations:
- **Slide in**: Chat window entrance
- **Hover**: Floating button scale
- **Thinking**: Animated dots for bot

---

## 🚀 Message Detection Keywords

### Task Creation:
- "create task"
- "new task"
- "add task"
- "make task"

### Pending Tasks:
- "pending"
- "approval"
- "tasks"

### Payment Requests:
- "payment"
- "payment request"

### User Info:
- "who am i"
- "my info"
- "profile"

### Help:
- "help"
- "what can you do"
- "?"

---

## 📊 Data Flow

### Loading User Data:
```typescript
useEffect(() => {
  loadUserData();    // Fetch ERP data
  loadChatUsers();   // Fetch team members
  loadInitialGreeting(); // Get personalized greeting
}, []);
```

### Sending Messages:
```typescript
// 1. Check for task creation keywords
if (message.includes('create task')) {
  showTaskForm();
  return;
}

// 2. Call backend AI
const response = await fetch('/api/chat/message', {
  method: 'POST',
  body: JSON.stringify({ message, userId, context })
});

// 3. Display bot response
const botReply = await response.json();
addMessage(botReply);
```

### Creating Tasks:
```typescript
const response = await fetch('/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(taskFormData)
});

if (response.ok) {
  // Task created!
  showSuccess();
  closeForm();
}
```

---

## 🔐 Authentication & Authorization

### Authentication Flow:
1. User logs in → JWT token stored in HTTP-only cookie
2. `AuthContext` provides user data
3. `ChatGuard` checks `isAuthenticated`
4. Chat only renders if authenticated

### API Calls:
All API calls automatically include auth cookie:
```typescript
fetch('/api/chat/message', {
  method: 'POST',
  credentials: 'include', // Sends cookies
  headers: { 'Content-Type': 'application/json' }
})
```

---

## 🎯 Event System

### Custom Events:
```typescript
// Dispatch (from any component)
window.dispatchEvent(new CustomEvent('spark:createTask'));

// Listen (in CleanChatInterface)
window.addEventListener('spark:createTask', handleExternalCreateTask);
```

**Current Events**:
- `spark:createTask` - Opens chat and shows task form

---

## 📁 File Structure

```
my-frontend/src/
├── components/
│   ├── ChatGuard.tsx ✅ (Entry point)
│   ├── BismanFloatingWidget.tsx ✅ (Floating button)
│   └── chat/
│       ├── CleanChatInterface.tsx ✅ (Main chat)
│       └── MattermostEmbed.tsx (Legacy - not used)
│
└── contexts/
    ├── AuthContext.tsx (User authentication)
    └── SocketContext.tsx (Real-time updates)
```

### Removed (Old System):
- ❌ `ERPChatWidget.tsx` - REMOVED
- ❌ `ChatSidebar.tsx` - REMOVED
- ❌ `ChatWindow.tsx` - REMOVED
- ❌ `ChatMessage.tsx` - REMOVED
- ❌ `sparkAI.ts` - Not used by CleanChatInterface

---

## 🔄 Update Flow

### When User Types:
```
1. User types in textarea
2. onChange updates newMessage state
3. User presses Enter
4. sendMessage() called
5. Check for keywords → Show form OR Call API
6. Bot response added to messages array
7. Auto-scroll to bottom
```

### When Form Submitted:
```
1. User clicks "Create Task"
2. Validate form fields
3. POST to /api/tasks
4. Socket.IO broadcasts new task
5. Kanban board updates automatically
6. Success message shown
7. Form closes
```

---

## 🎨 Customization Points

### Colors:
**File**: `ChatGuard.tsx`
```typescript
<BismanFloatingWidget
  primaryColor="#0A3A63"  // Change blue
  accentColor="#FFC20A"   // Change yellow
/>
```

### Size:
**File**: `ChatGuard.tsx`
```typescript
<div className="w-[400px] h-[600px]">  // Adjust chat size
```

### Position:
**File**: `ChatGuard.tsx`
```typescript
className="fixed bottom-4 right-4"  // Change position
```

---

## 🐛 Troubleshooting

### Chat not appearing?
**Check**:
1. User authenticated? (`isAuthenticated`)
2. Not on public page? (not `/login`)
3. Check browser console for errors

### Task form not showing?
**Check**:
1. Typed correct keyword? ("create task")
2. Not in DM mode? (selectedUser should be null)
3. Check `showTaskForm` state

### API errors?
**Check**:
1. Backend running? (`npm run dev:both`)
2. Auth token valid? (check cookies)
3. Rate limiting disabled? (`DISABLE_RATE_LIMIT=true`)

---

## ✅ Summary

**Current Setup:**
- ✅ Single unified chat system (CleanChatInterface)
- ✅ Spark Assistant AI bot
- ✅ Task creation via typing or button
- ✅ Real-time updates via Socket.IO
- ✅ ERP data integration
- ✅ Team member search
- ✅ Floating button + chat window

**Old System (Removed):**
- ❌ ERPChatWidget
- ❌ ChatSidebar/ChatWindow/ChatMessage
- ❌ sparkAI.ts utility

**You're using**: **Spark Assistant** with intelligent chat backend at `/api/chat/*`

---

**Date**: November 25, 2025  
**System**: Spark Assistant (CleanChatInterface)  
**Status**: ✅ Active & Working
