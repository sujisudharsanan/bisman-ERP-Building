'use client';

import { useState, useEffect } from 'react';

interface Task {
  id: string;
  title: string;
  subItems: { id: string; text: string }[];
  progress?: number;
  comments: number;
  attachments: number;
  color: string;
  status: 'draft' | 'in_progress' | 'editing' | 'done';
}

interface DashboardData {
  DRAFT: Task[];
  IN_PROGRESS: Task[];
  EDITING: Task[];
  DONE: Task[];
}

export function useDashboardData(role: string) {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    DRAFT: [],
    IN_PROGRESS: [],
    EDITING: [],
    DONE: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - In production, this would be an API call
    // Filter and customize data based on role
    const mockData: DashboardData = {
      DRAFT: [
        {
          id: 'd1',
          title: 'Main Task',
          subItems: [
            { id: 's1', text: 'Incididunt ut labore et dolore' },
            { id: 's2', text: 'Magna aliqua enim' },
          ],
          comments: 1,
          attachments: 5,
          color: 'blue',
          status: 'draft',
        },
        {
          id: 'd2',
          title: 'Secondary Task',
          subItems: [{ id: 's3', text: 'Ad minim veniam, quis ex ea' }],
          comments: 0,
          attachments: 4,
          color: 'purple',
          status: 'draft',
        },
        {
          id: 'd3',
          title: 'Tertiary Task',
          subItems: [{ id: 's4', text: 'Commodo consequat' }],
          comments: 2,
          attachments: 1,
          color: 'indigo',
          status: 'draft',
        },
      ],
      IN_PROGRESS: [
        {
          id: 'p1',
          title: 'Main Task',
          subItems: [{ id: 's5', text: 'Incididunt ut labore et dolore' }],
          progress: 75,
          comments: 1,
          attachments: 5,
          color: 'pink',
          status: 'in_progress',
        },
        {
          id: 'p2',
          title: 'Secondary Task',
          subItems: [
            { id: 's6', text: 'Incididunt ut labore et dolore' },
            { id: 's7', text: 'Magna aliqua enim' },
          ],
          progress: 50,
          comments: 2,
          attachments: 6,
          color: 'cyan',
          status: 'in_progress',
        },
      ],
      EDITING: [
        {
          id: 'e1',
          title: 'Main Task',
          subItems: [
            { id: 's8', text: 'Adipiscing elit sed do eiusmod' },
            { id: 's9', text: 'Et dolore magna aliqua' },
            { id: 's10', text: 'Excepteur sint occaecat cupidatat' },
          ],
          comments: 0,
          attachments: 0,
          color: 'teal',
          status: 'editing',
        },
        {
          id: 'e2',
          title: 'Secondary Task',
          subItems: [
            { id: 's11', text: 'Adipiscing elit sed do eiusmod' },
            { id: 's12', text: 'Et dolore magna aliqua' },
          ],
          comments: 1,
          attachments: 2,
          color: 'cyan',
          status: 'editing',
        },
        {
          id: 'e3',
          title: 'Tertiary Task',
          subItems: [
            { id: 's13', text: 'Adipiscing elit sed do eiusmod' },
            { id: 's14', text: 'Et dolore magna aliqua' },
            { id: 's15', text: 'Excepteur sint occaecat cupidatat' },
          ],
          comments: 0,
          attachments: 1,
          color: 'blue',
          status: 'editing',
        },
      ],
      DONE: [
        {
          id: 'dn1',
          title: 'Main Task',
          subItems: [
            { id: 's16', text: 'Incididunt ut labore et dolore' },
            { id: 's17', text: 'Magna aliqua enim' },
          ],
          comments: 0,
          attachments: 3,
          color: 'purple',
          status: 'done',
        },
        {
          id: 'dn2',
          title: 'Secondary Task',
          subItems: [{ id: 's18', text: 'Incididunt ut labore et' }],
          comments: 1,
          attachments: 2,
          color: 'yellow',
          status: 'done',
        },
        {
          id: 'dn3',
          title: 'Tertiary Task',
          subItems: [{ id: 's19', text: 'Incididunt ut labore et' }],
          comments: 0,
          attachments: 1,
          color: 'pink',
          status: 'done',
        },
      ],
    };

    // Role-based filtering (example)
    // You can customize this based on your requirements
    if (role === 'STAFF') {
      // Staff might see fewer tasks
      mockData.DRAFT = mockData.DRAFT.slice(0, 2);
    }

    setDashboardData(mockData);
    setLoading(false);
  }, [role]);

  return { dashboardData, loading };
}
