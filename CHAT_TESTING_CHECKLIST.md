# Chat Feature Testing Checklist

## ✅ Testing Checklist

### 1. Chat Button Integration
- [ ] Open the app as a company user
- [ ] Navigate to company dashboard (`/dashboard`)
- [ ] Verify each project card has a "Chat with Client" button
- [ ] Click the chat button on any project
- [ ] Confirm it navigates to `/messages/:conversationId`
- [ ] Verify conversation appears in left sidebar

### 2. Messages Interface Layout
- [ ] Left sidebar shows all conversations
- [ ] Each conversation shows:
  - [ ] Contact avatar with first letter
  - [ ] Contact name
  - [ ] Project title
  - [ ] Last message time
  - [ ] Unread count badge (if any)
- [ ] Right panel shows:
  - [ ] Chat header with contact info
  - [ ] Messages area with bubbles
  - [ ] Message input at bottom

### 3. Sending Messages
- [ ] Type a message in the input box
- [ ] Click send button (📤)
- [ ] Message appears on right side in green bubble
- [ ] Status shows: 🕐 → ✓ → ✓✓
- [ ] Message appears in left sidebar as last message
- [ ] Timestamp is displayed correctly

### 4. Receiving Messages
- [ ] Open same conversation as client (in different browser/incognito)
- [ ] Send message from client side
- [ ] Verify message appears instantly on company side
- [ ] Message bubble is white and on left side
- [ ] No status indicators on received messages

### 5. Message Status Progression
- [ ] Send a message (should show 🕐 pending)
- [ ] After send, should show ✓ (sent)
- [ ] After delivery, should show ✓✓ gray (delivered)
- [ ] When recipient opens chat, should show ✓✓ blue (read)

### 6. Editing Messages
- [ ] Send a message
- [ ] Hover over the message
- [ ] Click dropdown (▼) button
- [ ] Click "Edit" option
- [ ] Modify the message text
- [ ] Click "Save"
- [ ] Verify message updates with "(edited)" label
- [ ] Check other user sees the edit in real-time

### 7. Deleting Messages
- [ ] Send a message
- [ ] Hover and click dropdown (▼)
- [ ] Click "Delete" option
- [ ] Confirm deletion prompt
- [ ] Verify message disappears
- [ ] Check other user sees deletion in real-time

### 8. File Attachments
- [ ] Click attachment button (📎)
- [ ] Select a file (PDF, image, etc.)
- [ ] Verify file name appears below input
- [ ] Send the message
- [ ] Verify file shows as attachment in message
- [ ] Test with multiple files (up to 3)

### 9. Conversation Management
- [ ] Click menu button (⋮) in chat header
- [ ] Test "Clear Chat History":
  - [ ] Confirms before clearing
  - [ ] All messages removed
  - [ ] Conversation still exists
  - [ ] Other user sees cleared chat
- [ ] Test "Delete Conversation":
  - [ ] Confirms before deleting
  - [ ] Conversation removed from sidebar
  - [ ] Redirects to `/messages`
  - [ ] Other user sees conversation deleted

### 10. Real-Time Features
- [ ] Open conversation in two browsers (different roles)
- [ ] Send message from one → appears in other instantly
- [ ] Edit message → updates in real-time
- [ ] Delete message → removes in real-time
- [ ] Mark as read → status updates to blue checks

### 11. Unread Count Badges
- [ ] Send messages to a conversation
- [ ] Check unread count appears on conversation item
- [ ] Check total unread count in sidebar header
- [ ] Open the conversation
- [ ] Verify unread count resets to 0

### 12. Multiple Conversations
- [ ] Start chat from different projects
- [ ] Verify multiple conversations appear in sidebar
- [ ] Switch between conversations
- [ ] Verify correct messages load for each
- [ ] Check active conversation is highlighted

### 13. Empty States
- [ ] Open messages with no conversations
- [ ] Verify friendly empty state message
- [ ] Open messages but don't select a conversation
- [ ] Verify "Select a conversation" message on right

### 14. Responsive Design
- [ ] Test on desktop (1920x1080)
- [ ] Test on tablet (768x1024)
- [ ] Test on mobile (375x667)
- [ ] Verify layout adjusts properly
- [ ] Check all features work on mobile

### 15. Error Handling
- [ ] Try sending empty message (should be disabled)
- [ ] Disconnect internet and send message
- [ ] Verify error handling
- [ ] Try editing to empty message (should show alert)
- [ ] Test with very long messages

### 16. Performance
- [ ] Load conversation with 50+ messages
- [ ] Verify smooth scrolling
- [ ] Check auto-scroll to latest message
- [ ] Verify no lag when typing
- [ ] Check memory usage doesn't spike

### 17. Backend Validation
- [ ] Check backend console for errors
- [ ] Verify Socket.IO connections established
- [ ] Check message documents in MongoDB
- [ ] Verify status fields update correctly
- [ ] Check isEdited flag on edited messages

### 18. Security
- [ ] Try accessing conversation you're not part of
- [ ] Try editing someone else's message (should fail)
- [ ] Try deleting someone else's message (should fail)
- [ ] Verify authorization checks work

---

## 🚨 Known Issues to Watch For

1. **Socket disconnections**: If user's socket disconnects, real-time updates may stop
2. **Large files**: Uploads over 5MB may be slow
3. **Very old conversations**: Loading 1000+ messages might take time
4. **Concurrent edits**: If both users edit at same time, last one wins

---

## 📊 Success Criteria

- ✅ All 18 test sections pass
- ✅ No console errors
- ✅ Real-time updates work smoothly
- ✅ UI matches WhatsApp design principles
- ✅ Mobile experience is fluid
- ✅ No security vulnerabilities

---

## 🎯 Test Accounts Needed

Create these test accounts for thorough testing:

1. **Client Account** (posts projects)
   - Email: client@test.com
   - Role: client

2. **Company Account 1** (applies to projects)
   - Email: company1@test.com
   - Role: company

3. **Company Account 2** (for multiple conversations)
   - Email: company2@test.com
   - Role: company

---

**Happy Testing!** 🧪✨
