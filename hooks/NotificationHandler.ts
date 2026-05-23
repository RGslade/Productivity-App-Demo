import notifee, {AndroidImportance, TriggerType, TimestampTrigger, } from '@notifee/react-native';
import BackgroundFetch from 'react-native-background-fetch';
import { AppState, Platform } from 'react-native';

// const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_TODO_NOTIFICATION_TASK';

//
const notificationsAvailable = Platform.OS !== 'web';
//
let backgroundTaskHandler: (() => Promise<void>) | null = null;
//
let headlessTaskRegistered = false;
//
let backgroundFetchConfigured = false;

//
function isNotifeeReady(): boolean {
  //
  try {
    //
    if (!notifee) return false;
    //
    if (typeof notifee.requestPermission !== 'function') return false;
    //
    if (typeof notifee.displayNotification !== 'function') return false;
    //
    if (typeof notifee.createTriggerNotification !== 'function') return false;
    return true;
  } catch {
    return false;
  }
}

//
function isBackgroundFetchReady(): boolean {
  //
  try {
    //
    if (!BackgroundFetch) return false;
    //
    if (typeof BackgroundFetch.configure !== 'function') return false;
    //
    if (typeof BackgroundFetch.finish !== 'function') return false;
    //
    if (typeof BackgroundFetch.stop !== 'function') return false;
    return true;
  } catch {
    return false;
  }
}

//
function registerHeadlessTask() {
  //
  if (headlessTaskRegistered) return;
  //
  if (!isBackgroundFetchReady()) return;
  //
  if (typeof BackgroundFetch.registerHeadlessTask !== 'function') return;

  BackgroundFetch.registerHeadlessTask(async (event) => {
    //
    const taskId = event.taskId;
    //
    try {
      //
      if (backgroundTaskHandler) {
        await backgroundTaskHandler();
        BackgroundFetch.finish(taskId);
        return;
      }
      BackgroundFetch.finish(taskId);
    } catch (error) {
      console.error('Background notification task error:', error);
      BackgroundFetch.finish(taskId);
    }
  });

  headlessTaskRegistered = true;
}

//
export async function configureNotifications() {
  //
  if (!notificationsAvailable) return;

  //
  try {
    //
    if (!isNotifeeReady()) {
      console.warn('WARN Notifee module not available');
      return;
    }

    //
    if (Platform.OS === 'android') {
      await notifee.createChannel({
        id: 'default',
        name: 'Default Channel',
        importance: AndroidImportance.DEFAULT,
      });
    }

  } catch (error) {
    console.warn('Could not configure notifications:', error);
  }
}

//
export async function clearAllNotifications() {
  //
  if (!notificationsAvailable) return;

  //
  try {
    //
    if (!isNotifeeReady()) return;

    //
    if (typeof notifee.cancelTriggerNotifications === 'function') {
      await notifee.cancelTriggerNotifications();
    }

    //
    if (typeof notifee.cancelDisplayedNotifications === 'function') {
      await notifee.cancelDisplayedNotifications();
    }

    //
    if (typeof notifee.cancelAllNotifications === 'function') {
      await notifee.cancelAllNotifications();
    }
  } catch (error) {
    console.error('Error clearing notifications:', error);
  }
}

//
export async function registerForPushNotifications() {
  //
  if (!notificationsAvailable) return null;

  //
  try {
    //
    if (!isNotifeeReady()) {
      console.warn('WARN Notifee module not available');
      return null;
    }
    //
    const settings = await notifee.requestPermission();
    return settings;
  } catch (error) {
    console.warn('Notifications not available:', error);
    return null;
  }
}

//
export async function sendLocalNotification(title: string, body: string, data?: Record<string, any>) {
  //
  try {
    //
    if (!isNotifeeReady()) {
      console.warn('WARN Notifee module not available');
      return;
    }

    //
    const isAppActive = AppState.currentState === 'active';

    //
    if (isAppActive) {
      // Foreground notifications are disabled by product decision.
      // await notifee.displayNotification({
      //   title,
      //   body,
      //   data: data || {},
      //   android: {
      //     channelId: 'default',
      //     smallIcon: 'ic_launcher',
      //     pressAction: { id: 'default' },
      //   },
      // });
      return;
    }

    await notifee.displayNotification({title, body, data: data || {}, android: {channelId: 'default', smallIcon: 'ic_launcher', pressAction: { id: 'default' },},});
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

//
export async function sendScheduledNotification(title: string, body: string, seconds: number, data?: Record<string, any>) {
  //
  try {
    //
    if (!isNotifeeReady()) {
      console.warn('WARN Notifee module not available');
      return;
    }

    //
    const isAppActive = AppState.currentState === 'active';

    //
    if (isAppActive) {
      // Foreground scheduled notifications are disabled by product decision.
      // const trigger: TimestampTrigger = {
      //   type: TriggerType.TIMESTAMP,
      //   timestamp: Date.now() + seconds * 1000,
      // };
      //
      // await notifee.createTriggerNotification(
      //   {
      //     title,
      //     body,
      //     data: data || {},
      //     android: {
      //       channelId: 'default',
      //       smallIcon: 'ic_launcher',
      //       pressAction: { id: 'default' },
      //     },
      //   },
      //   trigger
      // );
      return;
    }

    //
    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: Date.now() + seconds * 1000,
    };

    await notifee.createTriggerNotification(
      {
        title,
        body,
        data: data || {},
        android: {
          channelId: 'default',
          smallIcon: 'ic_launcher',
          pressAction: { id: 'default' },
        },
      },
      trigger
    );
  } catch (error) {
    console.error('Error scheduling notification:', error);
  }
}

//
export function defineBackgroundNotificationTask(
  taskHandler: () => Promise<void>
) {
  //
  if (!isBackgroundFetchReady()) {
    console.warn(
      'WARN BackgroundFetch not available - skipping background task definition'
    );
    return;
  }

  backgroundTaskHandler = taskHandler;
  registerHeadlessTask();
}

//
export async function registerBackgroundNotificationTask(
  minInterval: number = 900
) {
  //
  if (!isBackgroundFetchReady()) {
    console.warn(
      'WARN BackgroundFetch not available - background notifications disabled'
    );
    return;
  }

  //
  if (backgroundFetchConfigured) {
    return;
  }

  //
  try {
    registerHeadlessTask();
    //
    const minIntervalMinutes = Math.max(15, Math.round(minInterval / 60));

    await BackgroundFetch.configure(
      {
        minimumFetchInterval: minIntervalMinutes,
        enableHeadless: true,
        stopOnTerminate: false,
        startOnBoot: false,
      },
      async (taskId: string) => {
        //
        try {
          //
          if (backgroundTaskHandler) {
            await backgroundTaskHandler();
          }
        } catch (error) {
          console.error('Background task error:', error);
        } finally {
          BackgroundFetch.finish(taskId);
        }
      },
      async (taskId: string) => {
        console.warn(`Background fetch task timeout: ${taskId}`);
        BackgroundFetch.finish(taskId);
      }
    );

    backgroundFetchConfigured = true;
  } catch (error) {
    console.error('Error registering background task:', error);
  }
}

//
export async function unregisterBackgroundNotificationTask() {
  //
  if (!isBackgroundFetchReady()) {
    console.warn('WARN BackgroundFetch not available - nothing to unregister');
    return;
  }

  //
  try {
    backgroundFetchConfigured = false;
    await BackgroundFetch.stop();
  } catch (error) {
    console.error('Error unregistering background task:', error);
  }
}
