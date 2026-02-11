import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Dimensions, StatusBar, Image, Switch, ScrollView, Alert, Modal } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTasks } from "../hooks/tasksSafe";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

import penguinImage from "../assets/pingu-tasks.png";
import coinIcon from "../assets/coin.png";

export default function CreateTaskForChildScreen(): JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addTask } = useTasks();

  // Получаем имя ребенка из параметров
  const childName = params.childName as string;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [coins, setCoins] = useState("100");
  const [isRepeating, setIsRepeating] = useState(false);

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const handleCreateTask = async () => {
    if (!title.trim() || !description.trim()) {
      Alert.alert("Ошибка", "Пожалуйста, заполните название и описание задачи");
      return;
    }

    try {
      await addTask({
        title: title.trim(),
        description: description.trim(),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        coins: parseInt(coins) || 0,
        isRepeating,
        type: "child",
        childName: childName,
      });

      Alert.alert(
        "Успешно!",
        "Задача успешно создана",
        [
          {
            text: "OK",
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error("Ошибка при создании задачи:", error);
      Alert.alert("Ошибка", "Не удалось создать задачу");
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Верхняя панель с кнопкой назад и заголовком */}
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
        {/* Контейнер с полем ввода и пингвином на заднем плане */}
        <View style={styles.inputWithPenguinContainer}>
          {/* Пингвин на заднем плане */}
          <Image
            source={penguinImage}
            style={styles.penguinImage}
            resizeMode="contain"
          />

          {/* Поле ввода названия поверх пингвина */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Название</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Введите название задачи"
                placeholderTextColor="#BDBDBD"
              />
            </View>
          </View>
        </View>

        {/* Остальная форма создания задачи */}
        <View style={styles.formContainer}>
          {/* Описание задачи */}
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
                maxLength={255}
              />
              <Text style={styles.charCount}>{description.length}/255</Text>
            </View>
          </View>

          {/* Даты начала и окончания */}
          <View style={styles.dateRow}>
            <View style={styles.dateInputGroup}>
              <Text style={styles.inputLabel}>Старт задачи</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowStartPicker(true)}
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
              >
                <Ionicons name="calendar-outline" size={16} color="#BDBDBD" />
                <Text style={styles.dateText}>{formatDate(endDate)}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Количество монет */}
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
              />
              <Image
                source={coinIcon}
                style={styles.coinIconImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Переключатель повторения */}
          <View style={styles.repeatContainer}>
            <Switch
              value={isRepeating}
              onValueChange={setIsRepeating}
              trackColor={{ false: "#E5E5E5", true: "#8D41C1" }}
              thumbColor={isRepeating ? "#FFFFFF" : "#FFFFFF"}
            />
            <Text style={styles.repeatText}>Сделать задачу повторяющейся</Text>
          </View>
        </View>
      </ScrollView>

      {/* Кастомные DatePicker модалки */}
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

      {/* Кнопка создания задачи */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[
            styles.createButton,
            (!title.trim() || !description.trim()) && styles.createButtonDisabled
          ]}
          onPress={handleCreateTask}
          disabled={!title.trim() || !description.trim()}
        >
          <Text style={styles.createButtonText}>Создать задачу</Text>
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
    paddingTop: 50,
    paddingBottom: 50,
  },
  inputWithPenguinContainer: {
    position: "relative",
    marginBottom: -15,
    paddingHorizontal: 23,
    height: 200, // Высота контейнера для пингвина
  },
  // Стили для пингвина на заднем плане
  penguinImage: {
    position: "absolute",
    width: 250,
    height: 250,
    bottom: 20, // Пингвин выглядывает снизу
    right: -30, // Пингвин выглядывает справа
    opacity: 0.9, // Легкая прозрачность
    zIndex: 1, // Пингвин на заднем плане
  },
  formContainer: {
    paddingHorizontal: 23,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
    zIndex: 2, // Поле ввода поверх пингвина
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
    backgroundColor: "rgba(255, 255, 255,1)", // Полупрозрачный фон для лучшей читаемости
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
    backgroundColor: "#FFFFFF", // Непрозрачный фон для текстовой области
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
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#FFFFFF",
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
    zIndex: 3,
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
  // Стили для модального окна выбора даты
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