import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from "expo-router";

import homeIcon from '../assets/home.png';
import tasksIcon from '../assets/calendar.png';
import statIcon from '../assets/tasks.png';
import plusIcon from '../assets/plus.png';
import familyIcon from '../assets/family-house.png';
import user1 from "../assets/person.png";
import user2 from "../assets/person.png";
import user3 from "../assets/person.png";
import coinIcon from '../assets/coin.png';

// Импортируем Svg компоненты с переименованием градиента
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// Типы данных для ребенка
type Child = {
  id: string;
  name: string;
  avatar: any;
};

// Типы данных для статистики
type StatItem = {
  id: string;
  value: string | number;
  label: string;
};

// =============================================
// ИСПРАВЛЕННАЯ КРУГОВАЯ ДИАГРАММА - РАБОЧАЯ ВЕРСИЯ!
// =============================================
const CustomProgressCircle = ({
  completed = 0,
  total = 10,
  size = 160,
  strokeWidth = 10,
}: {
  completed: number;
  total: number;
  size?: number;
  strokeWidth?: number;
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  // Вычисляем процент выполнения
  const progress = total > 0 ? Math.min(Math.round((completed / total) * 100), 100) : 0;

  useEffect(() => {
    // Анимируем прогресс при изменении
    Animated.timing(animatedValue, {
      toValue: progress,
      duration: 1500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, [progress]);

  // Размеры
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  // Размер внутреннего круга - БЛИЖЕ К ПОЛОСКЕ (85% вместо 70%)
  const innerCircleSize = radius * 1.7; // Увеличили размер
  const innerCircleRadius = innerCircleSize / 2;

  // Интерполяция для strokeDashoffset
  const strokeDashoffset = animatedValue.interpolate({
    inputRange: [0, 100],
    outputRange: [circumference, 0],
  });

  return (
    <View style={[styles.circleContainer, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Фоновый круг (серый) */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#F0E6F5"
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Прогресс (фиолетовый) - повернут на -90 градусов для старта с верхней точки */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke="#8D41C1"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90, ${center}, ${center})`}
        />
      </Svg>

      {/* Внутренний круг с текстом - БЛИЖЕ К ПОЛОСКЕ */}
      <View
        style={[
          styles.innerCircle,
          {
            width: innerCircleSize,
            height: innerCircleSize,
            borderRadius: innerCircleRadius,
            backgroundColor: '#8D41C1',
          }
        ]}
      >
        <Text style={styles.progressValue}>
          {completed}/{total}
        </Text>
        <Text style={styles.progressLabel}>Выполнено</Text>
      </View>
    </View>
  );
};

// Функция для форматирования монет
const formatCoins = (coins: number): string => {
  if (coins >= 1000000) {
    return `${(coins / 1000000).toFixed(1)}M`;
  }
  if (coins >= 1000) {
    return `${(coins / 1000).toFixed(1)}K`;
  }
  return coins.toString();
};

// Функция для получения полного числа с пробелами
const getFullCoins = (coins: number): string => {
  return coins.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

// Временные тестовые данные детей
const initialChildren: Child[] = [
  { id: "1", name: "Вадим", avatar: user1 },
  { id: "2", name: "Анна", avatar: user2 },
  { id: "3", name: "Миша", avatar: user3 },
  { id: "4", name: "Катя", avatar: user1 },
  { id: "5", name: "Петя", avatar: user2 },
];

// Функция для получения задач ребенка (выполненные/все)
const getChildTasksStats = (childId: string) => {
  const tasksMap: { [key: string]: { completed: number; total: number } } = {
    "1": { completed: 12, total: 16 }, // 75% - показывает 12/16
    "2": { completed: 9, total: 15 },   // 60% - показывает 9/15
    "3": { completed: 18, total: 20 },  // 90% - показывает 18/20
    "4": { completed: 5, total: 11 },   // 45% - показывает 5/11
    "5": { completed: 3, total: 10 },   // 30% - показывает 3/10
  };
  return tasksMap[childId] || { completed: 0, total: 1 };
};

// Функция для получения статистики ребенка
const getChildStats = (childId: string): StatItem[] => {
  const tasksStats = getChildTasksStats(childId);
  const inProgress = tasksStats.total - tasksStats.completed;

  const statsMap: { [key: string]: StatItem[] } = {
    "1": [
      { id: "1", value: inProgress.toString(), label: "Задач в процессе" },
      { id: "2", value: "1", label: "Задач удалено" },
      { id: "3", value: "92%", label: "Дедлайнов соблюдено" },
      { id: "4", value: "20 мин", label: "Ср. время выполнения" },
    ],
    "2": [
      { id: "1", value: inProgress.toString(), label: "Задач в процессе" },
      { id: "2", value: "2", label: "Задач удалено" },
      { id: "3", value: "88%", label: "Дедлайнов соблюдено" },
      { id: "4", value: "15 мин", label: "Ср. время выполнения" },
    ],
    "3": [
      { id: "1", value: inProgress.toString(), label: "Задач в процессе" },
      { id: "2", value: "0", label: "Задач удалено" },
      { id: "3", value: "100%", label: "Дедлайнов соблюдено" },
      { id: "4", value: "10 мин", label: "Ср. время выполнения" },
    ],
    "4": [
      { id: "1", value: inProgress.toString(), label: "Задач в процессе" },
      { id: "2", value: "2", label: "Задач удалено" },
      { id: "3", value: "78%", label: "Дедлайнов соблюдено" },
      { id: "4", value: "25 мин", label: "Ср. время выполнения" },
    ],
    "5": [
      { id: "1", value: inProgress.toString(), label: "Задач в процессе" },
      { id: "2", value: "3", label: "Задач удалено" },
      { id: "3", value: "70%", label: "Дедлайнов соблюдено" },
      { id: "4", value: "35 мин", label: "Ср. время выполнения" },
    ],
  };

  return statsMap[childId] || statsMap["1"];
};

const getChildCoins = (childId: string): number => {
  const coinsMap: { [key: string]: number } = {
    "1": 12500,
    "2": 250,
    "3": 750,
    "4": 180,
    "5": 100,
  };
  return coinsMap[childId] || 0;
};

export default function ProgressScreen() {
  const router = useRouter();
  const [children] = useState<Child[]>(initialChildren);
  const [selectedChildId, setSelectedChildId] = useState(children[0]?.id || "1");

  // Получаем данные для выбранного ребенка
  const tasksStats = getChildTasksStats(selectedChildId);
  const selectedChildStats = getChildStats(selectedChildId);
  const selectedChildCoins = getChildCoins(selectedChildId);

  // Переключение на другого ребенка
  const switchChild = (childId: string) => {
    setSelectedChildId(childId);
  };

  // Показать точное количество монет
  const showExactCoins = () => {
    Alert.alert(
      "Всего монет",
      `У тебя ${getFullCoins(selectedChildCoins)} монет!\nПродолжай в том же духе!`,
      [{ text: "Супер!", style: "default" }]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Прогресс</Text>

        {/* Горизонтальная прокрутка детей */}
        <View style={styles.usersWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.usersScrollContent}
          >
            {children.map((child) => {
              const isActive = selectedChildId === child.id;
              return (
                <TouchableOpacity
                  key={child.id}
                  style={styles.userItem}
                  onPress={() => switchChild(child.id)}
                >
                  <View style={[styles.avatarWrapper, isActive && styles.avatarActive]}>
                    <Image source={child.avatar} style={styles.avatar} />
                  </View>
                  <Text style={[styles.userName, isActive && styles.userNameActive]}>
                    {child.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Блок с монетами */}
        <View style={styles.coinsContainer}>
          <Text style={styles.coinsLabel}>Всего накоплено</Text>
          <View style={styles.coinsRight}>
            <TouchableOpacity onPress={showExactCoins} activeOpacity={0.7}>
              <LinearGradient
                colors={['#6D0FAD', '#B667C4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.coinGradient}
              >
                <Text style={styles.coinsValue}>{formatCoins(selectedChildCoins)}</Text>
                <Image source={coinIcon} style={styles.coinIcon} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* КРУГОВАЯ ДИАГРАММА - показывает выполненные/все задачи */}
        <View style={styles.progressBlock}>
          <CustomProgressCircle
            completed={tasksStats.completed}  // Выполненные задачи
            total={tasksStats.total}          // Все задачи
            size={160}
            strokeWidth={10}
          />
        </View>

        {/* Stats grid - УМЕНЬШЕННЫЕ И СЕРЫЕ */}
        <View style={styles.statsGrid}>
          {selectedChildStats.map((item) => (
            <View key={item.id} style={styles.statCard}>
              <Text style={styles.statValue}>{item.value}</Text>
              <Text style={styles.statLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Rewards button */}
        <TouchableOpacity
          style={styles.rewardButton}
          onPress={() => router.push({
            pathname: "/rewards_screen",
            params: { childId: selectedChildId }
          })}
        >
          <Text style={styles.rewardsButtonText}>Награды</Text>
        </TouchableOpacity>

        {/* Дополнительный отступ для навигации */}
        <View style={{ height: 70 }} />
      </ScrollView>

      {/* Нижняя навигация - фиксированная снизу */}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navButton} onPress={() => router.replace('/parent_profile')}>
          <Image source={homeIcon} style={styles.navIcon} resizeMode="contain" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => router.replace('/tasks')}>
          <Image source={tasksIcon} style={styles.navIcon} resizeMode="contain" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.navButton, styles.activeNavButton]} onPress={() => router.push("/progress")}>
          <Image source={statIcon} style={[styles.navIcon, styles.activeNavIcon]} resizeMode="contain" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.navButton} onPress={() => router.push("/create_task")}>
          <Image source={plusIcon} style={styles.navIcon} resizeMode="contain" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 24,
  },
  usersWrapper: {
    marginTop: 5,
    marginBottom: 20,
    marginHorizontal: -16,
    paddingLeft: 50,
  },
  usersScrollContent: {
    paddingRight: 60,
    alignItems: "center",
  },
  userItem: {
    alignItems: "center",
    marginRight: 20,
    width: 56,
  },
  avatarWrapper: {
    padding: 2,
    borderRadius: 32,
  },
  avatarActive: {
    borderWidth: 2,
    borderColor: "#8D41C1",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 22,
  },
  userName: {
    marginTop: 4,
    fontSize: 12,
    color: "#666",
  },
  userNameActive: {
    color: "#8D41C1",
    fontWeight: "600",
  },
  coinsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginBottom: 20,
    width: '100%',
    alignSelf: "center",
  },
  coinsLabel: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "600",
  },
  coinsRight: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 100,
  },
  coinGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minWidth: 115,
    height: 35,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  coinsValue: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "left",
    backgroundColor: "transparent",
  },
  coinIcon: {
    width: 23,
    height: 23,
    tintColor: '#FFFFFF',
    marginLeft: 8,
  },
  progressBlock: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  circleContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8D41C1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  progressValue: {
    fontSize: 24, // Увеличили размер текста
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  progressLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#F2F2F2", // Изменили цвет на F2F2F2
    borderRadius: 12, // Уменьшили скругление
    padding: 14, // Уменьшили паддинг
    marginBottom: 12,
  },
  statValue: {
    fontSize: 20, // Уменьшили размер
    fontWeight: "600", // Сделали менее жирным
    color: "#333",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12, // Уменьшили размер
    color: "#666",
  },
  rewardButton: {
    backgroundColor: "#8D41C1",
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center",
    marginVertical: 10,
  },
  rewardsButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  bottomNav: {
    width: '100%',
    height: 70,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    position: 'absolute',
    bottom: 0,
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navIcon: {
    width: 24,
    height: 24,
    tintColor: '#999999',
  },
  activeNavButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
  },
  activeNavIcon: {
    tintColor: '#8D41C1',
  },
});