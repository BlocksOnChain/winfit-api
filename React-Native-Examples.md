# React Native Expo TypeScript Integration Examples

## Complete Authentication Flow Example

### AuthContext Provider
```typescript
// contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../services/api';
import Toast from 'react-native-toast-message';

interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  emailVerified: boolean;
  level: number;
  experience: number;
  avatarUrl?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      if (token) {
        const response = await apiClient.request({
          method: 'GET',
          url: '/users/profile',
        });
        
        if (response.success) {
          setUser(response.data);
        } else {
          // Token invalid, clear storage
          await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await apiClient.request({
        method: 'POST',
        url: '/auth/login',
        data: { email, password },
      });

      if (response.success) {
        setUser(response.data.user);
        Toast.show({
          type: 'success',
          text1: 'Welcome back!',
          text2: `Good to see you, ${response.data.user.firstName}!`,
        });
        return true;
      } else {
        Toast.show({
          type: 'error',
          text1: 'Login Failed',
          text2: response.error?.message || 'Invalid credentials',
        });
        return false;
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Login Error',
        text2: 'Please check your connection and try again',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await apiClient.request({
        method: 'POST',
        url: '/auth/register',
        data: userData,
      });

      if (response.success) {
        setUser(response.data.user);
        Toast.show({
          type: 'success',
          text1: 'Welcome to WinFit!',
          text2: 'Please check your email for verification',
        });
        return true;
      } else {
        Toast.show({
          type: 'error',
          text1: 'Registration Failed',
          text2: response.error?.message || 'Please try again',
        });
        return false;
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Registration Error',
        text2: 'Please check your connection and try again',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } catch (error) {
      console.error('Logout request failed:', error);
    } finally {
      setUser(null);
      Toast.show({
        type: 'success',
        text1: 'Logged Out',
        text2: 'See you next time!',
      });
    }
  };

  const refreshUserData = async () => {
    try {
      const response = await apiClient.request({
        method: 'GET',
        url: '/users/profile',
      });
      
      if (response.success) {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
```

## Health Data Integration

### Health Data Hook
```typescript
// hooks/useHealthData.ts
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/api';
import Toast from 'react-native-toast-message';
import NetInfo from '@react-native-netinfo/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface HealthData {
  date: string;
  steps: number;
  distance: number;
  caloriesBurned?: number;
  activeMinutes?: number;
  sleepHours?: number;
  waterIntakeMl?: number;
}

interface HealthSummary {
  totalSteps: number;
  totalDistance: number;
  currentStreak: number;
  longestStreak: number;
  dailyGoalProgress: number;
  weeklyGoalProgress: number;
  averageDailySteps: number;
  activeDays: number;
}

export const useHealthData = () => {
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);
  const [pendingData, setPendingData] = useState<HealthData[]>([]);

  useEffect(() => {
    loadPendingData();
    fetchHealthSummary();
    
    // Set up network listener for automatic sync
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && pendingData.length > 0) {
        syncPendingData();
      }
    });

    return unsubscribe;
  }, []);

  const loadPendingData = async () => {
    try {
      const stored = await AsyncStorage.getItem('pendingHealthData');
      if (stored) {
        setPendingData(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load pending data:', error);
    }
  };

  const savePendingData = async (data: HealthData[]) => {
    try {
      await AsyncStorage.setItem('pendingHealthData', JSON.stringify(data));
      setPendingData(data);
    } catch (error) {
      console.error('Failed to save pending data:', error);
    }
  };

  const syncHealthData = async (data: HealthData): Promise<boolean> => {
    const netInfo = await NetInfo.fetch();
    
    if (!netInfo.isConnected) {
      // Store offline for later sync
      const updated = [...pendingData, data];
      await savePendingData(updated);
      
      Toast.show({
        type: 'info',
        text1: 'Data Saved Offline',
        text2: 'Will sync when connection is restored',
      });
      
      return true;
    }

    try {
      setIsLoading(true);
      const response = await apiClient.request({
        method: 'POST',
        url: '/health/sync',
        data,
      });

      if (response.success) {
        setLastSyncDate(new Date().toISOString());
        await fetchHealthSummary();
        
        Toast.show({
          type: 'success',
          text1: 'Health Data Synced',
          text2: 'Your progress has been updated!',
        });
        
        return true;
      } else {
        throw new Error(response.error?.message || 'Sync failed');
      }
    } catch (error) {
      // Store for offline sync
      const updated = [...pendingData, data];
      await savePendingData(updated);
      
      Toast.show({
        type: 'warning',
        text1: 'Sync Failed',
        text2: 'Data saved offline for later sync',
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const syncPendingData = async () => {
    if (pendingData.length === 0) return;

    try {
      setIsLoading(true);
      
      const response = await apiClient.request({
        method: 'POST',
        url: '/health/sync/batch',
        data: { healthData: pendingData },
      });

      if (response.success) {
        await savePendingData([]); // Clear pending data
        await fetchHealthSummary();
        
        Toast.show({
          type: 'success',
          text1: 'Offline Data Synced',
          text2: `${pendingData.length} entries uploaded successfully`,
        });
      }
    } catch (error) {
      console.error('Failed to sync pending data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHealthSummary = async () => {
    try {
      const response = await apiClient.request({
        method: 'GET',
        url: '/health/summary',
        params: { period: 'week' },
      });

      if (response.success) {
        setHealthSummary(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch health summary:', error);
    }
  };

  const smartSync = async (data: HealthData): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await apiClient.request({
        method: 'POST',
        url: '/health/sync/smart',
        data,
      });

      if (response.success) {
        setLastSyncDate(new Date().toISOString());
        await fetchHealthSummary();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Smart sync failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    healthSummary,
    isLoading,
    lastSyncDate,
    pendingDataCount: pendingData.length,
    syncHealthData,
    smartSync,
    syncPendingData,
    fetchHealthSummary,
  };
};
```

