# Self-Learning Chat - Quick Start Guide

## 🚀 Get Started in 5 Steps

### Step 1: Run Database Migration (5 minutes)

```bash
cd /Users/abhi/Desktop/BISMAN\ ERP/my-backend

# Run the SQL migration
psql -U postgres -d bisman_erp -f prisma/migrations/self_learning_chat_schema.sql

# Or if using DATABASE_URL
psql $DATABASE_URL -f prisma/migrations/self_learning_chat_schema.sql
```

**Verify:**
```sql
\dt chat_*
-- Should show: chat_interactions, chat_sessions, chat_feedback, annotation_queue, etc.
```

---

### Step 2: Update Chat Routes (2 minutes)

Replace the old chatService with enhancedChatService in `chatRoutes.ts`:

```typescript
// In /my-backend/src/routes/chatRoutes.ts
import { enhancedChatService } from '../services/chat/enhancedChatService';

router.post('/message', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { message, sessionId } = req.body;
    const userId = (req as any).user?.id;
    const userRole = (req as any).user?.role;
    const userHub = (req as any).user?.hub;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
    }

    // Use enhanced chat service
    const response = await enhancedChatService.handleMessage(
      userId,
      message.trim(),
      userRole,
      sessionId,
      { hub: userHub }
    );

    return res.json({
      success: true,
      data: response,
    });
  } catch (error) {
    console.error('Chat message error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process message',
    });
  }
});
```

---

### Step 3: Add Feedback Endpoint (3 minutes)

```typescript
// Add to chatRoutes.ts
import { interactionLogger } from '../services/chat/interactionLogger';

/**
 * POST /api/chat/feedback
 * Record user feedback on a chat response
 */
router.post('/feedback', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { interactionId, sessionId, feedbackType, rating, comment } = req.body;
    const userId = (req as any).user?.id;

    if (!interactionId || !feedbackType) {
      return res.status(400).json({
        success: false,
        error: 'interactionId and feedbackType are required',
      });
    }

    await interactionLogger.recordFeedback({
      interactionId,
      sessionId,
      userId,
      feedbackType,
      rating,
      comment
    });

    return res.json({
      success: true,
      message: 'Feedback recorded'
    });
  } catch (error) {
    console.error('Feedback error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to record feedback',
    });
  }
});

/**
 * GET /api/chat/metrics
 * Get chat performance metrics
 */
router.get('/metrics', authMiddleware, async (req: Request, res: Response) => {
  try {
    const timeRange = (req.query.range as 'hour' | 'day' | 'week') || 'day';
    
    const metrics = await interactionLogger.getMetrics(timeRange);
    const topIntents = await interactionLogger.getTopIntents(10);

    return res.json({
      success: true,
      data: {
        metrics,
        topIntents
      }
    });
  } catch (error) {
    console.error('Metrics error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics',
    });
  }
});
```

---

### Step 4: Update Frontend Chat Widget (10 minutes)

Add feedback buttons and session management:

```typescript
// In your chat component (e.g., ChatWidget.tsx or similar)
import { useState } from 'react';

const ChatWidget = () => {
  const [sessionId, setSessionId] = useState<string>(() => {
    // Generate or retrieve session ID
    return localStorage.getItem('chatSessionId') || crypto.randomUUID();
  });

  useEffect(() => {
    localStorage.setItem('chatSessionId', sessionId);
  }, [sessionId]);

  const sendMessage = async (message: string) => {
    const response = await fetch('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, sessionId })
    });
    const data = await response.json();
    
    // Store interactionId with the message for feedback
    return data.data;
  };

  const sendFeedback = async (interactionId: number, feedbackType: 'thumbs_up' | 'thumbs_down') => {
    await fetch('/api/chat/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        interactionId, 
        sessionId, 
        feedbackType 
      })
    });
  };

  return (
    <div className="chat-widget">
      {messages.map((msg) => (
        <div key={msg.id} className="message">
          <div className="message-content">{msg.reply}</div>
          
          {/* Add feedback buttons */}
          {msg.interactionId && (
            <div className="feedback-buttons">
              <button onClick={() => sendFeedback(msg.interactionId, 'thumbs_up')}>
                👍
              </button>
              <button onClick={() => sendFeedback(msg.interactionId, 'thumbs_down')}>
                👎
              </button>
            </div>
          )}
          
          {/* Show suggestions if available */}
          {msg.suggestions && (
            <div className="suggestions">
              {msg.suggestions.map((suggestion, i) => (
                <button key={i} onClick={() => sendMessage(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
```

