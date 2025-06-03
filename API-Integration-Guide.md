# WinFit API Integration Guide for React Native Expo TypeScript

## Overview

This guide provides comprehensive documentation for integrating the WinFit API with React Native Expo applications using TypeScript. The API follows RESTful principles and returns consistent JSON responses with proper error handling.

## Table of Contents

1. [Setup and Configuration](#setup-and-configuration)
2. [Authentication Flow](#authentication-flow)
3. [API Response Structure](#api-response-structure)
4. [Error Handling](#error-handling)
5. [Core Integration Patterns](#core-integration-patterns)
6. [Feature-Specific Integrations](#feature-specific-integrations)
7. [Real-time Features](#real-time-features)
8. [File Upload Patterns](#file-upload-patterns)
9. [Offline Support](#offline-support)
10. [Performance Optimization](#performance-optimization)
11. [Testing Strategies](#testing-strategies)

## Setup and Configuration

### Installation

```bash
# Install required packages
npx expo install axios @react-native-async-storage/async-storage
npm install @types/react-native react-native-toast-message
```

### API Configuration

```typescript
// config/api.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import Toast from 'react-native-toast-message';

const API_BASE_URL = __DEV__ 
  ? 'http://localhost:3000/api/v1' 
  : 'https://your-production-api.com/api/v1';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp?: string;
}

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.loadTokensFromStorage();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await this.refreshAccessToken();
            return this.client(originalRequest);
          } catch (refreshError) {
            await this.logout();
            // Navigate to login screen
            throw refreshError;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private async loadTokensFromStorage() {
    try {
      const [accessToken, refreshToken] = await Promise.all([
        AsyncStorage.getItem('accessToken'),
        AsyncStorage.getItem('refreshToken'),
      ]);
      
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
  }

  private async saveTokens(accessToken: string, refreshToken: string) {
    try {
      await Promise.all([
        AsyncStorage.setItem('accessToken', accessToken),
        AsyncStorage.setItem('refreshToken', refreshToken),
      ]);
      
      this.accessToken = accessToken;
      this.refreshToken = refreshToken;
    } catch (error) {
      console.error('Error saving tokens:', error);
    }
  }

  private async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
      refreshToken: this.refreshToken,
    });

    const { accessToken, refreshToken } = response.data.data;
    await this.saveTokens(accessToken, refreshToken);
  }

  async logout() {
    try {
      if (this.accessToken) {
        await this.client.post('/auth/logout');
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.accessToken = null;
      this.refreshToken = null;
      await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
    }
  }

  // Generic request method
  async request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client(config);
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      } else {
        return {
          success: false,
          error: {
            code: 'NETWORK_ERROR',
            message: error.message || 'Network error occurred',
          },
        };
      }
    }
  }
}

export const apiClient = new ApiClient();
```

## Authentication Flow

### Registration

```typescript
// services/auth.service.ts
export interface RegisterData {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: 'Male' | 'Female' | 'Other';
  heightCm?: number;
  weightKg?: number;
}

export interface AuthResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async register(data: RegisterData): Promise<ApiResponse<AuthResponse>> {
    return apiClient.request({
      method: 'POST',
      url: '/auth/register',
      data,
    });
  },

  async login(email: string, password: string): Promise<ApiResponse<AuthResponse>> {
    return apiClient.request({
      method: 'POST',
      url: '/auth/login',
      data: { email, password },
    });
  },

  async forgotPassword(email: string): Promise<ApiResponse> {
    return apiClient.request({
      method: 'POST',
      url: '/auth/forgot-password',
      data: { email },
    });
  },

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse> {
    return apiClient.request({
      method: 'POST',
      url: '/auth/reset-password',
      data: { token, newPassword },
    });
  },

  async verifyEmail(token: string): Promise<ApiResponse> {
    return apiClient.request({
      method: 'POST',
      url: '/auth/verify-email',
      data: { token },
    });
  },
};
```

### React Native Authentication Hook

```typescript
// hooks/useAuth.ts
import { useState, useEffect, createContext, useContext } from 'react';
import { authService, AuthResponse } from '../services/auth.service';
import Toast from 'react-native-toast-message';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      // Try to get user profile to verify token validity
      const response = await apiClient.request({
        method: 'GET',
        url: '/users/profile',
      });

      if (response.success && response.data) {
        setUser(response.data);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await authService.login(email, password);
      
      if (response.success && response.data) {
        setUser(response.data.user);
        Toast.show({
          type: 'success',
          text1: 'Welcome back!',
          text2: response.message,
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
        text2: 'Something went wrong. Please try again.',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await authService.register(data);
      
      if (response.success && response.data) {
        setUser(response.data.user);
        Toast.show({
          type: 'success',
          text1: 'Registration Successful!',
          text2: response.message,
        });
        return true;
      } else {
        Toast.show({
          type: 'error',
          text1: 'Registration Failed',
          text2: response.error?.message || 'Please check your information',
        });
        return false;
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Registration Error',
        text2: 'Something went wrong. Please try again.',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await apiClient.logout();
      setUser(null);
      Toast.show({
        type: 'success',
        text1: 'Logged Out',
        text2: 'See you next time!',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string): Promise<boolean> => {
    try {
      const response = await authService.forgotPassword(email);
      
      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Reset Link Sent',
          text2: response.message,
        });
        return true;
      } else {
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: response.error?.message || 'Failed to send reset link',
        });
        return false;
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Something went wrong. Please try again.',
      });
      return false;
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
        forgotPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

## API Response Structure

All API endpoints return a consistent response structure:

```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp?: string;
}
```

### Success Response Example
```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "username": "johndoe",
    "email": "john@example.com"
  },
  "message": "User profile updated successfully"
}
```

### Error Response Example
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": ["Email is required"],
      "password": ["Password must be at least 8 characters"]
    }
  },
  "timestamp": "2024-12-06T10:30:00Z"
}
```

## Error Handling

### Centralized Error Handler

```typescript
// utils/errorHandler.ts
import Toast from 'react-native-toast-message';

export enum ErrorCodes {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export const handleApiError = (error: ApiError, showToast: boolean = true) => {
  let title = 'Error';
  let message = error.message || 'Something went wrong';

  switch (error.code) {
    case ErrorCodes.NETWORK_ERROR:
      title = 'Network Error';
      message = 'Please check your internet connection';
      break;
    case ErrorCodes.VALIDATION_ERROR:
      title = 'Invalid Input';
      message = formatValidationErrors(error.details);
      break;
    case ErrorCodes.UNAUTHORIZED:
      title = 'Authentication Required';
      message = 'Please log in to continue';
      break;
    case ErrorCodes.FORBIDDEN:
      title = 'Access Denied';
      message = 'You don\'t have permission for this action';
      break;
    case ErrorCodes.NOT_FOUND:
      title = 'Not Found';
      message = 'The requested resource was not found';
      break;
    case ErrorCodes.SERVER_ERROR:
      title = 'Server Error';
      message = 'Our servers are experiencing issues. Please try again later.';
      break;
  }

  if (showToast) {
    Toast.show({
      type: 'error',
      text1: title,
      text2: message,
    });
  }

  return { title, message };
};

const formatValidationErrors = (details: any): string => {
  if (!details) return 'Please check your input';
  
  const errors = Object.values(details).flat() as string[];
  return errors.slice(0, 2).join(', ');
};
```

## Core Integration Patterns

### Health Data Synchronization

The most critical integration for fitness tracking:

```typescript
// services/health.service.ts
export interface HealthData {
  date: string; // ISO date string
  steps: number;
  distance: number; // in meters
  caloriesBurned?: number;
  activeMinutes?: number;
  floorsClimbed?: number;
  heartRateAvg?: number;
  sleepHours?: number;
  waterIntakeMl?: number;
}

export interface HealthSummary {
  totalSteps: number;
  totalDistance: number;
  averageDailySteps: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  dailyGoalProgress: number;
  weeklyGoalProgress: number;
  trends: {
    stepsChange: number;
    distanceChange: number;
  };
}

export const healthService = {
  // Sync single day health data
  async syncHealthData(data: HealthData): Promise<ApiResponse<HealthData>> {
    return apiClient.request({
      method: 'POST',
      url: '/health/sync',
      data,
    });
  },

  // Batch sync multiple days
  async batchSyncHealthData(data: HealthData[]): Promise<ApiResponse<any>> {
    return apiClient.request({
      method: 'POST',
      url: '/health/sync/batch',
      data: { healthData: data },
    });
  },

  // Smart sync with gap handling
  async smartSyncHealthData(data: HealthData): Promise<ApiResponse<any>> {
    return apiClient.request({
      method: 'POST',
      url: '/health/sync/smart',
      data,
    });
  },

  // Get health data for period
  async getHealthData(
    startDate: string,
    endDate: string,
    aggregation: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<ApiResponse<HealthData[]>> {
    return apiClient.request({
      method: 'GET',
      url: '/health/data',
      params: { startDate, endDate, aggregation },
    });
  },

  // Get comprehensive health summary
  async getHealthSummary(
    period: 'week' | 'month' | 'year' = 'week'
  ): Promise<ApiResponse<HealthSummary>> {
    return apiClient.request({
      method: 'GET',
      url: '/health/summary',
      params: { period },
    });
  },

  // Get daily goal progress
  async getDailyGoalProgress(): Promise<ApiResponse<any>> {
    return apiClient.request({
      method: 'GET',
      url: '/health/daily-goals',
    });
  },
};
```

### Health Data Integration Hook

```typescript
// hooks/useHealthData.ts
import { useState, useEffect } from 'react';
import { healthService, HealthData, HealthSummary } from '../services/health.service';
import { handleApiError } from '../utils/errorHandler';

export const useHealthData = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);
  const [lastSyncDate, setLastSyncDate] = useState<string | null>(null);

  const syncHealthData = async (data: HealthData): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await healthService.syncHealthData(data);
      
      if (response.success) {
        setLastSyncDate(new Date().toISOString());
        // Refresh summary after sync
        await fetchHealthSummary();
        return true;
      } else {
        handleApiError(response.error!);
        return false;
      }
    } catch (error) {
      console.error('Health sync error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHealthSummary = async (period: 'week' | 'month' | 'year' = 'week') => {
    try {
      const response = await healthService.getHealthSummary(period);
      if (response.success) {
        setHealthSummary(response.data!);
      }
    } catch (error) {
      console.error('Failed to fetch health summary:', error);
    }
  };

  const batchSync = async (dataArray: HealthData[]): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await healthService.batchSyncHealthData(dataArray);
      
      if (response.success) {
        await fetchHealthSummary();
        return true;
      } else {
        handleApiError(response.error!);
        return false;
      }
    } catch (error) {
      console.error('Batch sync error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealthSummary();
  }, []);

  return {
    isLoading,
    healthSummary,
    lastSyncDate,
    syncHealthData,
    batchSync,
    fetchHealthSummary,
  };
};
```

## Feature-Specific Integrations

### Challenge Integration

```typescript
// services/challenges.service.ts
export interface Challenge {
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
  participants?: number;
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

export const challengesService = {
  async getChallenges(filters?: {
    type?: string;
    category?: string;
    difficulty?: string;
    status?: string;
  }): Promise<ApiResponse<{ challenges: Challenge[]; total: number }>> {
    return apiClient.request({
      method: 'GET',
      url: '/challenges',
      params: filters,
    });
  },

  async getChallengeDetails(id: string): Promise<ApiResponse<Challenge>> {
    return apiClient.request({
      method: 'GET',
      url: `/challenges/${id}`,
    });
  },

  async joinChallenge(id: string): Promise<ApiResponse<any>> {
    return apiClient.request({
      method: 'POST',
      url: `/challenges/${id}/join`,
    });
  },

  async leaveChallenge(id: string): Promise<ApiResponse<any>> {
    return apiClient.request({
      method: 'DELETE',
      url: `/challenges/${id}/leave`,
    });
  },

  async getUserChallenges(status?: 'active' | 'completed' | 'upcoming'): Promise<ApiResponse<Challenge[]>> {
    return apiClient.request({
      method: 'GET',
      url: '/challenges/user',
      params: status ? { status } : {},
    });
  },
};
```

### Challenge Hook

```typescript
// hooks/useChallenges.ts
import { useState, useEffect } from 'react';
import { challengesService, Challenge } from '../services/challenges.service';

export const useChallenges = () => {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userChallenges, setUserChallenges] = useState<Challenge[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchChallenges = async (filters?: any) => {
    try {
      setIsLoading(true);
      const response = await challengesService.getChallenges(filters);
      if (response.success) {
        setChallenges(response.data!.challenges);
      }
    } catch (error) {
      console.error('Failed to fetch challenges:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUserChallenges = async (status?: 'active' | 'completed' | 'upcoming') => {
    try {
      const response = await challengesService.getUserChallenges(status);
      if (response.success) {
        setUserChallenges(response.data!);
      }
    } catch (error) {
      console.error('Failed to fetch user challenges:', error);
    }
  };

  const joinChallenge = async (challengeId: string): Promise<boolean> => {
    try {
      const response = await challengesService.joinChallenge(challengeId);
      if (response.success) {
        await fetchUserChallenges('active');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to join challenge:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchChallenges();
    fetchUserChallenges('active');
  }, []);

  return {
    challenges,
    userChallenges,
    isLoading,
    fetchChallenges,
    fetchUserChallenges,
    joinChallenge,
  };
};
```

## File Upload Patterns

### Avatar Upload

```typescript
// services/upload.service.ts
export const uploadService = {
  async uploadAvatar(imageUri: string): Promise<ApiResponse<{ imageUrl: string }>> {
    const formData = new FormData();
    formData.append('file', {
      uri: imageUri,
      type: 'image/jpeg',
      name: 'avatar.jpg',
    } as any);

    return apiClient.request({
      method: 'POST',
      url: '/uploads/avatar',
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  async getPresignedUrl(fileType: string): Promise<ApiResponse<{ uploadUrl: string; fileUrl: string }>> {
    return apiClient.request({
      method: 'GET',
      url: '/uploads/presigned-url',
      params: { fileType },
    });
  },
};
```

### Image Upload Hook

```typescript
// hooks/useImageUpload.ts
import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { uploadService } from '../services/upload.service';

export const useImageUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const pickAndUploadImage = async (): Promise<string | null> => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission denied');
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return null;

      setIsUploading(true);
      setUploadProgress(0);

      // Upload image
      const response = await uploadService.uploadAvatar(result.assets[0].uri);
      
      if (response.success) {
        setUploadProgress(100);
        return response.data!.imageUrl;
      } else {
        throw new Error(response.error?.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      return null;
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return {
    isUploading,
    uploadProgress,
    pickAndUploadImage,
  };
};
```

## Real-time Features

### Push Notifications

```typescript
// services/notifications.service.ts
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

export const notificationsService = {
  async registerForPushNotifications(): Promise<string | null> {
    let token;

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
    } else {
      throw new Error('Must use physical device for Push Notifications');
    }

    return token;
  },

  async registerDeviceToken(deviceToken: string, platform: 'ios' | 'android'): Promise<ApiResponse> {
    return apiClient.request({
      method: 'POST',
      url: '/notifications/device-token',
      data: { deviceToken, platform },
    });
  },

  async getNotifications(params?: {
    type?: string;
    isRead?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ApiResponse<any>> {
    return apiClient.request({
      method: 'GET',
      url: '/notifications',
      params,
    });
  },

  async markAsRead(notificationId: string): Promise<ApiResponse> {
    return apiClient.request({
      method: 'PUT',
      url: `/notifications/${notificationId}/read`,
    });
  },

  async markAllAsRead(): Promise<ApiResponse> {
    return apiClient.request({
      method: 'PUT',
      url: '/notifications/read-all',
    });
  },
};
```

## Offline Support

### Offline Data Management

```typescript
// utils/offlineManager.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-netinfo/netinfo';

interface OfflineAction {
  id: string;
  endpoint: string;
  method: string;
  data: any;
  timestamp: number;
}

class OfflineManager {
  private static OFFLINE_ACTIONS_KEY = 'offline_actions';
  private static CACHED_DATA_KEY = 'cached_data';

  static async queueAction(endpoint: string, method: string, data: any) {
    const action: OfflineAction = {
      id: Date.now().toString(),
      endpoint,
      method,
      data,
      timestamp: Date.now(),
    };

    try {
      const existingActions = await this.getQueuedActions();
      existingActions.push(action);
      await AsyncStorage.setItem(
        this.OFFLINE_ACTIONS_KEY,
        JSON.stringify(existingActions)
      );
    } catch (error) {
      console.error('Failed to queue offline action:', error);
    }
  }

  static async getQueuedActions(): Promise<OfflineAction[]> {
    try {
      const actions = await AsyncStorage.getItem(this.OFFLINE_ACTIONS_KEY);
      return actions ? JSON.parse(actions) : [];
    } catch (error) {
      console.error('Failed to get queued actions:', error);
      return [];
    }
  }

  static async processQueuedActions() {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) return;

    try {
      const actions = await this.getQueuedActions();
      const successful: string[] = [];

      for (const action of actions) {
        try {
          await apiClient.request({
            method: action.method as any,
            url: action.endpoint,
            data: action.data,
          });
          successful.push(action.id);
        } catch (error) {
          console.error('Failed to process offline action:', error);
        }
      }

      // Remove successful actions
      const remainingActions = actions.filter(
        action => !successful.includes(action.id)
      );
      await AsyncStorage.setItem(
        this.OFFLINE_ACTIONS_KEY,
        JSON.stringify(remainingActions)
      );
    } catch (error) {
      console.error('Failed to process queued actions:', error);
    }
  }

  static async cacheData(key: string, data: any) {
    try {
      const cached = await this.getCachedData();
      cached[key] = {
        data,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(this.CACHED_DATA_KEY, JSON.stringify(cached));
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }

  static async getCachedData(): Promise<any> {
    try {
      const cached = await AsyncStorage.getItem(this.CACHED_DATA_KEY);
      return cached ? JSON.parse(cached) : {};
    } catch (error) {
      console.error('Failed to get cached data:', error);
      return {};
    }
  }
}

export { OfflineManager };
```

## Performance Optimization

### Request Caching

```typescript
// utils/requestCache.ts
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class RequestCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear() {
    this.cache.clear();
  }

  delete(key: string) {
    this.cache.delete(key);
  }
}

export const requestCache = new RequestCache();
```

## Testing Strategies

### API Service Tests

```typescript
// __tests__/services/auth.service.test.ts
import { authService } from '../../services/auth.service';
import { apiClient } from '../../config/api';

// Mock the API client
jest.mock('../../config/api');
const mockedApiClient = apiClient as jest.Mocked<typeof apiClient>;

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should login successfully', async () => {
    const mockResponse = {
      success: true,
      data: {
        user: { id: '1', email: 'test@example.com' },
        accessToken: 'token',
        refreshToken: 'refresh',
      },
      message: 'Login successful',
    };

    mockedApiClient.request.mockResolvedValue(mockResponse);

    const result = await authService.login('test@example.com', 'password');

    expect(result.success).toBe(true);
    expect(result.data?.user.email).toBe('test@example.com');
    expect(mockedApiClient.request).toHaveBeenCalledWith({
      method: 'POST',
      url: '/auth/login',
      data: { email: 'test@example.com', password: 'password' },
    });
  });

  it('should handle login error', async () => {
    const mockResponse = {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      },
    };

    mockedApiClient.request.mockResolvedValue(mockResponse);

    const result = await authService.login('test@example.com', 'wrong');

    expect(result.success).toBe(false);
    expect(result.error?.message).toBe('Invalid email or password');
  });
});
```

## Integration Examples

### Complete Health Data Flow

```typescript
// screens/HealthDashboard.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, RefreshControl, ScrollView } from 'react-native';
import { useHealthData } from '../hooks/useHealthData';
import { useChallenges } from '../hooks/useChallenges';

const HealthDashboard = () => {
  const { healthSummary, syncHealthData, isLoading, fetchHealthSummary } = useHealthData();
  const { userChallenges, fetchUserChallenges } = useChallenges();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchHealthSummary(),
        fetchUserChallenges('active'),
      ]);
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleStepsUpdate = async (steps: number) => {
    const today = new Date().toISOString().split('T')[0];
    const success = await syncHealthData({
      date: today,
      steps,
      distance: steps * 0.7, // Estimate: ~0.7m per step
      caloriesBurned: Math.floor(steps * 0.04), // Estimate: ~0.04 cal per step
    });

    if (success) {
      // Data synced successfully, challenges automatically updated
      await fetchUserChallenges('active');
    }
  };

  return (
    <ScrollView
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View>
        {healthSummary && (
          <>
            <Text>Daily Steps: {healthSummary.totalSteps}</Text>
            <Text>Current Streak: {healthSummary.currentStreak} days</Text>
            <Text>Goal Progress: {healthSummary.dailyGoalProgress}%</Text>
          </>
        )}
        
        {userChallenges.map(challenge => (
          <View key={challenge.id}>
            <Text>{challenge.title}</Text>
            <Text>Progress: {challenge.userProgress?.completionPercentage}%</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};
```

This comprehensive guide provides everything needed for React Native Expo TypeScript integration with the WinFit API, including authentication flows, health data synchronization, error handling, offline support, and performance optimization patterns. 