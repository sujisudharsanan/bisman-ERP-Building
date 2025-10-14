export type DashboardGraphType = 'profile' | 'completedTasks' | 'efficiency' | 'plan';

export interface DashboardConnectionConfig {
  dataKey: string;
  route?: string; // optional during bootstrap; audit will warn if missing
  description: string;
}

export const dashboardConnections: Record<DashboardGraphType, DashboardConnectionConfig> = {
  profile: {
    dataKey: 'userProfile',
    route: '/profile',
    description: 'User profile and preferences',
  },
  completedTasks: {
    dataKey: 'completedTasks',
    route: '/reports/completed-tasks',
    description: 'Completed Tasks overview',
  },
  efficiency: {
    dataKey: 'efficiency',
    route: '/reports/efficiency',
    description: 'Team efficiency metrics',
  },
  plan: {
    dataKey: 'dailyPlan',
    route: '/schedule/plan',
    description: 'Daily plan and schedule',
  },
};

export const roleGraphConfig: Record<string, DashboardGraphType[]> = {
  SUPER_ADMIN: ['profile', 'completedTasks', 'efficiency', 'plan'],
  ADMIN: ['profile', 'completedTasks', 'efficiency', 'plan'],
  MANAGER: ['profile', 'completedTasks', 'efficiency', 'plan'],
  STAFF: ['profile', 'completedTasks', 'efficiency', 'plan'],
  USER: ['profile', 'completedTasks', 'efficiency', 'plan'],
};
