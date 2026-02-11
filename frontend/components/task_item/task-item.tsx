import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { TaskItemProps, TaskStatus, TASK_STATUS_CONFIG } from './types';
import styles from './styles';

export const TaskItem: React.FC<TaskItemProps> = (props) => {
  // Добавьте проверку на undefined
  if (!props) {
    console.error("TaskItem получил undefined props");
    return null;
  }

  const {
    id,
    title,
    status = 'todo', // Значение по умолчанию
    onPress,
    onDelete,
  } = props;

  // Безопасное получение конфига с fallback
  const config = TASK_STATUS_CONFIG[status] || TASK_STATUS_CONFIG['todo'];
  const isCompleted = status === 'completed';

// В task-item.tsx измените функцию changeStatus:
const changeStatus = () => {
  if (!onPress) return;

  let nextStatus: TaskStatus;

  switch (status) {
    case 'todo':
      nextStatus = 'in-progress';
      break;
    case 'in-progress':
      nextStatus = 'completed';
      break;
    case 'completed':
      nextStatus = 'todo';
      break;
    default:
      nextStatus = 'todo';
  }

  // ВЫЗЫВАЕМ onPress с ПЕРЕДАННЫМ nextStatus, не рассчитывая новый статус в tasks.tsx
  onPress(id, nextStatus);
};

  const handleCheckboxPress = () => {
    changeStatus();
  };

  const handleStatusPress = () => {
    changeStatus();
  };

  const handleDelete = () => {
    Alert.alert(
      'Удаление задачи',
      `Вы уверены, что хотите удалить задачу "${title || 'Без названия'}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => onDelete && onDelete(id),
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Чекбокс слева */}
      <TouchableOpacity
        style={[
          styles.checkbox,
          isCompleted && styles.checkboxCompleted
        ]}
        onPress={handleCheckboxPress}
        activeOpacity={0.6}
      >
        {isCompleted ? (
          <Ionicons
            name="checkmark"
            size={18}
            color="#FFFFFF"
          />
        ) : (
          <View style={styles.emptyCheckbox} />
        )}
      </TouchableOpacity>

      {/* Название задачи */}
      <View style={styles.textContainer}>
        <Text style={[
          styles.title,
          isCompleted && styles.titleCompleted
        ]}>
          {title || 'Без названия'}
        </Text>
      </View>

      {/* Правая часть - статус и удаление */}
      <View style={styles.rightContainer}>
        {/* Статус с градиентом */}
        <TouchableOpacity
          onPress={handleStatusPress}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={config.gradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.statusBadge,
              isCompleted && styles.statusBadgeCompleted
            ]}
          >
            <Text style={styles.statusText}>{config.label}</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Иконка удаления */}
        {onDelete && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDelete}
            activeOpacity={0.6}
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color="#999999"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};