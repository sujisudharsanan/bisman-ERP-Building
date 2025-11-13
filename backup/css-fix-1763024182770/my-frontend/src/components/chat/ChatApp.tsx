"use client";
import React, { useState } from 'react';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';

// Dummy data
const contacts = [
  {
    id: 1,
    name: 'Louis Litt',
    avatar: 'https://i.pravatar.cc/150?img=11',
    lastMessage: 'You just got LITT up, Mike.',
    online: true,
    unread: 2
  },
  {
    id: 2,
    name: 'Harvey Specter',
    avatar: 'https://i.pravatar.cc/150?img=12',
    lastMessage: 'Wrong. You take the gun, or yo...',
    online: true,
    unread: 0
  },
  {
    id: 3,
    name: 'Rachel Zane',
    avatar: 'https://i.pravatar.cc/150?img=5',
    lastMessage: 'Hi Mike! I heard we could hav...',
    online: false,
    unread: 1
  },
  {
    id: 4,
    name: 'Donna Paulsen',
    avatar: 'https://i.pravatar.cc/150?img=9',
    lastMessage: 'Mike, I know everything! I\'m Don...',
    online: true,
    unread: 0
  },
  {
    id: 5,
    name: 'Jessica Pearson',
    avatar: 'https://i.pravatar.cc/150?img=10',
    lastMessage: 'Here\'s a memo about the draft on t...',
    online: false,
    unread: 0
  },
  {
    id: 6,
    name: 'Harold Gunderson',
    avatar: 'https://i.pravatar.cc/150?img=13',
    lastMessage: 'Thanks, Mike! :)',
    online: true,
    unread: 0
  }
];

const messages = {
  1: [
    { id: 1, sender: 'Louis Litt', text: 'You just got LITT up, Mike.', time: '10:30 AM', isMine: false },
    { id: 2, sender: 'Me', text: 'Haha, good one Louis!', time: '10:32 AM', isMine: true }
  ],
  2: [
    { id: 1, sender: 'Harvey Specter', text: 'Oh yeah, did Michael Jordan tell you that?', time: '9:15 AM', isMine: false },
    { id: 2, sender: 'Me', text: 'No, I told him that.', time: '9:16 AM', isMine: true },
    { id: 3, sender: 'Harvey Specter', text: 'What are your choices when someone puts a gun to your head?', time: '9:18 AM', isMine: false },
    { id: 4, sender: 'Me', text: 'What are you talking about? You do what they say or they shoot you.', time: '9:20 AM', isMine: true },
    { id: 5, sender: 'Harvey Specter', text: 'Wrong. You take the gun, or you pull out a bigger one. Or, you call their bluff. Or, you do any one of a hundred and forty six other things.', time: '9:22 AM', isMine: false }
  ],
  3: [
    { id: 1, sender: 'Rachel Zane', text: 'Hi Mike! I heard we could have coffee together?', time: '11:00 AM', isMine: false },
    { id: 2, sender: 'Me', text: 'Absolutely! When works for you?', time: '11:05 AM', isMine: true }
  ],
  4: [
    { id: 1, sender: 'Donna Paulsen', text: 'Mike, I know everything! I\'m Donna.', time: '2:30 PM', isMine: false }
  ],
  5: [
    { id: 1, sender: 'Jessica Pearson', text: 'Here\'s a memo about the draft on the merger.', time: 'Yesterday', isMine: false }
  ],
  6: [
    { id: 1, sender: 'Harold Gunderson', text: 'Thanks, Mike! :)', time: 'Yesterday', isMine: false }
  ]
};

export default function ChatApp() {
  const [activeContact, setActiveContact] = useState(2); // Harvey Specter active by default

  const currentContact = contacts.find(c => c.id === activeContact);
  const currentMessages = messages[activeContact as keyof typeof messages] || [];

  return (
    <div className="flex h-[500px] w-[367px] bg-white rounded-lg shadow-2xl overflow-hidden">
      <ChatSidebar
        contacts={contacts}
        activeContact={activeContact}
        onSelectContact={setActiveContact}
      />
      <ChatWindow
        contact={currentContact}
        messages={currentMessages}
      />
    </div>
  );
}