### Health Kit Integration (iOS)
```typescript
// services/healthKit.ts
import AppleHealthKit, {
  HealthKitPermissions,
  HealthInputOptions,
} from 'react-native-health';
import { Platform } from 'react-native';

const permissions: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Steps,
      AppleHealthKit.Constants.Permissions.DistanceWalkingRunning,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
    ],
    write: [],
  },
};

export class HealthKitService {
  static async initHealthKit(): Promise<boolean> {
    if (Platform.OS !== 'ios') return false;
    
    return new Promise((resolve) => {
      AppleHealthKit.initHealthKit(permissions, (error: string) => {
        if (error) {
          console.log('HealthKit init error:', error);
          resolve(false);
        } else {
          console.log('HealthKit initialized successfully');
          resolve(true);
        }
      });
    });
  }

  static async getTodaySteps(): Promise<number> {
    return new Promise((resolve) => {
      const options: HealthInputOptions = {
        date: new Date().toISOString(),
        includeManuallyAdded: false,
      };

      AppleHealthKit.getStepCount(options, (error, results) => {
        if (error) {
          console.log('Error getting steps:', error);
          resolve(0);
        } else {
          resolve(results.value || 0);
        }
      });
    });
  }

  static async getTodayDistance(): Promise<number> {
    return new Promise((resolve) => {
      const options: HealthInputOptions = {
        date: new Date().toISOString(),
        includeManuallyAdded: false,
      };

      AppleHealthKit.getDistanceWalkingRunning(options, (error, results) => {
        if (error) {
          console.log('Error getting distance:', error);
          resolve(0);
        } else {
          resolve(results.value || 0);
        }
      });
    });
  }

  static async getHealthDataForDate(date: string) {
    const [steps, distance] = await Promise.all([
      this.getTodaySteps(),
      this.getTodayDistance(),
    ]);

    return {
      date,
      steps,
      distance: Math.round(distance * 1000), // Convert to meters
      caloriesBurned: Math.round(steps * 0.04), // Rough estimate
      activeMinutes: Math.round(steps / 100), // Rough estimate
    };
  }
}
```

## Challenge Integration