---

### Step 5: Test the System (5 minutes)

**1. Test Basic Conversation:**
```
User: "Hi"
Expected: Warm greeting

User: "Reset password"
Expected: Supportive response asking for email
```

**2. Test Repeated Question:**
```
User: "reset password"
Bot: (gives answer)

User: "reset password" (again)
Expected: "I noticed you're asking about this again…" with clarification options
```

**3. Test Feedback:**
- Click thumbs down on any response
- Check database: `SELECT * FROM chat_feedback;`
- Verify interaction was flagged: `SELECT * FROM annotation_queue;`

**4. Check Metrics:**
```bash
curl http://localhost:5000/api/chat/metrics \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## ✅ Verification Checklist

- [ ] Database tables created (9 tables)
- [ ] Chat messages are being logged
- [ ] Repeated questions are detected
- [ ] Low-confidence responses are auto-flagged
- [ ] Feedback buttons work
- [ ] Metrics endpoint returns data
- [ ] Sessions are persisted across page refresh

---

## 📊 View Your Data

### Check Interactions:
```sql
SELECT 
  id, 
  raw_input, 
  model_response, 
  confidence, 
  flagged,
  timestamp
FROM chat_interactions
ORDER BY timestamp DESC
LIMIT 10;
```

### Check Flagged Items:
```sql
SELECT 
  ci.raw_input,
  ci.confidence,
  aq.priority,
  aq.sampling_reason,
  aq.status
FROM annotation_queue aq
JOIN chat_interactions ci ON aq.interaction_id = ci.id
WHERE aq.status = 'pending'
ORDER BY aq.priority DESC;
```

### Check Metrics:
```sql
SELECT 
  AVG(confidence) as avg_confidence,
  SUM(CASE WHEN fallback_used THEN 1 ELSE 0 END)::float / COUNT(*) as fallback_rate,
  COUNT(*) as total_interactions
FROM chat_interactions
WHERE timestamp >= NOW() - INTERVAL '1 day';
```

---

## 🎯 What You Get

### Immediate Benefits:

1. **Every conversation is logged** with full metadata
2. **Repeated questions are detected** automatically
3. **Low-confidence responses are flagged** for review
4. **Human-like responses** make users feel supported
5. **Metrics tracking** shows performance over time

### Next Steps (Optional):

1. **Build annotation UI** - Review and label flagged interactions
2. **Set up active learning** - Sample high-value interactions
3. **Create training pipeline** - Export data for model fine-tuning
4. **Add monitoring dashboard** - Visualize metrics in real-time

---

## 🐛 Troubleshooting

### Issue: "Table doesn't exist"
```bash
# Re-run migration
psql $DATABASE_URL -f prisma/migrations/self_learning_chat_schema.sql
```

### Issue: "Cannot log interaction"
- Check database connection
- Verify user has INSERT permissions
- Check error logs in console

### Issue: "sessionId not persisting"
- Ensure localStorage is working
- Check that sessionId is sent in request body

---

## 📚 Documentation

- **Full Guide:** `/docs/SELF_LEARNING_CHAT_SYSTEM.md`
- **Database Schema:** `/my-backend/prisma/migrations/self_learning_chat_schema.sql`
- **API Services:**
  - `/my-backend/src/services/chat/enhancedChatService.ts`
  - `/my-backend/src/services/chat/interactionLogger.ts`
  - `/my-backend/src/services/chat/humanLikeResponse.ts`

---

## 🎉 You're Done!

Your self-learning chat system is now:
- ✅ Logging all interactions
- ✅ Detecting repeated questions
- ✅ Using human-like responses
- ✅ Auto-flagging issues
- ✅ Ready to learn from users

**Next:** Start collecting data, review flagged interactions, and watch your chatbot improve! 🚀
