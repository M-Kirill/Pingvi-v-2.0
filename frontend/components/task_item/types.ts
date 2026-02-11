export type TaskStatus = 'todo' | 'in-progress' | 'completed';

export interface TaskItemProps {
  id: string;
  title: string;
  status: TaskStatus;
  onPress?: (id: string, newStatus: TaskStatus) => void;
  onDelete?: (id: string) => void;
}

export interface TaskStatusConfig {
  label: string;
  gradientColors: string[];
}

export const TASK_STATUS_CONFIG: Record<TaskStatus, TaskStatusConfig> = {
  'todo': {
    label: 'Сделать',
    gradientColors: ['#8D41C1', '#B667C4'],
  },
  'in-progress': {
    label: 'В процессе',
    gradientColors: ['#FF9D00', '#E7CF18'],
  },
  'completed': {
    label: 'Выполнено',
    gradientColors: ['#26D429', '#87E4BC'],
  },
};