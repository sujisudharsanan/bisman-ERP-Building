# 🎥 Jitsi Call Integration - Visual Quick Guide

## 📍 Where to Find Call Buttons

```
┌─────────────────────────────────────────────────────────────────┐
│  CHAT INTERFACE (CleanChatInterface-NEW)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────┬──────────────────────────────────────────────────┐ │
│  │ SIDEBAR │  CHAT AREA                                        │ │
│  │         │                                                    │ │
│  │ 👤 Mira │  ┌──────────────────────────────────────────┐   │ │
│  │ ━━━━━━━ │  │ 👤 John Doe    📞 🎥 🔗 📵  ⋮  ✕      │   │ │
│  │         │  │    john@example.com                      │   │ │
│  │ USERS:  │  └──────────────────────────────────────────┘   │ │
│  │ • John  │  ↑                                                │ │
│  │ • Sarah │  └─ CALL BUTTONS APPEAR HERE!                   │ │
│  │ • Mike  │                                                    │ │
│  │         │  ┌──────────────────────────────────────────┐   │ │
│  │ ━━━━━━━ │  │ Messages...                              │   │ │
│  │         │  │                                            │   │ │
│  │ TASKS:  │  │                                            │   │ │
│  │ • #123  │  └──────────────────────────────────────────┘   │ │
│  │ • #456  │                                                    │ │
│  └─────────┴──────────────────────────────────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Button Functions

### **When NOT in a call:**
```
┌─────────────────────────────────────┐
│  📞  =  Start Audio Call            │
│  🎥  =  Start Video Call            │
└─────────────────────────────────────┘
```

### **When IN a call:**
```
┌─────────────────────────────────────┐
│  📞  =  Audio (disabled)            │
│  🎥  =  Video (disabled)            │
│  🔗  =  Share Call Link             │
│  📵  =  End Call                    │
└─────────────────────────────────────┘
```

---

## 📺 Call Window Appearance

### **Step 1: Click Video Button**
```
┌──────────────────────────────────────────────┐
│ 👤 John Doe    📞 🎥 🔗 📵  ⋮  ✕           │
│    john@example.com                          │
├──────────────────────────────────────────────┤
│ 🟦 Call starting...         [Hide]          │ ← Status Banner
└──────────────────────────────────────────────┘
```

### **Step 2: Call Connects (Auto)**
```
┌──────────────────────────────────────────────┐
│ 👤 John Doe    📞 🎥 🔗 📵  ⋮  ✕           │
│    john@example.com                          │
├──────────────────────────────────────────────┤
│ 🟢 Call active              [Hide]          │ ← Green = Active
├──────────────────────────────────────────────┤
│                                              │
│         ┌─────────────────────┐             │
│         │   JITSI VIDEO       │             │
│         │                     │             │
│         │   [John Doe]        │             │ ← Video Window
│         │                     │             │   480px height
│         │   Controls          │             │
│         │   🔇 📹 🖥️ 📞      │             │
│         └─────────────────────┘             │
│                                              │
└──────────────────────────────────────────────┘
```

### **Step 3: Hide Call (Continue Chatting)**
```
┌──────────────────────────────────────────────┐
│ 👤 John Doe    📞 🎥 🔗 📵  ⋮  ✕           │
│    john@example.com                          │
├──────────────────────────────────────────────┤
│ 🟢 Call active              [Show]          │ ← Click to show again
├──────────────────────────────────────────────┤
│                                              │
│  💬 Hey, I just shared the document...      │
│  💬 Can you check section 3?                │ ← Chat while calling!
│  💬 I'm looking at it now...                │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Type your message...           [Send]  │ │
│  └────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

---

## 🎬 Usage Scenarios

### **Scenario A: Quick Audio Discussion**
```
1. Click on "Sarah" in Users sidebar
   └─→ Chat opens

2. Click 📞 (audio button)
   └─→ Call starts in ~2 seconds

3. Talk while viewing chat history
   └─→ Reference previous messages

4. Click 📵 when done
   └─→ Back to normal chat
```

### **Scenario B: Video Collaboration**
```
1. Click on task "#123 Fix Login Bug"
   └─→ Task details show

2. Click 🎥 (video button)
   └─→ Video call opens

3. Share screen (using Jitsi controls)
   └─→ Show the bug to team

4. Click 🔗 to invite another developer
   └─→ Link copied, paste in message

5. All join and collaborate
   └─→ Fix bug together

6. Click 📵 when resolved
   └─→ Continue with next task
```

### **Scenario C: Emergency Support**
```
1. User reports critical issue in chat
   └─→ "Server is down!"

2. Immediately click 🎥
   └─→ Face-to-face in 2 seconds

3. Diagnose problem together
   └─→ Share screens, check logs

4. Resolve quickly
   └─→ End call, document solution
```

---

## 🎨 Visual States

### **Button States**
```
ENABLED (Green/Blue):
  📞 Audio     🎥 Video
  ↑ Click to start call

DISABLED (Gray):
  📞 Audio     🎥 Video
  ↑ Already in a call

ACTIVE CALL:
  🔗 Share     📵 End
  ↑ New buttons appear
```

### **Status Indicator**
```
🟦 Blue Pulse = Connecting...
🟢 Green Pulse = Call Active
⚫ (hidden) = No Call
```

---

## 📱 Quick Tips

1. **Start Fast**: One click = instant call
2. **Multitask**: Chat + Call simultaneously  
3. **Share Easy**: Copy/paste link to invite others
4. **Privacy**: Each call gets unique room ID
5. **Control**: Full Jitsi controls (mute, video, screen)

---

## 🎯 Where Buttons Show/Hide

```
✅ SHOWS when:
   - Chatting with a user (e.g., "John Doe")
   - Viewing a task (e.g., "#123 Fix Bug")

❌ HIDDEN when:
   - Chatting with Mira AI
     (AI doesn't need video calls!)
```

---

## 🔄 Call Flow Diagram

```
[User Clicks 📞/🎥]
        ↓
[Room Created: bisman-{id}-{time}]
        ↓
[Jitsi Script Loads]
        ↓
[Auto-Join Room]
        ↓
[Status: 🟦 Connecting...]
        ↓
[Video/Audio Starts]
        ↓
[Status: 🟢 Active]
        ↓
[User Can: Share/Hide/End]
        ↓
[User Clicks 📵 End]
        ↓
[Jitsi Cleanup]
        ↓
[Back to Normal Chat]
```

---

## 💡 Pro Tips

1. **Audio First**: Start with 📞 for quick questions
2. **Video Later**: Upgrade to 🎥 if needed (in Jitsi controls)
3. **Hide Window**: Use [Hide] button to keep call active while chatting
4. **Share Links**: Great for pulling in extra people mid-call
5. **Screen Share**: Available in Jitsi toolbar during call

---

## 🎉 Try It Now!

```
1. Open your application
2. Click any user in the sidebar
3. Look for 📞 and 🎥 buttons in top right
4. Click one → Call starts!
5. Enjoy seamless video/audio calling! 🎊
```

---

**Visual Guide Created**: November 25, 2025  
**For**: CleanChatInterface-NEW with Jitsi Integration  
**Status**: ✅ Ready to Use
