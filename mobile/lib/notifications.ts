import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { addNotification, useAppStore } from './store';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export interface NotificationData {
  type: 'approval' | 'completion' | 'failure' | 'alert' | 'insight';
  workflowId?: string;
  runId?: string;
  title: string;
  body: string;
}

export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permission not granted');
    return false;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('dobly-main', {
      name: 'Dobly Notifications',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6366f1',
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('dobly-approvals', {
      name: 'Approvals',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      sound: 'default',
    });
  }

  return true;
}

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) return null;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'dobly-production',
    });

    const token = tokenData.data;

    try {
      await api.notifications.registerToken(token);
    } catch (e) {
      console.log('Failed to register token with server:', e);
    }

    return token;
  } catch (error) {
    console.error('Error registering for push notifications:', error);
    return null;
  }
}

export async function localNotify(notification: NotificationData): Promise<void> {
  const store = useAppStore.getState();

  if (!store.notificationsEnabled) return;

  const channelId = notification.type === 'approval' ? 'dobly-approvals' : 'dobly-main';

  const localNotification: Notifications.NotificationContent = {
    title: notification.title,
    body: notification.body,
    data: {
      type: notification.type,
      workflowId: notification.workflowId,
      runId: notification.runId,
    },
    sound: store.soundEnabled ? 'default' : undefined,
  };

  await Notifications.scheduleNotificationAsync({
    content: localNotification,
    trigger: null,
  });

  addNotification({
    id: `notif-${Date.now()}`,
    type: notification.type,
    title: notification.title,
    body: notification.body,
    workflowId: notification.workflowId,
    runId: notification.runId,
    createdAt: new Date().toISOString(),
    read: false,
  });
}

export async function notifyApprovalRequired(
  workflowName: string,
  workflowId: string,
  runId: string,
  message: string
): Promise<void> {
  await localNotify({
    type: 'approval',
    workflowId,
    runId,
    title: `Approval needed: ${workflowName}`,
    body: message || 'An action requires your approval',
  });
}

export async function notifyWorkflowComplete(
  workflowName: string,
  workflowId: string,
  runId: string,
  stepsCompleted: number,
  totalSteps: number
): Promise<void> {
  await localNotify({
    type: 'completion',
    workflowId,
    runId,
    title: `Completed: ${workflowName}`,
    body: `Finished ${stepsCompleted}/${totalSteps} steps`,
  });
}

export async function notifyWorkflowFailed(
  workflowName: string,
  workflowId: string,
  runId: string,
  error: string
): Promise<void> {
  await localNotify({
    type: 'failure',
    workflowId,
    runId,
    title: `Failed: ${workflowName}`,
    body: error || 'Workflow failed to complete',
  });
}

export async function notifyInsights(
  title: string,
  body: string
): Promise<void> {
  await localNotify({
    type: 'insight',
    title,
    body,
  });
}

const BACKGROUND_FETCH_TASK = 'background-fetch';

TaskManager.defineTask(BACKGROUND_FETCH_TASK, async () => {
  try {
    const response = await fetch(`${process.env.API_URL || 'http://localhost:3000'}/api/workers/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return data.needsUpdate ? BackgroundFetch.BackgroundFetchResult.NewData : BackgroundFetch.BackgroundFetchResult.NoData;
    }

    return BackgroundFetch.BackgroundFetchResult.Failed;
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function startBackgroundFetch(): Promise<void> {
  try {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_FETCH_TASK, {
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (error) {
    console.log('Background fetch registration failed:', error);
  }
}

export function setupNotificationListeners(): () => void {
  const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = response.notification.request.content.data as NotificationData;

    if (data.type === 'approval' && data.workflowId) {
      useAppStore.getState().markNotificationRead(response.notification.request.identifier);
    }
  });

  const receivedListener = Notifications.addNotificationReceivedListener((notification) => {
    console.log('Notification received:', notification);
  });

  return () => {
    responseListener.remove();
    receivedListener.remove();
  };
}

export const BackgroundFetch = {
  BackgroundFetchResult: {
    NewData: 'newData' as const,
    NoData: 'noData' as const,
    Failed: 'failed' as const,
  },
  registerTaskAsync: TaskManager.registerTaskAsync,
};