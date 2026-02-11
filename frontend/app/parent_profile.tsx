import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  StatusBar,
  Alert,
  TextInput,
  Modal,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';

import homeIcon from '../assets/home.png';
import tasksIcon from '../assets/calendar.png';
import statIcon from '../assets/tasks.png';
import plusIcon from '../assets/plus.png';
import familyIcon from '../assets/family-house.png';

import { authService } from '../services/auth';
import { profileService } from '../services/profile';
import { taskService } from '../services/tasks';
import { TaskItem } from '../components/task_item/task-item';

export default function ParentProfile() {
  const router = useRouter();
  
  const [userData, setUserData] = useState<any>(null);
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [todaysTasks, setTodaysTasks] = useState<any[]>([]);
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [tempName, setTempName] = useState('');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      
      // Проверяем авторизацию
      const isAuthenticated = await authService.isAuthenticated();
      if (!isAuthenticated) {
        Alert.alert(
          "Требуется авторизация",
          "Пожалуйста, войдите в систему",
          [
            {
              text: "Войти",
              onPress: () => router.replace("/login")
            }
          ]
        );
        return;
      }

      // Загружаем профиль
      const profile = await profileService.getProfile();
      if (profile) {
        setUserData(profile.user);
        setTempName(profile.user.first_name);
        
        // Загружаем членов семьи
        const family = await profileService.getFamily();
        setFamilyMembers(family);
        
        // Загружаем задачи на сегодня
        const today = new Date();
        const todayString = today.toISOString().split('T')[0];
        const tasks = await taskService.getTasks();
        
        const todayTasks = tasks.filter(task => {
          const taskDate = new Date(task.start_date).toISOString().split('T')[0];
          return taskDate === todayString && 
                (task.type === 'personal' || task.type === 'family');
        });
        
        setTodaysTasks(todayTasks);
      } else {
        // Пробуем получить пользователя из authService
        const user = await authService.getUser();
        if (user) {
          setUserData(user);
          setTempName(user.first_name);
        }
      }
    } catch (error) {
      console.error("❌ Ошибка загрузки профиля:", error);
      Alert.alert("Ошибка", "Не удалось загрузить данные профиля");
      
      // Если ошибка авторизации, выходим
      if (error.message?.includes("401") || error.message?.includes("авторизация")) {
        await authService.logout();
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    setRefreshing(true);
    await loadProfileData();
    setRefreshing(false);
  };

  const handleSaveProfile = async () => {
    try {
      const success = await profileService.updateProfile({
        first_name: tempName
      });
      
      if (success) {
        setUserData(prev => ({ ...prev, first_name: tempName }));
        setShowEditModal(false);
        Alert.alert("✅", "Профиль обновлен!");
        
        // Обновляем данные
        await loadProfileData();
      } else {
        Alert.alert("❌", "Не удалось обновить профиль");
      }
    } catch (error) {
      console.error("❌ Ошибка обновления профиля:", error);
      Alert.alert("Ошибка", "Не удалось обновить профиль");
    }
  };

  const pickImage = async () => {
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Нужно разрешение на доступ к фото');
          return;
        }
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        const success = await profileService.updateProfile({
          photo_url: result.assets[0].uri
        });
        
        if (success) {
          setUserData(prev => ({ 
            ...prev, 
            photo_url: result.assets[0].uri 
          }));
          setShowPhotoModal(false);
        }
      }
    } catch (error) {
      console.log('Error picking image:', error);
      Alert.alert('Ошибка', 'Не удалось выбрать фото');
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Нужно разрешение на использование камеры');
        return;
      }

      let result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        const success = await profileService.updateProfile({
          photo_url: result.assets[0].uri
        });
        
        if (success) {
          setUserData(prev => ({ 
            ...prev, 
            photo_url: result.assets[0].uri 
          }));
          setShowPhotoModal(false);
        }
      }
    } catch (error) {
      console.log('Error taking photo:', error);
      Alert.alert('Ошибка', 'Не удалось сделать фото');
    }
  };

  const deletePhoto = () => {
    Alert.alert(
      "Удалить фото",
      "Вы уверены, что хотите удалить фото профиля?",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          onPress: async () => {
            const success = await profileService.updateProfile({
              photo_url: null
            });
            
            if (success) {
              setUserData(prev => ({ 
                ...prev, 
                photo_url: null 
              }));
              Alert.alert("✅", "Фото удалено");
            }
          }
        }
      ]
    );
  };

  const handleCreateTask = () => {
    router.push('/create_task');
  };

  const handleFamilyButton = () => {
    router.push('/telegram_welcome_for_child');
  };

  const handleLogout = async () => {
    Alert.alert(
      "Выход",
      "Вы уверены, что хотите выйти из аккаунта?",
      [
        {
          text: "Отмена",
          style: "cancel"
        },
        {
          text: "Выйти",
          style: "destructive",
          onPress: async () => {
            try {
              await authService.logout();
              console.log("✅ Успешный выход");
              router.replace('/telegram_welcome');
            } catch (error) {
              console.error("❌ Ошибка выхода:", error);
              Alert.alert("Ошибка", "Не удалось выйти из системы");
            }
          }
        }
      ]
    );
  };

  // Функция для изменения статуса задачи
  const handleStatusChange = async (taskId: string, currentStatus: any) => {
    try {
      let newStatus: any;

      switch (currentStatus) {
        case 'pending':
          newStatus = 'in_progress';
          break;
        case 'in_progress':
          newStatus = 'completed';
          break;
        case 'completed':
          newStatus = 'pending';
          break;
        default:
          newStatus = 'pending';
      }

      const id = parseInt(taskId);
      if (isNaN(id)) {
        throw new Error("Неверный ID задачи");
      }

      const success = await taskService.updateTask(id, { status: newStatus });
      
      if (success) {
        // Обновляем локальное состояние
        setTodaysTasks(prev => prev.map(task => 
          task.id === id ? { ...task, status: newStatus } : task
        ));
        
        // Показываем уведомление для завершенных задач
        if (newStatus === 'completed') {
          const task = todaysTasks.find(t => t.id === id);
          if (task && task.coins > 0) {
            Alert.alert(
              "🎉 Задача выполнена!",
              `Начислено ${task.coins} монет`
            );
          }
        }
      }
    } catch (error: any) {
      console.error("❌ Ошибка изменения статуса:", error);
      Alert.alert("Ошибка", error.message || "Не удалось изменить статус");
    }
  };

  // Функция для удаления задачи
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
              const id = parseInt(taskId);
              if (isNaN(id)) {
                throw new Error("Неверный ID задачи");
              }
              
              const success = await taskService.deleteTask(id);
              
              if (success) {
                // Удаляем задачу из списка
                setTodaysTasks(prev => prev.filter(task => task.id !== id));
                Alert.alert("✅", "Задача удалена");
              } else {
                Alert.alert("❌", "Не удалось удалить задачу");
              }
            } catch (error: any) {
              console.error("❌ Ошибка удаления задачи:", error);
              Alert.alert("Ошибка", error.message || "Не удалось удалить задачу");
            }
          }
        }
      ]
    );
  };

  // Форматируем дату для отображения
  const formatDate = (date: Date) => {
    const day = date.getDate();
    const month = date.toLocaleString('ru-RU', { month: 'long' });
    return `${day} ${month}`;
  };

  // Подсчитываем общие монеты
  const calculateTotalCoins = () => {
    let total = userData?.coins || 0;
    if (familyMembers.length > 0) {
      total += familyMembers.reduce((sum, member) => sum + (member.coins || 0), 0);
    }
    return total;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Ionicons name="refresh-circle" size={40} color="#8D41C1" />
          <Text style={styles.loadingText}>Загрузка профиля...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!userData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authContainer}>
          <Text style={styles.authTitle}>Не авторизован</Text>
          <Text style={styles.authText}>
            Пожалуйста, войдите в систему для просмотра профиля
          </Text>
          <TouchableOpacity
            style={styles.authButton}
            onPress={() => router.replace("/login")}
          >
            <Text style={styles.authButtonText}>Войти</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.profileHeader}>
        <View style={styles.profileInfo}>
          <Text style={styles.profileTitle}>Профиль</Text>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshProfile}
            colors={["#8D41C1"]}
            tintColor="#8D41C1"
          />
        }
      >
        {/* Аватар */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={() => setShowPhotoModal(true)}
          >
            {userData.photo_url ? (
              <Image
                source={{ uri: userData.photo_url }}
                style={styles.avatarImage}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person-outline" size={60} color="#CCCCCC" />
              </View>
            )}
            {/* Кнопка редактирования профиля (карандаш) */}
            <TouchableOpacity
              style={styles.editIconButton}
              onPress={() => setShowEditModal(true)}
            >
              <Ionicons name="pencil" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </TouchableOpacity>

          {/* Имя и возраст под фото */}
          <View style={styles.userInfoSection}>
            {userData.first_name ? (
              <Text style={styles.userName}>{userData.first_name}</Text>
            ) : null}
            
            {/* Монеты */}
            <View style={styles.coinsContainer}>
              <Ionicons name="logo-bitcoin" size={20} color="#FFD700" />
              <Text style={styles.coinsText}>{userData.coins || 0} монет</Text>
            </View>
          </View>

          {userData.photo_url && (
            <TouchableOpacity
              style={styles.deletePhotoButton}
              onPress={deletePhoto}
            >
              <Ionicons name="trash-outline" size={16} color="#FF6B6B" />
              <Text style={styles.deletePhotoText}>Удалить фото</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Кнопка Семья */}
        <View style={styles.familySection}>
          <TouchableOpacity
            style={styles.familyButton}
            onPress={handleFamilyButton}
          >
            <View style={styles.familyButtonContent}>
              <Image source={familyIcon} style={styles.familyIcon} />
              <Text style={styles.familyButtonText}>Семья</Text>
              <Text style={styles.familySubText}>
                {familyMembers.length} {familyMembers.length === 1 ? 'ребенок' : 
                familyMembers.length === 0 ? 'детей' : 'ребенка'}
              </Text>
            </View>
          </TouchableOpacity>
          
          {/* Общие монеты семьи */}
          {familyMembers.length > 0 && (
            <View style={styles.familyCoins}>
              <Text style={styles.familyCoinsText}>
                Всего монет в семье: {calculateTotalCoins()}
              </Text>
            </View>
          )}
        </View>

        {/* Задачи на сегодня */}
        <View style={styles.section}>
          <View style={styles.tasksHeader}>
            <Text style={styles.sectionTitle}>Сделать сегодня</Text>
            <Text style={styles.dateTitle}>{formatDate(new Date())}</Text>
          </View>

          {todaysTasks.length > 0 ? (
            <View style={styles.tasksList}>
              {todaysTasks.map((task) => (
                <TaskItem
                  key={task.id.toString()}
                  id={task.id.toString()}
                  title={task.title}
                  status={task.status}
                  onPress={handleStatusChange}
                  onDelete={handleDeleteTask}
                />
              ))}
            </View>
          ) : (
            <View style={styles.tasksCard}>
              <Text style={styles.tasksText}>Упс, задач пока нет, но вы можете их создать</Text>
              <TouchableOpacity
                style={styles.createTaskButton}
                onPress={handleCreateTask}
              >
                <LinearGradient
                  colors={['#6D0FAD', '#B667C4']}
                  style={styles.createTaskGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.createTaskText}>Создать задачу</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Выход */}
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={styles.logoutButtonText}>Выйти из аккаунта</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Модальное окно редактирования профиля */}
      <Modal
        visible={showEditModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.editModalOverlay}>
            <TouchableOpacity
              style={styles.editModalBackground}
              activeOpacity={1}
              onPress={() => setShowEditModal(false)}
            />
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.editModalContentWrapper}
            >
              <View style={styles.editModalContent}>
                <Text style={styles.editModalTitle}>Редактировать данные</Text>
                <Text style={styles.editModalSubtitle}>
                  Пожалуйста, введите ваше имя, если хотите его поменять.
                </Text>

                <View style={styles.editField}>
                  <Text style={styles.editLabel}>Имя</Text>
                  <TextInput
                    style={styles.editInput}
                    value={tempName}
                    onChangeText={setTempName}
                    placeholder="Введите ваше имя"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.editModalButtons}>
                  <TouchableOpacity
                    style={styles.saveButtonContainer}
                    onPress={handleSaveProfile}
                  >
                    <LinearGradient
                      colors={['#6D0FAD', '#B667C4']}
                      style={styles.saveButtonGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={styles.saveButtonText}>Сохранить</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Модальное окно выбора фото */}
      <Modal
        visible={showPhotoModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Выберите фото</Text>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={pickImage}
            >
              <Ionicons name="image-outline" size={24} color="#8D41C1" />
              <Text style={styles.modalOptionText}>Выбрать из галереи</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={takePhoto}
            >
              <Ionicons name="camera-outline" size={24} color="#8D41C1" />
              <Text style={styles.modalOptionText}>Сделать фото</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelModalButton}
              onPress={() => setShowPhotoModal(false)}
            >
              <Text style={styles.cancelModalText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Нижняя навигация */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={[styles.navButton, styles.activeNavButton]}
          onPress={() => router.replace('/parent_profile')}
        >
          <Image source={homeIcon} style={[styles.navIcon, styles.activeNavIcon]} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.replace('/tasks')}
        >
          <Image source={tasksIcon} style={styles.navIcon} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.push("/telegram_welcome_for_child")}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#8D41C1',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 10,
  },
  authText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  authButton: {
    backgroundColor: '#8D41C1',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  profileInfo: {
    flex: 1,
  },
  profileTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatarImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#BDBDBD',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#BDBDBD',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  userInfoSection: {
    alignItems: 'center',
    marginBottom: 10,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#373635',
    marginBottom: 10,
  },
  coinsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9C4',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  coinsText: {
    fontSize: 16,
    color: '#F57C00',
    fontWeight: '600',
    marginLeft: 8,
  },
  deletePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  deletePhotoText: {
    fontSize: 14,
    color: '#FF6B6B',
    marginLeft: 6,
  },
  familySection: {
    marginBottom: 24,
    alignItems: 'center',
  },
  familyButton: {
    backgroundColor: '#F2F2F2',
    borderRadius: 23,
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  familyButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyIcon: {
    width: 45,
    height: 45,
    marginBottom: 8,
  },
  familyButtonText: {
    fontSize: 18,
    color: '#373635',
    fontWeight: '600',
    marginBottom: 4,
  },
  familySubText: {
    fontSize: 14,
    color: '#666',
  },
  familyCoins: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  familyCoinsText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '500',
  },
  section: {
    marginBottom: 24,
  },
  tasksHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#373635',
  },
  dateTitle: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  tasksList: {
    gap: 12,
  },
  tasksCard: {
    padding: 0,
    alignItems: 'center',
  },
  tasksText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  createTaskButton: {
    width: '100%',
    borderRadius: 25,
    overflow: 'hidden',
  },
  createTaskGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
  },
  createTaskText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 30,
    marginBottom: 100,
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12,
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  logoutButtonText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '600',
    marginLeft: 10,
  },

  // Стили для модального окна редактирования
  editModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  editModalBackground: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  editModalContentWrapper: {
    maxHeight: '85%',
  },
  editModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 25,
    paddingBottom: 40,
    minHeight: 350,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  editModalTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: '#373635',
    marginBottom: 8,
    textAlign: 'center',
  },
  editModalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  editField: {
    marginBottom: 25,
  },
  editLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#373635',
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 25,
    padding: 16,
    fontSize: 16,
    color: '#373635',
    height: 52,
  },
  editModalButtons: {
    marginTop: 20,
  },
  saveButtonContainer: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    borderRadius: 25,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },

  // Стили для модального окна выбора фото
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#373635',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#373635',
    marginLeft: 15,
  },
  cancelModalButton: {
    marginTop: 20,
    paddingVertical: 15,
    alignItems: 'center',
  },
  cancelModalText: {
    fontSize: 16,
    color: '#8D41C1',
    fontWeight: '500',
  },

  // Нижняя навигация
  bottomNav: {
    width: '100%',
    height: 70,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
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
    backgroundColor: 'rgba(141, 65, 193, 0.1)',
    borderRadius: 20,
  },
  activeNavIcon: {
    tintColor: '#8D41C1',
  },
});