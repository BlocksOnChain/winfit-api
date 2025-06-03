import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { DeviceToken, PlatformType } from '../entities/device-token.entity';

export interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
  sound?: string;
}

@Injectable()
export class PushNotificationService {
  private readonly logger = new Logger(PushNotificationService.name);
  private firebaseApp: admin.app.App;

  constructor(private configService: ConfigService) {
    this.initializeFirebase();
  }

  private initializeFirebase() {
    try {
      const serviceAccount = this.configService.get('FCM_SERVICE_ACCOUNT');
      
      if (serviceAccount) {
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(JSON.parse(serviceAccount)),
        });
        this.logger.log('Firebase Admin SDK initialized successfully');
      } else {
        this.logger.warn('FCM_SERVICE_ACCOUNT not configured - push notifications will not work');
      }
    } catch (error) {
      this.logger.error('Failed to initialize Firebase Admin SDK', error.stack);
    }
  }

  async sendPushNotification(
    deviceToken: DeviceToken,
    notification: PushNotificationData,
  ): Promise<boolean> {
    if (!this.firebaseApp) {
      this.logger.warn('Firebase not initialized - cannot send push notification');
      return false;
    }

    try {
      const message = this.buildMessage(deviceToken, notification);
      const response = await admin.messaging().send(message);
      
      this.logger.log(`Push notification sent successfully: ${response}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send push notification to ${deviceToken.deviceToken}`,
        error.stack,
      );
      
      // Handle invalid registration tokens
      if (error.code === 'messaging/registration-token-not-registered' ||
          error.code === 'messaging/invalid-registration-token') {
        // Mark token as inactive
        return false;
      }
      
      return false;
    }
  }

  async sendBulkPushNotifications(
    deviceTokens: DeviceToken[],
    notification: PushNotificationData,
  ): Promise<{ success: number; failure: number }> {
    if (!this.firebaseApp || deviceTokens.length === 0) {
      return { success: 0, failure: deviceTokens.length };
    }

    let successCount = 0;
    let failureCount = 0;

    // Send notifications in batches to avoid rate limits
    const batchSize = 500; // FCM allows up to 500 messages per batch
    for (let i = 0; i < deviceTokens.length; i += batchSize) {
      const batch = deviceTokens.slice(i, i + batchSize);
      const messages = batch.map(token => this.buildMessage(token, notification));

      try {
        // Use sendEachForMulticast for better error handling
        const multicastMessage: admin.messaging.MulticastMessage = {
          tokens: batch.map(token => token.deviceToken),
          notification: {
            title: notification.title,
            body: notification.body,
          },
          data: notification.data ? this.sanitizeData(notification.data) : {},
          android: {
            priority: 'high',
            notification: {
              icon: 'ic_notification',
              color: '#4CAF50',
              sound: notification.sound || 'default',
              channelId: 'winfit_notifications',
            },
          },
          apns: {
            payload: {
              aps: {
                badge: notification.badge || 0,
                sound: notification.sound || 'default',
                'content-available': 1,
              },
            },
          },
        };

        const response = await admin.messaging().sendEachForMulticast(multicastMessage);
        successCount += response.successCount;
        failureCount += response.failureCount;

        // Log any failures for debugging
        if (response.responses) {
          response.responses.forEach((resp, index) => {
            if (!resp.success) {
              this.logger.warn(
                `Failed to send notification to token ${batch[index].deviceToken}: ${resp.error?.message}`
              );
            }
          });
        }
      } catch (error) {
        this.logger.error(`Failed to send batch notifications`, error.stack);
        failureCount += batch.length;
      }
    }

    this.logger.log(
      `Bulk push notifications sent - Success: ${successCount}, Failed: ${failureCount}`
    );

    return {
      success: successCount,
      failure: failureCount,
    };
  }

  private buildMessage(
    deviceToken: DeviceToken,
    notification: PushNotificationData,
  ): admin.messaging.Message {
    const baseMessage: admin.messaging.Message = {
      token: deviceToken.deviceToken,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: notification.data ? this.sanitizeData(notification.data) : {},
    };

    // Platform-specific configurations
    if (deviceToken.platform === PlatformType.IOS) {
      baseMessage.apns = {
        payload: {
          aps: {
            badge: notification.badge || 0,
            sound: notification.sound || 'default',
            'content-available': 1,
          },
        },
      };
    } else if (deviceToken.platform === PlatformType.ANDROID) {
      baseMessage.android = {
        priority: 'high',
        notification: {
          icon: 'ic_notification',
          color: '#4CAF50',
          sound: notification.sound || 'default',
          channelId: 'winfit_notifications',
        },
      };
    }

    return baseMessage;
  }

  private sanitizeData(data: Record<string, any>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (value !== null && value !== undefined) {
        sanitized[key] = typeof value === 'string' ? value : JSON.stringify(value);
      }
    }
    
    return sanitized;
  }

  async validateDeviceToken(token: string, platform: PlatformType): Promise<boolean> {
    if (!this.firebaseApp) {
      return false;
    }

    try {
      // For validation, we can try to send a message with validateOnly flag
      const message: admin.messaging.Message = {
        token,
        data: { test: 'validation' },
      };

      await admin.messaging().send(message, true); // dry run mode
      return true;
    } catch (error) {
      this.logger.warn(`Invalid device token: ${token}`, error.message);
      return false;
    }
  }
} 