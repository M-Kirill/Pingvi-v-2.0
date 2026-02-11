import React, { useState, useEffect } from 'react';
import {View, StyleSheet, SafeAreaView, TouchableOpacity, Image, StatusBar} from 'react-native';

import { useRouter } from 'expo-router';

import homeIcon from '../assets/home.png';
import tasksIcon from '../assets/calendar.png';
import statIcon from '../assets/tasks.png';
import plusIcon from '../assets/plus.png';
import familyIcon from '../assets/family-house.png';

export default function LOWER_BAR() {
  const router = useRouter();


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      

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
        
          onPress = {() => router.push("/statistic_screen")}
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
    position: 'absolute',
    bottom: 0,
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
});