export type TaskStatus = 'pending' | 'completed';

export interface Activity {
  id: string;
  name: string;
  color: string;
  dailyGoalMinutes: number;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  title: string;
  activityId: string;
  status: TaskStatus;
  /** Time spent in minutes (can be decimal internally, displayed nicely) */
  minutesSpent: number;
  /** Optional ISO datetime string for task alert/reminder */
  alertAt: string | null;
  /** Whether the scheduled alert already fired */
  alertTriggered: boolean;
  notes: string;
  createdAt: string;
  completedAt: string | null;
}

export interface ActiveTimer {
  taskId: string;
  startedAt: number; // epoch ms
}

export interface UserSettings {
  userName: string;
  soundAlertsEnabled: boolean;
  browserNotificationsEnabled: boolean;
}

export interface ProductivityStore {
  settings: UserSettings;
  activities: Activity[];
  tasks: TaskItem[];
  activeTimer: ActiveTimer | null;
}

export type DateRangeFilter = 'today' | 'week' | 'all';

export type WorkspaceTab =
  | 'overview'
  | 'tasks'
  | 'activities'
  | 'simulator'
  | 'chrome-store';

export interface MotivationalQuote {
  id: string;
  text: string;
  author: string;
}
