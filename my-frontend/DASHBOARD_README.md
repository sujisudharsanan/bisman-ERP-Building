# Task Management Dashboard

## Overview
A fully responsive ERP Dashboard Layout built with React, TypeScript, and Tailwind CSS, featuring a dark purple-blue gradient theme with Kanban-style task management.

## 🎨 Design Features
- **Dark Theme**: Purple-blue gradient backgrounds with neon accents
- **Glassmorphism**: Backdrop blur effects and semi-transparent containers
- **Glow Effects**: Subtle shadow and glow on interactive elements
- **Smooth Animations**: Hover lift effects and transitions

## 📁 Component Structure

```
my-frontend/src/
├── components/
│   ├── layout/
│   │   ├── DashboardLayout.tsx      # Main layout container
│   │   ├── DashboardSidebar.tsx     # Vertical icon sidebar
│   │   └── TopNavbar.tsx            # Top navigation bar
│   └── dashboard/
│       ├── TaskCard.tsx             # Reusable task card component
│       ├── KanbanColumn.tsx         # Kanban column container
│       └── RightPanel.tsx           # Analytics & schedule panel
├── hooks/
│   └── useDashboardData.ts          # Dashboard data hook
└── app/
    └── task-dashboard/
        └── page.tsx                 # Main dashboard page
```

## 🚀 Usage

### Accessing the Dashboard
Navigate to `/task-dashboard` route. The dashboard is accessible to all authenticated users except SUPER_ADMIN.

### Role-Based Access
- **SUPER_ADMIN**: Redirected to `/super-admin`
- **STAFF**: Redirected to `/hub-incharge`
- **All Other Roles**: Access task management dashboard

### Example
```tsx
import { useRouter } from 'next/navigation';

// In your navigation component
<button onClick={() => router.push('/task-dashboard')}>
  Task Management
</button>
```

## 🧩 Component Props

### DashboardLayout
```tsx
interface DashboardLayoutProps {
  children: React.ReactNode;
  role: string;  // User role for customization
}
```

### TaskCard
```tsx
interface TaskCardProps {
  title: string;
  subItems: { id: string; text: string }[];
  progress?: number;       // 0-100
  comments: number;
  attachments: number;
  color: string;          // 'blue', 'pink', 'purple', etc.
}
```

### KanbanColumn
```tsx
interface KanbanColumnProps {
  title: string;          // Column title
  tasks: Task[];          // Array of tasks
}
```

## 🎨 Color Palette

The dashboard uses predefined Tailwind color classes:
- **Blue**: `from-blue-500 to-blue-600/70`
- **Pink**: `from-pink-500 to-pink-600/70`
- **Purple**: `from-purple-500 to-purple-600/70`
- **Yellow**: `from-yellow-500 to-yellow-600/70`
- **Green**: `from-green-500 to-green-600/70`
- **Cyan**: `from-cyan-500 to-cyan-600/70`
- **Teal**: `from-teal-500 to-teal-600/70`
- **Indigo**: `from-indigo-500 to-indigo-600/70`

## 📱 Responsive Behavior

### Desktop (lg+)
- Sidebar: Fixed vertical icon bar
- Kanban: Horizontal 4-column layout
- Right Panel: Fixed width (384px)

### Tablet (md)
- Sidebar: Icon-only mode
- Kanban: Horizontal scroll
- Right Panel: Below kanban board

### Mobile
- Sidebar: Collapsed
- Kanban: Vertical stack
- Right Panel: Full width below

## 🔧 Customization

### Adding New Task Status
Edit `useDashboardData.ts`:
```tsx
const mockData = {
  DRAFT: [...],
  IN_PROGRESS: [...],
  EDITING: [...],
  DONE: [...],
  YOUR_NEW_STATUS: [...],  // Add here
};
```

### Changing Colors
Edit `TaskCard.tsx`:
```tsx
const colorClasses: Record<string, string> = {
  // Add your custom color
  custom: 'from-orange-500 to-orange-600/70',
};
```

### Role-Based Data Filtering
Modify `useDashboardData.ts`:
```tsx
if (role === 'YOUR_ROLE') {
  // Custom filtering logic
  mockData.DRAFT = mockData.DRAFT.filter(task => ...);
}
```

## 🎯 Features

### Dark Mode
- Uses existing `ThemeToggle` component
- Persists in localStorage
- Applies Tailwind `dark:` classes

### Logout
- Integrated global `LogoutButton`
- Positioned in top navbar
- Maintains authentication flow

### Charts
- **Bar Chart**: Completed tasks by author
- **Doughnut Charts**: Efficiency metrics
- Dark theme optimized
- Responsive sizing

### Kanban Board
- Drag-and-drop ready structure
- Custom scrollbar styling
- Overflow handling
- Status-based coloring

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Type checking
npm run type-check

# Linting
npm run lint
```

## 📝 Notes

### API Integration
Currently uses mock data via `useDashboardData` hook. To integrate with real API:

```tsx
// In useDashboardData.ts
useEffect(() => {
  const fetchData = async () => {
    const response = await fetch(`/api/dashboard/${role}`);
    const data = await response.json();
    setDashboardData(data);
  };
  fetchData();
}, [role]);
```

### Task Status Keys
Ensure backend status values match:
- `draft` → DRAFT column
- `in_progress` → IN PROGRESS column
- `editing` → EDITING column
- `done` → DONE column

## 🐛 Known Issues
None currently. Report issues on GitHub.

## 🔮 Future Enhancements
- [ ] Drag-and-drop task reordering
- [ ] Real-time updates via WebSocket
- [ ] Task creation modal
- [ ] Advanced filtering/sorting
- [ ] Export functionality
- [ ] Mobile gesture support

## 📄 License
Part of BISMAN ERP System - Internal Use Only
