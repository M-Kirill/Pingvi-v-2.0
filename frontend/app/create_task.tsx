import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  StatusBar,
  Image,
  Switch,
  ScrollView,
  Alert,
  SafeAreaView,
  Modal,
  ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTasks } from "../hooks/tasksSafe";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

import coinIcon from "../assets/coin.png";
import childIcon from "../assets/person.png";

interface Child {
  id: number;
  name: string;
  first_name: string;
  child_name: string;
  login: string;
  age?: number;
  coins?: number;
  role?: string;
  relationship?: string;
  created_at?: string;
}

export default function CreateTaskScreen(): JSX.Element {
  const router = useRouter();
  const { addTask } = useTasks();

  const [taskType, setTaskType] = useState<"child" | "self">("child");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [coins, setCoins] = useState("100");
  const [isRepeating, setIsRepeating] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingChildren, setIsLoadingChildren] = useState(true);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [apiUrl, setApiUrl] = useState('');

  useEffect(() => {
    loadApiUrl();
    loadChildren();
  }, []);

  useEffect(() => {
    if (taskType === "self") {
      setSelectedChild(null);
    } else if (taskType === "child" && children.length > 0 && !selectedChild) {
      setSelectedChild(children[0]);
    }
  }, [taskType, children]);

  const loadApiUrl = async () => {
    const url = await AsyncStorage.getItem('api_url');
    if (url) {
      setApiUrl(url);
      console.log("📡 API URL загружен:", url);
    } else {
      setApiUrl('http://192.168.0.30:8081');
    }
  };

  const loadChildren = async () => {
    try {
      setIsLoadingChildren(true);
      const token = await AsyncStorage.getItem('auth_token');
      const baseUrl = await AsyncStorage.getItem('api_url') || 'http://192.168.0.30:8081';
      
      if (!token) {
        console.log("❌ Нет токена авторизации");
        setChildren([]);
        setIsLoadingChildren(false);
        return;
      }

      console.log("👶 Загружаем детей...");
      
      const response = await fetch(`${baseUrl}/api/users/children`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log("📥 Статус ответа детей:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("✅ Получены дети:", data);
        
        if (data.success && data.children) {
          const formattedChildren: Child[] = data.children.map((child: any) => ({
            id: child.id,
            name: child.child_name || child.first_name,
            first_name: child.first_name,
            child_name: child.child_name,
            login: child.login,
            age: child.age,
            coins: child.coins,
            role: child.role,
            relationship: child.relationship,
            created_at: child.created_at
          }));
          
          setChildren(formattedChildren);
          
          if (formattedChildren.length > 0) {
            setSelectedChild(formattedChildren[0]);
          }
        }
      } else if (response.status === 401) {
        console.log("❌ Токен невалиден");
      }
    } catch (error) {
      console.error("❌ Ошибка загрузки детей:", error);
    } finally {
      setIsLoadingChildren(false);
    }
  };

  const handleCreateTask = async () => {
    console.log("=== Начало создания задачи ===");
    
    if (!title.trim() || !description.trim()) {
      Alert.alert("Ошибка", "Заполните название и описание задачи");
      return;
    }

    if (taskType === "child" && !selectedChild?.id) {
      Alert.alert("Ошибка", "Выберите ребенка");
      return;
    }

    try {
      setIsLoading(true);
      
      const token = await AsyncStorage.getItem('auth_token');
      const baseUrl = await AsyncStorage.getItem('api_url') || 'http://192.168.0.30:8081';
      
      if (!token) {
        throw new Error("Требуется авторизация");
      }

      const formatDateForAPI = (date: Date) => {
        return date.toISOString().split('T')[0];
      };

      // ВАЖНО: тип задачи для бэкенда - 'personal' (не 'self')
      const taskData: any = {
        title: title.trim(),
        description: description.trim(),
        type: taskType === "child" ? "child" : "personal",
        coins: parseInt(coins) || 0,
        start_date: formatDateForAPI(startDate),
        end_date: formatDateForAPI(endDate),
        is_repeating: isRepeating,
      };

      if (taskType === "child" && selectedChild?.id) {
        taskData.child_id = selectedChild.id;
        console.log("👶 Child ID:", selectedChild.id);
      }

      console.log("📤 Отправка данных:", JSON.stringify(taskData, null, 2));
      console.log("📡 URL:", `${baseUrl}/api/tasks`);

      const response = await fetch(`${baseUrl}/api/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      });

      const responseText = await response.text();
      console.log("📥 Статус:", response.status);
      console.log("📥 Ответ:", responseText);

      if (response.ok) {
        const result = JSON.parse(responseText);
        console.log("✅ Задача создана:", result);
        
        Alert.alert(
          "✅ Успешно!",
          "Задача создана",
          [{ text: "OK", onPress: () => router.back() }]
        );
      } else {
        let errorMessage = "Ошибка создания задачи";
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch (e) {}
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error("❌ Ошибка:", error);
      Alert.alert("❌ Ошибка", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getChildDisplayName = (child: Child) => {
    return child.child_name || child.first_name || child.name || "Ребенок";
  };

  const SimpleDatePicker = ({
    visible,
    date,
    onClose,
    onConfirm,
    type
  }: {
    visible: boolean;
    date: Date;
    onClose: () => void;
    onConfirm: (newDate: Date) => void;
    type: 'start' | 'end';
  }) => {
    const [tempDate, setTempDate] = useState(date);

    const changeDay = (increment: number) => {
      const newDate = new Date(tempDate);
      newDate.setDate(newDate.getDate() + increment);
      setTempDate(newDate);
    };

    const changeMonth = (increment: number) => {
      const newDate = new Date(tempDate);
      newDate.setMonth(newDate.getMonth() + increment);
      setTempDate(newDate);
    };

    const handleConfirm = () => {
      onConfirm(tempDate);
      onClose();
    };

    if (!visible) return null;

    return (
      <Modal
        visible={visible}
        transparent={true}
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              Выберите {type === 'start' ? 'начальную' : 'конечную'} дату
            </Text>

            <View style={styles.dateDisplay}>
              <Text style={styles.selectedDateText}>
                {formatDate(tempDate)}
              </Text>
            </View>

            <View style={styles.dateControls}>
              <View style={styles.dateControlGroup}>
                <Text style={styles.dateControlLabel}>День:</Text>
                <View style={styles.dateControlButtons}>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => changeDay(-1)}
                  >
                    <Text style={styles.dateButtonText}>-1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => changeDay(1)}
                  >
                    <Text style={styles.dateButtonText}>+1</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.dateControlGroup}>
                <Text style={styles.dateControlLabel}>Месяц:</Text>
                <View style={styles.dateControlButtons}>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => changeMonth(-1)}
                  >
                    <Text style={styles.dateButtonText}>-1</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.dateButton}
                    onPress={() => changeMonth(1)}
                  >
                    <Text style={styles.dateButtonText}>+1</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={onClose}
              >
                <Text style={styles.cancelButtonText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirm}
              >
                <Text style={styles.confirmButtonText}>Готово</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderChildSelection = () => {
    if (isLoadingChildren) {
      return (
        <View style={styles.childrenContainer}>
          <ActivityIndicator size="small" color="#8D41C1" />
          <Text style={styles.loadingChildrenText}>Загрузка детей...</Text>
        </View>
      );
    }

    return (
      <View style={styles.childSelectionContainer}>
        <Text style={styles.childSelectionTitle}>Выберите ребенка:</Text>
        
        {children.length > 0 ? (
          <>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.childrenScrollView}
            >
              {children.map((child) => (
                <TouchableOpacity
                  key={child.id}
                  style={[
                    styles.childItem,
                    selectedChild?.id === child.id && styles.selectedChildItem,
                  ]}
                  onPress={() => setSelectedChild(child)}
                >
                  <View style={styles.childAvatarContainer}>
                    <Image
                      source={childIcon}
                      style={styles.childAvatar}
                    />
                    {selectedChild?.id === child.id && (
                      <View style={styles.selectedIndicator}>
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                  <Text style={styles.childName} numberOfLines={1}>
                    {getChildDisplayName(child)}
                  </Text>
                  {child.age && (
                    <Text style={styles.childAge}>{child.age} лет</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <View style={styles.childInfoContainer}>
              {selectedChild && (
                <View style={styles.selectedChildInfo}>
                  <Text style={styles.selectedChildName}>
                    Выбран: {getChildDisplayName(selectedChild)}
                  </Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={styles.noChildrenContainer}>
            <View style={styles.noChildrenIcon}>
              <Ionicons name="person-outline" size={48} color="#BDBDBD" />
            </View>
            <Text style={styles.noChildrenText}>
              У вас пока нет добавленных детей
            </Text>
            <Text style={styles.noChildrenSubText}>
              Добавьте ребенка через Telegram бота
            </Text>
            <TouchableOpacity
              style={styles.addChildButton}
              onPress={() => router.push("/telegram_welcome_for_child")}
            >
              <Ionicons name="logo-telegram" size={20} color="#FFFFFF" />
              <Text style={styles.addChildButtonText}>Добавить ребенка</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#373635" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Новая задача</Text>
        <View style={styles.settingsButtonPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.segmentedWrapper}>
          <View style={styles.segmentedControl}>
            <TouchableOpacity
              style={[
                styles.segmentButton,
                taskType === "child" && styles.activeSegment,
              ]}
              onPress={() => setTaskType("child")}
            >
              <Text style={[
                styles.segmentText,
                taskType === "child" && styles.activeSegmentText,
              ]}>
                Для ребенка
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentButton,
                taskType === "self" && styles.activeSegment,
              ]}
              onPress={() => setTaskType("self")}
            >
              <Text style={[
                styles.segmentText,
                taskType === "self" && styles.activeSegmentText,
              ]}>
                Задачи для себя
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {taskType === "child" && renderChildSelection()}

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Название</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Введите название задачи"
                placeholderTextColor="#BDBDBD"
                editable={!isLoading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Описание</Text>
            <View style={[styles.inputWrapper, styles.textAreaWrapper]}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Немного деталей"
                placeholderTextColor="#BDBDBD"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!isLoading}
                maxLength={200}
              />
              <Text style={styles.charCount}>{description.length}/200</Text>
            </View>
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateInputGroup}>
              <Text style={styles.inputLabel}>Старт задачи</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowStartPicker(true)}
                disabled={isLoading}
              >
                <Ionicons name="calendar-outline" size={16} color="#BDBDBD" />
                <Text style={styles.dateText}>{formatDate(startDate)}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dateInputGroup}>
              <Text style={styles.inputLabel}>Окончание задачи</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowEndPicker(true)}
                disabled={isLoading}
              >
                <Ionicons name="calendar-outline" size={16} color="#BDBDBD" />
                <Text style={styles.dateText}>{formatDate(endDate)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Сколько монет начислить</Text>
            <View style={styles.coinInputWrapper}>
              <TextInput
                style={styles.coinInput}
                value={coins}
                onChangeText={setCoins}
                placeholder="100"
                placeholderTextColor="#BDBDBD"
                keyboardType="numeric"
                editable={!isLoading}
              />
              <Image
                source={coinIcon}
                style={styles.coinIconImage}
                resizeMode="contain"
              />
            </View>
          </View>

          <View style={styles.repeatContainer}>
            <Switch
              value={isRepeating}
              onValueChange={setIsRepeating}
              trackColor={{ false: "#E5E5E5", true: "#8D41C1" }}
              thumbColor={isRepeating ? "#FFFFFF" : "#FFFFFF"}
              disabled={isLoading}
            />
            <Text style={styles.repeatText}>Сделать задачу повторяющейся</Text>
          </View>
        </View>
      </ScrollView>

      <SimpleDatePicker
        visible={showStartPicker}
        date={startDate}
        onClose={() => setShowStartPicker(false)}
        onConfirm={(newDate) => setStartDate(newDate)}
        type="start"
      />

      <SimpleDatePicker
        visible={showEndPicker}
        date={endDate}
        onClose={() => setShowEndPicker(false)}
        onConfirm={(newDate) => setEndDate(newDate)}
        type="end"
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.createButton,
            (!title.trim() || !description.trim() || isLoading) && styles.createButtonDisabled
          ]}
          onPress={handleCreateTask}
          disabled={!title.trim() || !description.trim() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.createButtonText}>Создать задачу</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#373635",
    textAlign: "center",
  },
  settingsButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingBottom: 120,
  },
  segmentedWrapper: {
    width: "100%",
    alignItems: "center",
    marginBottom: 20,
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
    fontSize: 14,
    color: "#666666",
    fontWeight: "400",
  },
  activeSegmentText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  childrenContainer: {
    alignItems: "center",
    padding: 20,
  },
  childSelectionContainer: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  childSelectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#373635",
    marginBottom: 16,
  },
  childrenScrollView: {
    flexGrow: 0,
    marginBottom: 16,
  },
  childItem: {
    alignItems: "center",
    padding: 12,
    marginRight: 12,
    minWidth: 80,
    borderRadius: 12,
    backgroundColor: "#F9F9F9",
  },
  selectedChildItem: {
    backgroundColor: "rgba(141, 65, 193, 0.1)",
    borderWidth: 1,
    borderColor: "#8D41C1",
  },
  childAvatarContainer: {
    position: "relative",
    marginBottom: 8,
  },
  childAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  selectedIndicator: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#8D41C1",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  childName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#373635",
    textAlign: "center",
    marginBottom: 4,
  },
  childAge: {
    fontSize: 12,
    color: "#666666",
    textAlign: "center",
  },
  childInfoContainer: {
    marginTop: 8,
  },
  selectedChildInfo: {
    backgroundColor: "rgba(141, 65, 193, 0.05)",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(141, 65, 193, 0.2)",
  },
  selectedChildName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8D41C1",
    marginBottom: 4,
  },
  noChildrenContainer: {
    alignItems: "center",
    padding: 32,
    backgroundColor: "#F9F9F9",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderStyle: "dashed",
  },
  noChildrenIcon: {
    marginBottom: 16,
  },
  noChildrenText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#373635",
    textAlign: "center",
    marginBottom: 8,
  },
  noChildrenSubText: {
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
    marginBottom: 20,
  },
  addChildButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#8D41C1",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  addChildButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  loadingChildrenText: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
  },
  formContainer: {
    paddingHorizontal: 23,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#373635",
  },
  inputWrapper: {
    height: 46,
    borderWidth: 1,
    borderColor: "#BDBDBD",
    borderRadius: 23,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  input: {
    fontSize: 16,
    color: "#000000",
    padding: 0,
  },
  textAreaWrapper: {
    height: 120,
    paddingTop: 12,
    paddingBottom: 12,
  },
  textArea: {
    height: 90,
    textAlignVertical: "top",
  },
  charCount: {
    position: "absolute",
    bottom: 12,
    right: 16,
    fontSize: 12,
    color: "#BDBDBD",
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  dateInputGroup: {
    flex: 1,
    gap: 8,
  },
  dateInput: {
    flexDirection: "row",
    alignItems: "center",
    height: 46,
    borderWidth: 1,
    borderColor: "#BDBDBD",
    borderRadius: 23,
    paddingHorizontal: 16,
    gap: 12,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
  },
  coinInputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 46,
    borderWidth: 1,
    borderColor: "#BDBDBD",
    borderRadius: 23,
    paddingHorizontal: 16,
  },
  coinInput: {
    flex: 1,
    fontSize: 16,
    color: "#000000",
    padding: 0,
  },
  coinIconImage: {
    width: 24,
    height: 24,
  },
  repeatContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
  },
  repeatText: {
    fontSize: 14,
    color: "#666666",
    flex: 1,
  },
  buttonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 23,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    zIndex: 1,
  },
  createButton: {
    height: 52,
    backgroundColor: "#8D41C1",
    borderRadius: 26,
    justifyContent: "center",
    alignItems: "center",
  },
  createButtonDisabled: {
    backgroundColor: "#BDBDBD",
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    width: "80%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    textAlign: "center",
    marginBottom: 20,
  },
  dateDisplay: {
    alignItems: "center",
    marginVertical: 20,
  },
  selectedDateText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#8D41C1",
  },
  dateControls: {
    gap: 20,
    marginBottom: 30,
  },
  dateControlGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateControlLabel: {
    fontSize: 16,
    color: "#000000",
    fontWeight: "500",
  },
  dateControlButtons: {
    flexDirection: "row",
    gap: 10,
  },
  dateButton: {
    width: 50,
    height: 40,
    backgroundColor: "#F2F2F2",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F2F2F2",
  },
  cancelButtonText: {
    fontSize: 16,
    color: "#666666",
    fontWeight: "500",
  },
  confirmButton: {
    backgroundColor: "#8D41C1",
  },
  confirmButtonText: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "600",
  },
});