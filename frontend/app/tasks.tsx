import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, Image, TouchableOpacity, StyleSheet,
  Dimensions, StatusBar, ScrollView, RefreshControl, Alert
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTasks, TaskStatus } from "../hooks/tasksSafe";
import { TaskItem } from "../components/task_item/task-item";

import homeIcon from "../assets/home.png";
import tasksIcon from "../assets/calendar.png";
import statIcon from "../assets/tasks.png";
import plusIcon from "../assets/plus.png";
import penguinImage from "../assets/pingu-tasks.png";
import backIcon from "../assets/back.png";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DAYS_OF_WEEK = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function TasksScreen(): JSX.Element {
  const router = useRouter();
  const { tasks, updateTaskStatus, getTasksByDateAndType, loadTasks, deleteTask } = useTasks();

  const [selectedSegment, setSelectedSegment] = useState<"all" | "child" | "self">("all");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekDays, setWeekDays] = useState<number[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<"new" | "completed">("new");
  const [refreshing, setRefreshing] = useState(false);

  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const currentMonthName = currentDate.toLocaleString('ru-RU', { month: 'long' });

  const getWeekDays = useCallback((date: Date) => {
    const result = [];
    const currentDay = date.getDate();
    const currentWeekDay = date.getDay();

    let monday = new Date(date);
    const daysSinceMonday = currentWeekDay === 0 ? 6 : currentWeekDay - 1;
    monday.setDate(currentDay - daysSinceMonday);

    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(monday);
      dayDate.setDate(monday.getDate() + i);
      result.push({
        day: dayDate.getDate(),
        month: dayDate.getMonth(),
        year: dayDate.getFullYear(),
        date: dayDate
      });
    }
    return result;
  }, []);

  const updateFilteredTasks = useCallback(() => {
    let filtered = getTasksByDateAndType(selectedDate, selectedSegment === "all" ? undefined : selectedSegment);

    if (sortBy === "new") {
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      filtered.sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return -1;
        if (a.status !== 'completed' && b.status === 'completed') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    setFilteredTasks(filtered);
  }, [getTasksByDateAndType, selectedDate, selectedSegment, sortBy]);

  useEffect(() => {
    const days = getWeekDays(currentDate);
    setWeekDays(days.map(d => d.day));
    updateFilteredTasks();
  }, [currentDate, getWeekDays, selectedSegment, selectedDate, sortBy, tasks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  }, [loadTasks]);

  const goToPreviousWeek = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() - 7);
      return newDate;
    });
  };

  const goToNextWeek = () => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + 7);
      return newDate;
    });
  };

  const isToday = (day: number) => {
    const today = new Date();
    const days = getWeekDays(currentDate);
    const dayData = days.find(d => d.day === day);

    if (!dayData) return false;
    return day === today.getDate() &&
           dayData.month === today.getMonth() &&
           dayData.year === today.getFullYear();
  };

  const isSelected = (day: number) => {
    const days = getWeekDays(currentDate);
    const dayData = days.find(d => d.day === day);

    if (!dayData) return false;
    return day === selectedDate.getDate() &&
           dayData.month === selectedDate.getMonth() &&
           dayData.year === selectedDate.getFullYear();
  };

  const handleSelectDay = (day: number) => {
    const days = getWeekDays(currentDate);
    const dayData = days.find(d => d.day === day);

    if (dayData) {
      setSelectedDate(dayData.date);
    }
  };

  const getWeekRange = () => {
    const days = getWeekDays(currentDate);
    if (days.length < 7) return `${currentMonthName} ${currentYear}`;

    const firstDay = days[0];
    const lastDay = days[6];

    if (firstDay.month === lastDay.month) {
      const monthName = new Date(firstDay.year, firstDay.month).toLocaleString('ru-RU', { month: 'long' });
      return `${firstDay.day}-${lastDay.day} ${monthName} ${firstDay.year}`;
    } else {
      const firstMonth = new Date(firstDay.year, firstDay.month).toLocaleString('ru-RU', { month: 'long' });
      const lastMonth = new Date(lastDay.year, lastDay.month).toLocaleString('ru-RU', { month: 'long' });
      return `${firstDay.day} ${firstMonth} - ${lastDay.day} ${lastMonth} ${firstDay.year}`;
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
  try {
    console.log(`Changing task ${taskId} to status: ${newStatus}`);
    
    // Оптимистично обновляем локально
    const taskIndex = filteredTasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
      const updatedTasks = [...filteredTasks];
      updatedTasks[taskIndex] = {
        ...updatedTasks[taskIndex],
        status: newStatus,
      };
      setFilteredTasks(updatedTasks);
    }
    
    // Отправляем на сервер
    await updateTaskStatus(taskId, newStatus);
    
    // Обновляем список для синхронизации
    setTimeout(async () => {
      await loadTasks();
    }, 500);
    
  } catch (error) {
    console.error("Ошибка при изменении статуса:", error);
    // Восстанавливаем предыдущее состояние
    updateFilteredTasks();
    Alert.alert("Ошибка", "Не удалось изменить статус задачи");
    }
  };

