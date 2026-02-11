import React, { useState, useEffect, useCallback } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, StatusBar, ScrollView, RefreshControl } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTasks, TaskStatus } from "../hooks/tasksSafe";

import homeIcon from "../assets/home.png";
import tasksIcon from "../assets/calendar.png";
import statIcon from "../assets/tasks.png";
import plusIcon from "../assets/plus.png";
import penguinImage from "../assets/pingu-tasks.png";
import backIcon from "../assets/back.png";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DAYS_OF_WEEK = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export default function ChildTasksScreen(): JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { tasks, updateTaskStatus, getTasksByDateAndType, loadTasks } = useTasks();

  // Получаем имя ребенка из параметров навигации
  const childName = params.childName as string;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weekDays, setWeekDays] = useState<number[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<any[]>([]);
  const [sortBy, setSortBy] = useState<"new" | "completed">("new");
  const [refreshing, setRefreshing] = useState(false);

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

  // Функция для фильтрации задач
  const updateFilteredTasks = useCallback(() => {
    // Получаем все задачи для детей на выбранную дату
    let filtered = getTasksByDateAndType(selectedDate, 'child');

    // Фильтруем задачи по имени ребенка
    if (childName) {
      filtered = filtered.filter(task => task.childName === childName);
    }

    // Удаляем дубликаты по id
    const taskMap = new Map();
    filtered.forEach(task => {
      if (task.id && !taskMap.has(task.id)) {
        taskMap.set(task.id, task);
      }
    });

    let uniqueFiltered = Array.from(taskMap.values());

    // Сортируем задачи
    if (sortBy === "new") {
      uniqueFiltered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else {
      uniqueFiltered.sort((a, b) => {
        if (a.status === 'completed' && b.status !== 'completed') return -1;
        if (a.status !== 'completed' && b.status === 'completed') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    setFilteredTasks(uniqueFiltered);
  }, [getTasksByDateAndType, selectedDate, sortBy, childName]);

  useEffect(() => {
    const days = getWeekDays(currentDate);
    setWeekDays(days.map(d => d.day));
    updateFilteredTasks();
  }, [currentDate, getWeekDays, selectedDate, sortBy, tasks, childName, updateFilteredTasks]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadTasks();
    updateFilteredTasks();
    setRefreshing(false);
  }, [loadTasks, updateFilteredTasks]);

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
    if (days.length < 7) return "";

    const firstDay = days[0];
    const lastDay = days[6];
    const firstMonthName = new Date(firstDay.year, firstDay.month).toLocaleString('ru-RU', { month: 'long' });

    if (firstDay.month === lastDay.month) {
      return `${firstDay.day}-${lastDay.day} ${firstMonthName} ${firstDay.year}`;
    } else {
      const lastMonth = new Date(lastDay.year, lastDay.month).toLocaleString('ru-RU', { month: 'long' });
      return `${firstDay.day} ${firstMonthName} - ${lastDay.day} ${lastMonth} ${firstDay.year}`;
    }
  };

  const handleStatusChange = async (taskId: string, currentStatus: TaskStatus) => {
    let newStatus: TaskStatus;

    switch (currentStatus) {
      case 'todo':
        newStatus = 'in-progress';
        break;
      case 'in-progress':
        newStatus = 'completed';
        break;
      case 'completed':
        newStatus = 'todo';
        break;
      default:
        newStatus = 'todo';
    }

    await updateTaskStatus(taskId, newStatus);
    updateFilteredTasks(); // Обновляем список после изменения статуса
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
          {childName
            ? `У ${childName} пока нет задач на эту дату`
            : "Выберите ребенка для просмотра задач"}
        </Text>
      </View>
    </View>
  );

  // Функция для перехода к созданию задачи для ребенка
  const navigateToCreateTaskForChild = () => {
    router.push({
      pathname: "/create_task_for_child",
      params: { childName }
    });
  };

  // Функция для перехода назад
  const navigateBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/welcome_screen");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={navigateBack}
        >
          <Image source={backIcon} style={styles.backIcon} />
        </TouchableOpacity>
        <Text style={styles.title}>{childName || "Ребенок"}</Text>
        <View style={styles.headerSpacer} />
      </View>

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
          {DAYS_OF_WEEK.map((day, index) => (
            <View key={`day-${index}`} style={styles.weekDayCell}>
              <Text style={styles.weekDayText}>{day}</Text>
            </View>
          ))}
        </View>

        <View style={styles.daysRow}>
          {weekDays.map((day, index) => (
            <TouchableOpacity
              key={`date-${day}-${index}`}
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
        {filteredTasks.length > 0 ? (
          <View style={styles.tasksList}>
            {filteredTasks.map((task) => (
              <View key={`task-${task.id}`} style={styles.taskRow}>
                <View style={styles.taskInfo}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskDescription} numberOfLines={2}>
                    {task.description}
                  </Text>
                  <Text style={styles.taskCoins}>{task.coins} монет</Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    task.status === 'todo' && styles.statusTodo,
                    task.status === 'in-progress' && styles.statusInProgress,
                    task.status === 'completed' && styles.statusCompleted,
                  ]}
                  onPress={() => handleStatusChange(task.id, task.status)}
                >
                  <Text style={styles.statusText}>
                    {task.status === 'todo' && 'Сделать'}
                    {task.status === 'in-progress' && 'В процессе'}
                    {task.status === 'completed' && 'Выполнено'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : (
          renderEmptyState()
        )}
      </ScrollView>

      {/* Кнопка создания задачи - всегда активная */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={navigateToCreateTaskForChild}
      >
        <Text style={styles.createButtonText}>
          {childName ? `Создать задачу для ${childName}` : "Создать задачу"}
        </Text>
      </TouchableOpacity>

      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.replace("/welcome_screen")}
        >
          <Image source={homeIcon} style={styles.navIcon} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.navButton, styles.activeNavButton]}>
          <Image source={tasksIcon} style={[styles.navIcon, styles.activeNavIcon]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push("/statistics")}
        >
          <Image source={statIcon} style={styles.navIcon} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={navigateToCreateTaskForChild}
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
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
    height: 40,
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
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  taskInfo: {
    flex: 1,
    marginRight: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000000",
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 12,
    color: "#666666",
    marginBottom: 4,
  },
  taskCoins: {
    fontSize: 12,
    color: "#8D41C1",
    fontWeight: "500",
  },
  statusButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 100,
    alignItems: "center",
  },
  statusTodo: {
    backgroundColor: "#E5E5E5",
  },
  statusInProgress: {
    backgroundColor: "#FFE5CC",
  },
  statusCompleted: {
    backgroundColor: "#E5FFE5",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000000",
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
  activeNavButton: {},
});