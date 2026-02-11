import React from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";

import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useTasks, TaskStatus } from '../hooks/tasksSafe';
import { TaskItem } from '../components/task_item/task-item';

import childIcon from "../assets/person.png"
import rewards1 from "../assets/reward1.jpg"

type User = {
  id: string;
  name: string;
  avatar: string;
};

type Reward = {
  id: string;
  image: string;
  price: number;
};

const users: User[] = [
  {
    id: "1",
    name: "Вадим",
    avatar: childIcon,
  },

];

const rewards: Reward[] = [
  {
    id: "1",
    image: rewards1,
    price: 10000,
  },
];



export default function RewardsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <Text style={styles.title}>Награды</Text>

      {/* Users */}
      <FlatList
        data={users}
        horizontal
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        style={styles.usersList}
        renderItem={({ item }) => (
          <View style={styles.userItem}>
            <Image source={{ uri: item.avatar }} style={styles.avatar} />
            <Text style={styles.userName}>{item.name}</Text>
          </View>
        )}
      />

      {/* Rewards Grid */}
      <FlatList
        data={rewards}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={{ justifyContent: "space-between" }}
        contentContainerStyle={styles.rewardsList}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <Image source={{ uri: item.image }} style={styles.cardImage} />

            <View style={styles.priceBadge}>
              <Text style={styles.priceText}>{item.price} 🪙</Text>
            </View>
          </TouchableOpacity>
        )}
      />
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

  usersList: {
    marginBottom: 16,
  },

  userItem: {
    alignItems: "center",
    marginRight: 16,
  },

  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginBottom: 6,
  },

  userName: {
    fontSize: 12,
    color: "#333",
  },

  rewardsList: {
    paddingBottom: 20,
  },

  card: {
    width: "48%",
    height: 170,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    backgroundColor: "#eee",
  },

  cardImage: {
    width: "100%",
    height: "100%",
  },

  priceBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "#8B3DFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  priceText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});
