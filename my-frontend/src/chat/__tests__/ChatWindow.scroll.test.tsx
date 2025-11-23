import React from 'react';
import { render, screen } from '@testing-library/react';
import ChatWindow from '../../components/chat/ChatWindow';

// Minimal mock for messages
const makeMsgs = (n: number) => Array.from({ length: n }).map((_, i) => ({
  id: i+1,
  sender: 'User',
  text: 'Message ' + (i+1),
  time: 'now',
  isMine: false
}));

describe('ChatWindow scroll behavior', () => {
  test('does not auto-scroll when user scrolled up', () => {
    const messages = makeMsgs(50);
    const { container, rerender } = render(<ChatWindow contact={{ id:1, name:'Test', avatar:'', online:true }} messages={messages} />);
    const scrollArea = container.querySelector('[role="list"]') as HTMLElement;
    // Simulate user scroll up
    if (scrollArea) {
      scrollArea.scrollTop = 0; // top
      scrollArea.dispatchEvent(new Event('scroll'));
    }
    // Add new messages
    const more = makeMsgs(55);
    rerender(<ChatWindow contact={{ id:1, name:'Test', avatar:'', online:true }} messages={more} />);
    // Expect scrollTop remains near top (not forced to bottom)
    if (scrollArea) {
      expect(scrollArea.scrollTop).toBeLessThan(scrollArea.scrollHeight - scrollArea.clientHeight - 100);
    }
  });
});