### Challenge Management Hook
```typescript
// hooks/useChallenges.ts
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/api';
import Toast from 'react-native-toast-message';

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'Individual' | 'Group' | 'Friends';
  category: 'Steps' | 'Distance' | 'Time';
  goal: number;
  duration: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  startDate: string;
  endDate: string;
  userProgress?: {
    currentProgress: number;
    completionPercentage: number;
    rank?: number;
    isCompleted: boolean;
  };
  reward?: {
    type: string;
    value: string;
    description: string;
  };
}

export const useChallenges = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userChallenges, setUserChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchChallenges = useCallback(async (filters?: any) => {
    try {
      setIsLoading(true);
      const response = await apiClient.request({
        method: 'GET',
        url: '/challenges',
        params: filters,
      });

      if (response.success) {
        setChallenges(response.data.challenges);
      }
    } catch (error) {
      console.error('Failed to fetch challenges:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to Load Challenges',
        text2: 'Please check your connection and try again',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchUserChallenges = useCallback(async (status?: string) => {
    try {
      const response = await apiClient.request({
        method: 'GET',
        url: '/challenges/user',
        params: status ? { status } : {},
      });

      if (response.success) {
        setUserChallenges(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch user challenges:', error);
    }
  }, []);

  const joinChallenge = async (challengeId: string): Promise<boolean> => {
    try {
      const response = await apiClient.request({
        method: 'POST',
        url: `/challenges/${challengeId}/join`,
      });

      if (response.success) {
        await fetchUserChallenges('active');
        await fetchChallenges(); // Refresh to update participant count
        
        Toast.show({
          type: 'success',
          text1: 'Challenge Joined!',
          text2: 'Good luck reaching your goal!',
        });
        
        return true;
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed to Join Challenge',
          text2: response.error?.message || 'Please try again',
        });
        return false;
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Join Failed',
        text2: 'Please check your connection and try again',
      });
      return false;
    }
  };

  const leaveChallenge = async (challengeId: string): Promise<boolean> => {
    try {
      const response = await apiClient.request({
        method: 'DELETE',
        url: `/challenges/${challengeId}/leave`,
      });

      if (response.success) {
        await fetchUserChallenges('active');
        
        Toast.show({
          type: 'info',
          text1: 'Left Challenge',
          text2: 'You can always join another one!',
        });
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to leave challenge:', error);
      return false;
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchChallenges(),
        fetchUserChallenges('active'),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
    fetchUserChallenges('active');
  }, [fetchChallenges, fetchUserChallenges]);

  return {
    challenges,
    userChallenges,
    isLoading,
    refreshing,
    fetchChallenges,
    fetchUserChallenges,
    joinChallenge,
    leaveChallenge,
    refreshData,
  };
};
```

## Push Notifications Setup

### Notification Service
```typescript
// services/notificationService.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { apiClient } from './api';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  static async registerForPushNotifications(): Promise<string | null> {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'WinFit Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        throw new Error('Permission not granted for push notifications');
      }
      
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId,
      })).data;
      
      // Register token with backend
      await this.registerDeviceToken(token, Platform.OS as 'ios' | 'android');
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  }

  static async registerDeviceToken(deviceToken: string, platform: 'ios' | 'android') {
    try {
      await apiClient.request({
        method: 'POST',
        url: '/notifications/device-token',
        data: { deviceToken, platform },
      });
      console.log('Device token registered successfully');
    } catch (error) {
      console.error('Failed to register device token:', error);
    }
  }

  static addNotificationListener(handler: (notification: any) => void) {
    return Notifications.addNotificationReceivedListener(handler);
  }

  static addNotificationResponseListener(handler: (response: any) => void) {
    return Notifications.addNotificationResponseReceivedListener(handler);
  }

  static async scheduleBadgeUpdate(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }
}
```

### Notification Hook
```typescript
// hooks/useNotifications.ts
import { useState, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { NotificationService } from '../services/notificationService';
import { apiClient } from '../services/api';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    // Initialize push notifications
    NotificationService.registerForPushNotifications().catch(console.error);

    // Set up notification listeners
    notificationListener.current = NotificationService.addNotificationListener(
      (notification) => {
        console.log('Notification received:', notification);
        // Refresh notifications when received
        fetchNotifications();
      }
    );

    responseListener.current = NotificationService.addNotificationResponseListener(
      (response) => {
        console.log('Notification response:', response);
        // Handle notification tap
        handleNotificationTap(response.notification);
      }
    );

    // Set up app state listener
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        // Refresh notifications when app becomes active
        fetchNotifications();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Initial fetch
    fetchNotifications();

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
      subscription?.remove();
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const [notificationsResponse, unreadResponse] = await Promise.all([
        apiClient.request({
          method: 'GET',
          url: '/notifications',
          params: { limit: 50 },
        }),
        apiClient.request({
          method: 'GET',
          url: '/notifications/unread-count',
        }),
      ]);

      if (notificationsResponse.success) {
        setNotifications(notificationsResponse.data.notifications);
      }

      if (unreadResponse.success) {
        const count = unreadResponse.data.count;
        setUnreadCount(count);
        NotificationService.scheduleBadgeUpdate(count);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await apiClient.request({
        method: 'PUT',
        url: `/notifications/${notificationId}/read`,
      });

      if (response.success) {
        setNotifications(prev =>
          prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        NotificationService.scheduleBadgeUpdate(Math.max(0, unreadCount - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await apiClient.request({
        method: 'PUT',
        url: '/notifications/read-all',
      });

      if (response.success) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);
        NotificationService.scheduleBadgeUpdate(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleNotificationTap = (notification: any) => {
    // Handle different notification types
    const notificationData = notification.request.content.data;
    
    switch (notificationData?.type) {
      case 'CHALLENGE':
        // Navigate to challenge details
        // navigation.navigate('ChallengeDetails', { challengeId: notificationData.challengeId });
        break;
      case 'ACHIEVEMENT':
        // Navigate to achievements
        // navigation.navigate('Achievements');
        break;
      case 'FRIEND':
        // Navigate to friends
        // navigation.navigate('Friends');
        break;
      default:
        // Navigate to notifications screen
        // navigation.navigate('Notifications');
        break;
    }
  };

  return {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
};
```

