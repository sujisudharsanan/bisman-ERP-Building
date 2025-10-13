/**
 * Header Component Unit Tests
 * Tests internationalization, accessibility, and user data display
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Header from './Header';

// Mock the useUser hook
vi.mock('@/hooks/useUser', () => ({
  useUser: vi.fn(),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: any) => (
    <a href={href}>{children}</a>
  ),
}));

import { useUser } from '@/hooks/useUser';

describe('Header Component', () => {
  it('should render loading state when user data is loading', () => {
    (useUser as any).mockReturnValue({
      user: null,
      loading: true,
    });

    render(<Header />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('should render user avatar with profile photo URL', () => {
    (useUser as any).mockReturnValue({
      user: {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        role: 'ADMIN',
        profilePhotoUrl: 'https://example.com/photo.jpg',
      },
      loading: false,
    });

    render(<Header />);
    
    const avatar = screen.getByAltText('User profile photo');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', 'https://example.com/photo.jpg');
  });

  it('should render fallback avatar when no profile photo', () => {
    (useUser as any).mockReturnValue({
      user: {
        id: 1,
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: 'MANAGER',
        profilePhotoUrl: undefined,
      },
      loading: false,
    });

    render(<Header />);
    
    // Should render User icon as fallback
    const link = screen.getByLabelText('Go to profile');
    expect(link).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
  });

  it('should display user name correctly', () => {
    (useUser as any).mockReturnValue({
      user: {
        id: 1,
        name: 'Alice Johnson',
        email: 'alice@example.com',
        role: 'STAFF',
      },
      loading: false,
    });

    render(<Header />);
    
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
  });

  it('should display role dashboard text with i18n format', () => {
    (useUser as any).mockReturnValue({
      user: {
        id: 1,
        name: 'Bob Wilson',
        email: 'bob@example.com',
        role: 'SUPER_ADMIN',
      },
      loading: false,
    });

    render(<Header />);
    
    expect(screen.getByText('Super Admin - Dashboard')).toBeInTheDocument();
  });

  it('should link to /profile route', () => {
    (useUser as any).mockReturnValue({
      user: {
        id: 1,
        name: 'Carol Davis',
        email: 'carol@example.com',
        role: 'USER',
      },
      loading: false,
    });

    render(<Header />);
    
    const profileLink = screen.getByLabelText('Go to profile');
    expect(profileLink).toHaveAttribute('href', '/profile');
  });

  it('should have proper ARIA labels for accessibility', () => {
    (useUser as any).mockReturnValue({
      user: {
        id: 1,
        name: 'David Lee',
        email: 'david@example.com',
        role: 'ADMIN',
      },
      loading: false,
    });

    render(<Header onMenuToggle={() => {}} />);
    
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByLabelText('Main header')).toBeInTheDocument();
    expect(screen.getByLabelText('Open main menu')).toBeInTheDocument();
    expect(screen.getByLabelText('Go to profile')).toBeInTheDocument();
  });

  it('should render menu toggle button when onMenuToggle prop is provided', () => {
    (useUser as any).mockReturnValue({
      user: {
        id: 1,
        name: 'Eve Martinez',
        email: 'eve@example.com',
        role: 'MANAGER',
      },
      loading: false,
    });

    const mockToggle = vi.fn();
    render(<Header onMenuToggle={mockToggle} />);
    
    const menuButton = screen.getByLabelText('Open main menu');
    expect(menuButton).toBeInTheDocument();
  });

  it('should handle different role types correctly', () => {
    const roles = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STAFF', 'USER'];
    const expectedDisplayNames = ['Super Admin', 'Admin', 'Manager', 'Staff', 'User'];

    roles.forEach((role, index) => {
      (useUser as any).mockReturnValue({
        user: {
          id: index + 1,
          name: `Test User ${index}`,
          email: `test${index}@example.com`,
          role: role,
        },
        loading: false,
      });

      const { unmount } = render(<Header />);
      
      expect(screen.getByText(`${expectedDisplayNames[index]} - Dashboard`)).toBeInTheDocument();
      
      unmount();
    });
  });

  it('should have keyboard focus styles for accessibility', () => {
    (useUser as any).mockReturnValue({
      user: {
        id: 1,
        name: 'Frank Green',
        email: 'frank@example.com',
        role: 'ADMIN',
      },
      loading: false,
    });

    render(<Header onMenuToggle={() => {}} />);
    
    const profileLink = screen.getByLabelText('Go to profile');
    expect(profileLink).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');
    
    const menuButton = screen.getByLabelText('Open main menu');
    expect(menuButton).toHaveClass('focus:outline-none', 'focus:ring-2', 'focus:ring-blue-500');
  });

  it('should not render user section when user is null', () => {
    (useUser as any).mockReturnValue({
      user: null,
      loading: false,
    });

    render(<Header />);
    
    expect(screen.queryByLabelText('Go to profile')).not.toBeInTheDocument();
    expect(screen.queryByText(/Dashboard/)).not.toBeInTheDocument();
  });
});
