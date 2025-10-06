import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app heading', () => {
  render(<App />);
  const el = screen.getByText(/My Frontend/i);
  expect(el).toBeTruthy();
});
