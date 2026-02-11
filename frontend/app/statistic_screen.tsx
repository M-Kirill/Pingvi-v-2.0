import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
} from "react-native";

import { useRouter } from "expo-router";

import progressCircle from "../assets/progress.png";


import homeIcon from '../assets/home.png';
import tasksIcon from '../assets/calendar.png';
import statIcon from '../assets/tasks.png';
import plusIcon from '../assets/plus.png';
import familyIcon from '../assets/family-house.png';
import user1 from "../assets/person.png";


type StatItem = {
  id: string;
  value: string;
  label: string;
};

const stats: StatItem[] = [
  { id: "1", value: "4", label: "Задач в процессе" },
  { id: "2", value: "1", label: "Задач удалено" },
  { id: "3", value: "92%", label: "Дедлайнов соблюдено" },
  { id: "4", value: "20 мин", label: "Ср. время выполнения" },
];

const users = [
  { id: "1", name: "Вадим", avatar: user1 },
];

export default function StatisticsScreen() {
  const router = useRouter();
  const [selectedUser, setSelectedUser] = useState("1");

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
        <Text style={styles.title}>Статистика</Text>

      {/* Users selector */}
      <View style={styles.usersRow}>
        {users.map((u) => {
          const active = selectedUser === u.id;

          return (
            <TouchableOpacity
              key={u.id}
              style={styles.userItem}
              onPress={() => setSelectedUser(u.id)}
            >
              <View
                style={[
                  styles.avatarWrapper,
                  active && styles.avatarActive,
                ]}
              >
                <Image source={u.avatar} style={styles.avatar} />
              </View>

              <Text style={styles.userName}>{u.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Purple bar */}
      <View style={styles.totalBar}>
        <Text style={styles.totalBarText}>Всего накоплено</Text>

        <View style={styles.totalBarRight}>
          <Text style={styles.totalBarValue}>100</Text>
          <Text style={styles.coinEmoji}>Монет</Text>
        </View>
      </View>

      {/* Progress */}
      <View style={styles.progressBlock}>
        <Image source={progressCircle} style={styles.progressImage} />

        <View style={styles.progressCenter}>
          <Text style={styles.progressValue}> </Text>
          <Text style={styles.progressLabel}> </Text>
        </View>
      </View>
      

      {/* Stats grid */}
      <FlatList
        data={stats}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        contentContainerStyle={styles.statsList}
        renderItem={({ item }) => (
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{item.value}</Text>
            <Text style={styles.statLabel}>{item.label}</Text>
          </View>
        )}
      />
      
      
      {/* Rewards button */}
      <TouchableOpacity
        style={styles.rewardButton}
        onPress={() => router.push("/rewards_screen")}
      >
        <Text style={styles.rewardsButtonText}>Награды</Text>
      </TouchableOpacity>






      {/* Нижняя навигация */}
      <View style={styles.bottomNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.replace('/parent_profile')}
          >
          <Image source={homeIcon} style={styles.navIcon} />
        </TouchableOpacity>
        

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => router.replace('/tasks')}
            >
          <Image source={tasksIcon} style={styles.navIcon} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.navButton,styles.activeNavButton]} 
          onPress = {() => router.push("/statistic_screen")}
            >
          <Image source={statIcon} style={[styles.navIcon, styles.activeNavIcon]} />
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
    backgroundColor: "#fff",
    paddingHorizontal: 16,
  },

    title: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
    marginVertical: 12,
  },
  /* USERS */

  usersRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 10,
  },

  userItem: {
    alignItems: "center",
    marginHorizontal: 20,
  },

  avatarWrapper: {
    padding: 3,
    borderRadius: 40,
  },

  avatarActive: {
    borderWidth: 2,
    borderColor: "#8D41C1",
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },

  userName: {
    marginTop: 6,
    fontSize: 13,
  },

  /* PURPLE BAR */

  totalBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#8D41C1",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginBottom: 20,
    width: '85%',
    alignSelf: "center",
  },

  totalBarText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  totalBarRight: {
    flexDirection: "row",
    alignItems: "center",
  },

  totalBarValue: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    marginRight: 6,
  },

  coinEmoji: {
    fontSize: 18,
    color: "#fff",
    fontWeight: "500",
  },

  /* PROGRESS */

  progressBlock: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  progressImage: {
    width: 180,
    height: 180,
  },

  progressCenter: {
    position: "absolute",
    alignItems: "center",
  },

  progressValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
  },

  progressLabel: {
    fontSize: 14,
    color: "#777",
  },

  /* STATS */

  statsList: {
    paddingBottom: 10,
  },

  statCard: {
    width: "48%",
    backgroundColor: "#F2F2F2",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },

  statValue: {
    fontSize: 22,
    fontWeight: "700",
  },

  statLabel: {
    fontSize: 13,
    color: "#666",
    marginTop: 6,
  },

  /* BUTTON */

  rewardButton: {
    backgroundColor: "#8D41C1",
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: "center",
    marginVertical: 40,
  },

  rewardsButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Нижняя навигация
  bottomNav: {
    width: '100%',
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    position: 'absolute',
    bottom: 10,
  },

  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },

  rewardsButton:{
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