## Complete Dashboard Example

### Dashboard Screen
```typescript
// screens/DashboardScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useHealthData } from '../hooks/useHealthData';
import { useChallenges } from '../hooks/useChallenges';
import { useNotifications } from '../hooks/useNotifications';
import { HealthKitService } from '../services/healthKit';

const DashboardScreen = () => {
  const { user } = useAuth();
  const {
    healthSummary,
    syncHealthData,
    isLoading: healthLoading,
    pendingDataCount,
    syncPendingData,
  } = useHealthData();
  const {
    userChallenges,
    refreshData: refreshChallenges,
    isLoading: challengesLoading,
  } = useChallenges();
  const { unreadCount } = useNotifications();

  const [refreshing, setRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    initializeHealthTracking();
  }, []);

  const initializeHealthTracking = async () => {
    const initialized = await HealthKitService.initHealthKit();
    if (initialized) {
      syncTodayHealthData();
    }
  };

  const syncTodayHealthData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const healthData = await HealthKitService.getHealthDataForDate(today);
      
      const success = await syncHealthData(healthData);
      if (success) {
        setLastSyncTime(new Date());
      }
    } catch (error) {
      console.error('Failed to sync health data:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        syncTodayHealthData(),
        refreshChallenges(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSyncPendingData = () => {
    Alert.alert(
      'Sync Offline Data',
      `You have ${pendingDataCount} entries waiting to sync. Sync now?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sync', onPress: syncPendingData },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Good {getTimeOfDay()}, {user?.firstName}!
        </Text>
        <Text style={styles.level}>Level {user?.level} • {user?.experience} XP</Text>
        {unreadCount > 0 && (
          <View style={styles.notificationBadge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {/* Pending Sync Alert */}
      {pendingDataCount > 0 && (
        <TouchableOpacity style={styles.syncAlert} onPress={handleSyncPendingData}>
          <Text style={styles.syncAlertText}>
            {pendingDataCount} offline entries ready to sync
          </Text>
        </TouchableOpacity>
      )}

      {/* Today's Progress */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today's Progress</Text>
        {healthSummary && (
          <>
            <View style={styles.progressRow}>
              <Text style={styles.metric}>Steps</Text>
              <Text style={styles.value}>
                {healthSummary.totalSteps.toLocaleString()}
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(healthSummary.dailyGoalProgress, 100)}%` },
                ]}
              />
            </View>
            <Text style={styles.goalText}>
              {healthSummary.dailyGoalProgress.toFixed(0)}% of daily goal
            </Text>
          </>
        )}
        
        {lastSyncTime && (
          <Text style={styles.lastSync}>
            Last synced: {lastSyncTime.toLocaleTimeString()}
          </Text>
        )}
      </View>

      {/* Active Challenges */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Active Challenges</Text>
        {userChallenges.length === 0 ? (
          <Text style={styles.emptyState}>No active challenges</Text>
        ) : (
          userChallenges.slice(0, 3).map(challenge => (
            <View key={challenge.id} style={styles.challengeItem}>
              <Text style={styles.challengeTitle}>{challenge.title}</Text>
              <Text style={styles.challengeProgress}>
                {challenge.userProgress?.completionPercentage.toFixed(0)}% complete
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${challenge.userProgress?.completionPercentage || 0}%` },
                  ]}
                />
              </View>
            </View>
          ))
        )}
      </View>

      {/* Streak Information */}
      {healthSummary && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Streak</Text>
          <Text style={styles.streakText}>
            🔥 {healthSummary.currentStreak} days
          </Text>
          <Text style={styles.streakSubtext}>
            Longest: {healthSummary.longestStreak} days
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#007AFF',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  level: {
    fontSize: 16,
    color: '#E3F2FD',
    marginTop: 4,
  },
  notificationBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  syncAlert: {
    backgroundColor: '#FF9500',
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  syncAlertText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  metric: {
    fontSize: 16,
    color: '#666',
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginVertical: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  goalText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  lastSync: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  challengeItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  challengeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  challengeProgress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  emptyState: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    padding: 20,
  },
  streakText: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 8,
  },
  streakSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default DashboardScreen;
```

This comprehensive example shows how to integrate all the major WinFit API features into a React Native Expo TypeScript application with proper error handling, offline support, and user-friendly interfaces. 