const handleDeleteTask = async (taskId: string) => {
  Alert.alert(
    "Удаление задачи",
    "Вы уверены, что хотите удалить эту задачу?",
    [
      { 
        text: "Отмена", 
        style: "cancel" 
      },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          try {
            const success = await deleteTask(taskId); // Теперь эта функция будет доступна
            if (success) {
              Alert.alert("Успешно", "Задача удалена");
              // Автоматически обновим список задач
              await loadTasks();
            } else {
              Alert.alert("Ошибка", "Не удалось удалить задачу");
            }
          } catch (error) {
            console.error("Ошибка при удалении задачи:", error);
            Alert.alert("Ошибка", "Произошла ошибка при удалении задачи");
          }
        }
      }
    ]
  );
};
  const formatSelectedDate = () => {
    const day = selectedDate.getDate();
    const month = selectedDate.toLocaleString('ru-RU', { month: 'long' });
    return `${day} ${month}`;
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.penguinContainer}>
        <Image source={penguinImage} style={styles.penguinImage} resizeMode="contain" />
      </View>
      <View style={styles.messageContainer}>
        <Text style={styles.messageText}>
          Упс, пока задач нет, но вы можете их создать
        </Text>
      </View>
    </View>
  );

  // Функция для проверки и создания профиля
  const checkAndCreateProfile = async () => {
    try {
      const userData = await AsyncStorage.getItem('current_user');
      if (!userData) {
        // Если пользователя нет, создаем его
        const newUser = {
          id: Date.now().toString(),
          login: 'user_' + Math.floor(Math.random() * 10000),
          name: 'Татьяна',
          age: 35,
          coins: 5000,
          familyMembers: [],
          telegramAuth: true,
          createdAt: new Date().toISOString()
        };
        await AsyncStorage.setItem('current_user', JSON.stringify(newUser));
        await AsyncStorage.setItem('user_type', 'parent');
        await AsyncStorage.setItem('is_authenticated', 'true');
      }
    } catch (error) {
      console.log('Error creating profile:', error);
    }
  };

  const renderTaskItems = () => {
    if (!filteredTasks || filteredTasks.length === 0) {
      return renderEmptyState();
    }

    return (
      <View style={styles.tasksList}>
        {filteredTasks.map((task) => {
          if (!task) return null;
          
          return (
            <TaskItem
              key={task.id}
              id={task.id?.toString() || ""}
              title={task.title || "Без названия"}
              status={(task.status as TaskStatus) || "todo"}
              onPress={handleStatusChange}
              onDelete={handleDeleteTask}
            />
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Шапка с кнопкой назад и заголовком */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.replace("/welcome_screen")}
        >
          <Image source={backIcon} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.title}>Задачи</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Сегментированный контрол для фильтрации задач */}
      <View style={styles.segmentedWrapper}>
        <View style={styles.segmentedControl}>
          <TouchableOpacity
            style={[
              styles.segmentButton,
              selectedSegment === "all" && styles.activeSegment,
            ]}
            onPress={() => setSelectedSegment("all")}
          >
            <Text style={[
              styles.segmentText,
              selectedSegment === "all" && styles.activeSegmentText,
            ]}>
              Все задачи
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentButton,
              selectedSegment === "child" && styles.activeSegment,
            ]}
            onPress={() => setSelectedSegment("child")}
          >
            <Text style={[
              styles.segmentText,
              selectedSegment === "child" && styles.activeSegmentText,
            ]}>
              Для ребенка
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.segmentButton,
              selectedSegment === "self" && styles.activeSegment,
            ]}
            onPress={() => setSelectedSegment("self")}
          >
            <Text style={[
              styles.segmentText,
              selectedSegment === "self" && styles.activeSegmentText,
            ]}>
              Для себя
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Календарь с выбором недели и дней */}
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={goToPreviousWeek}>
            <Ionicons name="chevron-back" size={24} color="#000000" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{getWeekRange()}</Text>
          <TouchableOpacity onPress={goToNextWeek}>
            <Ionicons name="chevron-forward" size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekDaysRow}>
          {DAYS_OF_WEEK.map((day) => (
            <View key={day} style={styles.weekDayCell}>
              <Text style={styles.weekDayText}>{day}</Text>
            </View>
          ))}
        </View>

        <View style={styles.daysRow}>
          {weekDays.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dayCell,
                isToday(day) && styles.todayCell,
                isSelected(day) && styles.selectedDayCell,
              ]}
              onPress={() => handleSelectDay(day)}
            >
              <Text style={[
                styles.dayNumber,
                isToday(day) && !isSelected(day) && styles.todayNumber,
                isSelected(day) && styles.selectedDayNumber,
              ]}>
                {day}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Заголовок с датой и сортировкой */}
      <View style={styles.dateHeader}>
        <Text style={styles.dateTitle}>{formatSelectedDate()}</Text>

        <View style={styles.sortContainer}>
          <TouchableOpacity
            style={[styles.sortButton, sortBy === "new" && styles.sortButtonActive]}
            onPress={() => setSortBy("new")}
          >
            <Text style={[styles.sortText, sortBy === "new" && styles.sortTextActive]}>
              Сначала новые
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.sortButton, sortBy === "completed" && styles.sortButtonActive]}
            onPress={() => setSortBy("completed")}
          >
            <Text style={[styles.sortText, sortBy === "completed" && styles.sortTextActive]}>
              Сначала выполненные
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Список задач с возможностью обновления pull-to-refresh */}
      <ScrollView
        style={styles.tasksScrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#8D41C1"]}
            tintColor="#8D41C1"
          />
        }
      >
        {renderTaskItems()}
      </ScrollView>

      {/* Кнопка создания новой задачи */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={() => router.push("/create_task")}
      >
        <Text style={styles.createButtonText}>Создать задачу</Text>
      </TouchableOpacity>

      {/* Нижняя навигационная панель */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => {
            checkAndCreateProfile();
            router.replace('/parent_profile');
          }}
        >
          <Image source={homeIcon} style={styles.navIcon} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.navButton, styles.activeNavButton]}>
          <Image source={tasksIcon} style={[styles.navIcon, styles.activeNavIcon]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push("/test")}
        >
          <Image source={statIcon} style={styles.navIcon} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push("/create_task")}
        >
          <Image source={plusIcon} style={styles.navIcon} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    marginTop: 45,
    paddingHorizontal: 23,
    paddingBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  backIcon: {
    width: 30,
    height: 30,
    marginTop: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#000000",
  },
  headerSpacer: {
    width: 40,
    height: 40,
  },
  segmentedWrapper: {
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  segmentedControl: {
    width: 329,
    height: 36,
    flexDirection: "row",
    backgroundColor: "#F2F2F2",
    borderRadius: 20,
    padding: 4,
  },
  segmentButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
  },
  activeSegment: {
    backgroundColor: "#8D41C1",
  },
  segmentText: {
    fontSize: 12,
    color: "#666666",
  },
  activeSegmentText: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  calendarContainer: {
    backgroundColor: "#F2F2F2",
    borderRadius: 16,
    marginHorizontal: 23,
    marginBottom: 20,
    padding: 16,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 17,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    textAlign: "center",
  },
  weekDaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  weekDayCell: {
    width: (SCREEN_WIDTH - 80) / 7,
    alignItems: "center",
  },
  weekDayText: {
    fontSize: 14,
    color: "#666666",
    fontWeight: "500",
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayCell: {
    width: (SCREEN_WIDTH - 80) / 7,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  selectedDayCell: {
    backgroundColor: "#8D41C1",
  },
  todayCell: {
    backgroundColor: "rgba(141, 65, 193, 0.1)",
  },
  dayNumber: {
    fontSize: 16,
    color: "#000000",
  },
  todayNumber: {
    color: "#8D41C1",
    fontWeight: "bold",
  },
  selectedDayNumber: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  dateHeader: {
    paddingHorizontal: 23,
    marginBottom: 20,
  },
  dateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 12,
  },
  sortContainer: {
    flexDirection: "row",
    gap: 12,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#F2F2F2",
  },
  sortButtonActive: {
    backgroundColor: "#8D41C1",
  },
  sortText: {
    fontSize: 14,
    color: "#666666",
  },
  sortTextActive: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  tasksScrollView: {
    flex: 1,
    paddingHorizontal: 23,
    marginBottom: 100,
  },
  tasksList: {
    gap: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  penguinContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  penguinImage: {
    width: 400,
    height: 400,
  },
  messageContainer: {
    alignItems: "center",
    paddingHorizontal: 48,
  },
  messageText: {
    fontSize: 16,
    color: "#666666",
    textAlign: "center",
    lineHeight: 24,
  },
  createButton: {
    position: "absolute",
    bottom: 90,
    left: 24,
    right: 24,
    height: 52,
    backgroundColor: "#8D41C1",
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#8D41C1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  bottomNav: {
    width: SCREEN_WIDTH,
    height: 70,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    position: "absolute",
    bottom: 0,
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  navIcon: {
    width: 24,
    height: 24,
    tintColor: "#999999",
  },
  activeNavIcon: {
    tintColor: "#8D41C1",
  },
});