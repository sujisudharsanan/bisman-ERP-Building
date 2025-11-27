# Chat API Quick Test Guide 🧪

## Prerequisites
- Backend running on `http://localhost:5000`
- Valid JWT token (get from login)

---

## Step 1: Get Your Auth Token

```bash
# Login to get token
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo_hub_incharge@bisman.demo",
    "password": "Demo@123"
  }'

# Response includes: { "token": "YOUR_JWT_TOKEN", ... }
# Copy the token for next steps
```

Set token as variable:
```bash
TOKEN="paste_your_token_here"
```

---

## Step 2: Check Chat Health

```bash
curl http://localhost:5000/api/chat/health | jq '.'

# Expected:
{
  "module": "chat",
  "status": "ok",
  "features": {
    "ai": true,
    "threads": true,
    "calls": true,
    "realtime": true,
    "database": true
  }
}
```

---

## Step 3: Create a Thread

```bash
curl -X POST http://localhost:5000/api/chat/threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Chat Thread",
    "type": "group"
  }' | jq '.'

# Save the returned thread ID
THREAD_ID="paste_thread_id_here"
```

---

## Step 4: Send a Message

```bash
curl -X POST "http://localhost:5000/api/chat/threads/$THREAD_ID/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello! This is my first message!",
    "type": "text"
  }' | jq '.'

# Expected response:
{
  "id": "...",
  "threadId": "...",
  "senderId": 1,
  "content": "Hello! This is my first message!",
  "type": "text",
  "isEdited": false,
  "isDeleted": false,
  "createdAt": "2025-11-27T...",
  "sender": {
    "id": 1,
    "username": "...",
    "email": "..."
  }
}

# Save the message ID
MESSAGE_ID="paste_message_id_here"
```

---

## Step 5: Get Messages

```bash
curl "http://localhost:5000/api/chat/threads/$THREAD_ID/messages?limit=50&offset=0" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Expected:
{
  "messages": [...],
  "total": 1,
  "hasMore": false
}
```

---

## Step 6: Edit Message

```bash
curl -X PUT "http://localhost:5000/api/chat/messages/$MESSAGE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Updated message content!"
  }' | jq '.'

# Expected: Updated message with isEdited: true
```

---

## Step 7: Add Reaction

```bash
curl -X POST "http://localhost:5000/api/chat/messages/$MESSAGE_ID/reactions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "emoji": "👍"
  }' | jq '.'

# Expected: Message with reactions array
```

---

## Step 8: Mark as Read

```bash
curl -X POST "http://localhost:5000/api/chat/messages/read" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"messageIds\": [\"$MESSAGE_ID\"]
  }" | jq '.'

# Expected: { "success": true, "message": "Messages marked as read" }
```

---

## Step 9: Search Messages

```bash
curl "http://localhost:5000/api/chat/messages/search?q=hello&limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Expected:
{
  "query": "hello",
  "results": [...],
  "total": 1
}
```

---

## Step 10: Delete Message

```bash
curl -X DELETE "http://localhost:5000/api/chat/messages/$MESSAGE_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Expected: { "success": true, "message": "Message deleted successfully" }
```

---

## Complete Test Script

Save as `test-chat-api.sh`:

```bash
#!/bin/bash

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Chat API Test Suite ===${NC}\n"

# Login
echo -e "${GREEN}1. Login...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo_hub_incharge@bisman.demo",
    "password": "Demo@123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token')
echo "Token: ${TOKEN:0:20}..."

# Health Check
echo -e "\n${GREEN}2. Health Check...${NC}"
curl -s http://localhost:5000/api/chat/health | jq '.status'

# Create Thread
echo -e "\n${GREEN}3. Creating thread...${NC}"
THREAD_RESPONSE=$(curl -s -X POST http://localhost:5000/api/chat/threads \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Thread",
    "type": "group"
  }')

THREAD_ID=$(echo $THREAD_RESPONSE | jq -r '.id')
echo "Thread ID: $THREAD_ID"

# Send Message
echo -e "\n${GREEN}4. Sending message...${NC}"
MESSAGE_RESPONSE=$(curl -s -X POST "http://localhost:5000/api/chat/threads/$THREAD_ID/messages" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Test message from script!",
    "type": "text"
  }')

MESSAGE_ID=$(echo $MESSAGE_RESPONSE | jq -r '.id')
echo "Message ID: $MESSAGE_ID"
echo "Content: $(echo $MESSAGE_RESPONSE | jq -r '.content')"

# Get Messages
echo -e "\n${GREEN}5. Fetching messages...${NC}"
curl -s "http://localhost:5000/api/chat/threads/$THREAD_ID/messages" \
  -H "Authorization: Bearer $TOKEN" | jq '.messages | length'
echo "messages retrieved"

# Add Reaction
echo -e "\n${GREEN}6. Adding reaction...${NC}"
curl -s -X POST "http://localhost:5000/api/chat/messages/$MESSAGE_ID/reactions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"emoji": "🎉"}' | jq '.reactions'

# Mark as Read
echo -e "\n${GREEN}7. Marking as read...${NC}"
curl -s -X POST "http://localhost:5000/api/chat/messages/read" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"messageIds\": [\"$MESSAGE_ID\"]}" | jq '.success'

# Search
echo -e "\n${GREEN}8. Searching messages...${NC}"
curl -s "http://localhost:5000/api/chat/messages/search?q=test" \
  -H "Authorization: Bearer $TOKEN" | jq '.total'
echo "results found"

echo -e "\n${BLUE}=== Test Complete ===${NC}"
```

Run it:
```bash
chmod +x test-chat-api.sh
./test-chat-api.sh
```

---

## Expected Output

```
=== Chat API Test Suite ===

1. Login...
Token: eyJhbGciOiJIUzI1NiIsIn...

2. Health Check...
"ok"

3. Creating thread...
Thread ID: clp8x...

4. Sending message...
Message ID: clp8y...
Content: Test message from script!

5. Fetching messages...
1 messages retrieved

6. Adding reaction...
[{"emoji":"🎉","userId":1,"createdAt":"..."}]

7. Marking as read...
true

8. Searching messages...
1 results found

=== Test Complete ===
```

---

## Verify in Database

```bash
# Using Prisma Studio
cd my-backend
npx prisma studio

# Open browser: http://localhost:5555
# Navigate to ThreadMessage table
# See your messages!
```

---

## Common Errors & Solutions

### 401 Unauthorized
**Error**: `{"error":"missing or malformed token"}`  
**Fix**: Check your token is correct and not expired

### 403 Forbidden
**Error**: `{"error":"Unauthorized: You can only edit your own messages"}`  
**Fix**: You're trying to edit/delete someone else's message

### 404 Not Found
**Error**: `{"error":"Message not found"}`  
**Fix**: Check message ID is correct

### 500 Internal Server Error
**Error**: `{"error":"Failed to send message"}`  
**Fix**: Check backend logs for detailed error

---

## Socket.IO Real-time Test

Open browser console at `http://localhost:3000` and run:

```javascript
// Connect to chat namespace
const socket = io('http://localhost:5000/chat', {
  auth: {
    token: 'YOUR_JWT_TOKEN'
  }
});

// Listen for new messages
socket.on('chat:message', (data) => {
  console.log('New message:', data);
});

// Listen for reactions
socket.on('chat:reaction:added', (data) => {
  console.log('Reaction added:', data);
});

// Send a message via Socket.IO
socket.emit('chat:message', {
  threadId: 'YOUR_THREAD_ID',
  content: 'Hello from Socket.IO!',
  type: 'text'
});
```

---

## Performance Test

Send 100 messages:

```bash
for i in {1..100}; do
  curl -s -X POST "http://localhost:5000/api/chat/threads/$THREAD_ID/messages" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"content\": \"Message $i\", \"type\": \"text\"}" > /dev/null
  echo "Sent message $i"
done
```

---

**All tests passing?** ✅ Your chat system is fully functional!
