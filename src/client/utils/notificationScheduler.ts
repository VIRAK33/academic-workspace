import { Course, Semester, ScheduleEvent } from '../../types';
import { api } from '../api';

export interface NotificationSettings {
  enabled: boolean;
  webPushEnabled?: boolean;
  remind30Min: boolean;
  remind10Min: boolean;
  remindAtStart: boolean;
  playSound: boolean;
}

const STORAGE_KEY = 'phd_workspace_notification_settings_v1';
const SENT_KEYS_SESSION = 'phd_workspace_sent_alerts_v1';

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  enabled: false,
  webPushEnabled: false,
  remind30Min: true,
  remind10Min: true,
  remindAtStart: true,
  playSound: true,
};


/**
 * Retrieve saved notification preferences from localStorage
 */
export function getNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_NOTIFICATION_SETTINGS;
    return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_NOTIFICATION_SETTINGS;
  }
}

/**
 * Save notification preferences to localStorage
 */
export function saveNotificationSettings(settings: NotificationSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('Could not save notification settings:', err);
  }
}

/**
 * Check if the browser supports standard Web Notifications
 */
export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Request notification permission from user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch {
    return Notification.permission;
  }
}

/**
 * Synthesize a gentle academic alert chime using standard Web Audio API
 * 100% offline, zero network requests, zero audio file dependencies
 */
export function playChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Gentle melodic chord: D5 (587.33Hz) ramping to A5 (880Hz)
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Audio context may be restricted by browser until first user interaction
  }
}

/**
 * Show a system notification via Service Worker or fallback to window.Notification
 */
export async function showSystemNotification(
  title: string,
  options: NotificationOptions = {}
): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  const defaultOptions: NotificationOptions = {
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    ...options,
  };

  // Try Service Worker registration first (standard for PWAs)
  if ('serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, defaultOptions);
        return true;
      }
    } catch {
      // Fall through to window.Notification
    }
  }

  // Fallback to window.Notification
  try {
    new Notification(title, defaultOptions);
    return true;
  } catch (err) {
    console.warn('Notification trigger error:', err);
    return false;
  }
}

/**
 * Send an immediate test notification to verify OS & browser permissions
 */
export async function sendTestNotification(): Promise<boolean> {
  if (Notification.permission !== 'granted') {
    const perm = await requestNotificationPermission();
    if (perm !== 'granted') return false;
  }

  playChime();
  return showSystemNotification('🔔 Academic Workspace Alert Test', {
    body: 'Class reminders are active! You will receive advance notifications 30m before your scheduled classes.',
    tag: 'academic-test-alert',
  });
}

function getSentKeys(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SENT_KEYS_SESSION);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}

function markKeySent(key: string): void {
  try {
    const sent = getSentKeys();
    sent.add(key);
    sessionStorage.setItem(SENT_KEYS_SESSION, JSON.stringify(Array.from(sent)));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Evaluates today's courses against current time and triggers alerts
 * (e.g. 30 minutes before, 10 minutes before, and when class starts)
 */
export async function checkUpcomingClassAlerts(
  courses: Course[],
  viewedSemester: Semester,
  currentAcademicWeek: number,
  settings: NotificationSettings,
  events: ScheduleEvent[] = []
): Promise<void> {
  if (!settings.enabled || !isNotificationSupported() || Notification.permission !== 'granted') {
    return;
  }

  const now = new Date();
  const currentDayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // 1 = Mon .. 7 = Sun
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const semesterCourses = courses.filter((c) => c.semesterId === viewedSemester.id);
  const sentKeys = getSentKeys();

  // 1. Process Courses
  for (const course of semesterCourses) {
    const isActiveThisWeek =
      !course.activeWeeks ||
      course.activeWeeks.length === 0 ||
      course.activeWeeks.includes(currentAcademicWeek);

    if (!isActiveThisWeek) continue;

    for (const schedule of course.schedules || []) {
      if (schedule.dayOfWeek !== currentDayOfWeek) continue;

      const [startH, startM] = schedule.startTime.split(':').map(Number);
      if (isNaN(startH) || isNaN(startM)) continue;

      const classStartMinutes = startH * 60 + startM;
      const diffMinutes = classStartMinutes - currentMinutes;

      // Alert at 30 minutes before
      if (settings.remind30Min && diffMinutes >= 29 && diffMinutes <= 31) {
        const key = `${course.id}-${todayStr}-${schedule.startTime}-30m`;
        if (!sentKeys.has(key)) {
          markKeySent(key);
          if (settings.playSound) playChime();
          await showSystemNotification(`🔔 Class in 30 minutes: ${course.code}`, {
            body: `${course.name}\n📍 ${course.location || 'Campus'} · ${schedule.startTime}–${schedule.endTime}`,
            tag: `class-${course.id}-30m`,
          });
        }
      }

      // Alert at 10 minutes before
      if (settings.remind10Min && diffMinutes >= 9 && diffMinutes <= 11) {
        const key = `${course.id}-${todayStr}-${schedule.startTime}-10m`;
        if (!sentKeys.has(key)) {
          markKeySent(key);
          if (settings.playSound) playChime();
          await showSystemNotification(`⏳ Class in 10 minutes: ${course.code}`, {
            body: `Starting soon at ${course.location || 'Campus'} (${schedule.startTime})`,
            tag: `class-${course.id}-10m`,
          });
        }
      }

      // Alert at start time
      if (settings.remindAtStart && diffMinutes >= -1 && diffMinutes <= 1) {
        const key = `${course.id}-${todayStr}-${schedule.startTime}-start`;
        if (!sentKeys.has(key)) {
          markKeySent(key);
          if (settings.playSound) playChime();
          await showSystemNotification(`📚 Class Starting Now: ${course.code}`, {
            body: `${course.name} is now starting in ${course.location || 'Campus'}.`,
            tag: `class-${course.id}-start`,
          });
        }
      }
    }
  }

  // 2. Process Routines & Events
  const semesterEvents = events.filter((e) => e.semesterId === viewedSemester.id);
  for (const ev of semesterEvents) {
    let isActiveToday = false;
    if (ev.type === 'routine') {
      const activeWeeksOk = !ev.activeWeeks || ev.activeWeeks.includes(currentAcademicWeek);
      const dayOk = ev.daysOfWeek.includes(currentDayOfWeek);
      isActiveToday = activeWeeksOk && dayOk;
    } else if (ev.type === 'event') {
      isActiveToday = ev.specificDate === todayStr;
    }

    if (!isActiveToday) continue;

    const [startH, startM] = ev.startTime.split(':').map(Number);
    if (isNaN(startH) || isNaN(startM)) continue;

    const evStartMinutes = startH * 60 + startM;
    const diffMinutes = evStartMinutes - currentMinutes;
    const typeLabel = ev.type === 'routine' ? 'Routine' : 'Event';

    // Alert at 30 minutes before
    if (settings.remind30Min && diffMinutes >= 29 && diffMinutes <= 31) {
      const key = `ev-${ev.id}-${todayStr}-${ev.startTime}-30m`;
      if (!sentKeys.has(key)) {
        markKeySent(key);
        if (settings.playSound) playChime();
        await showSystemNotification(`🔔 ${typeLabel} in 30 minutes: ${ev.title}`, {
          body: `${ev.category ? `[${ev.category}] ` : ''}${ev.startTime}–${ev.endTime}${ev.location ? ` · ${ev.location}` : ''}`,
          tag: `ev-${ev.id}-30m`,
        });
      }
    }

    // Alert at 10 minutes before
    if (settings.remind10Min && diffMinutes >= 9 && diffMinutes <= 11) {
      const key = `ev-${ev.id}-${todayStr}-${ev.startTime}-10m`;
      if (!sentKeys.has(key)) {
        markKeySent(key);
        if (settings.playSound) playChime();
        await showSystemNotification(`⏳ ${typeLabel} in 10 minutes: ${ev.title}`, {
          body: `Starting soon at ${ev.startTime}${ev.location ? ` (${ev.location})` : ''}`,
          tag: `ev-${ev.id}-10m`,
        });
      }
    }

    // Alert at start time
    if (settings.remindAtStart && diffMinutes >= -1 && diffMinutes <= 1) {
      const key = `ev-${ev.id}-${todayStr}-${ev.startTime}-start`;
      if (!sentKeys.has(key)) {
        markKeySent(key);
        if (settings.playSound) playChime();
        await showSystemNotification(`🎯 ${typeLabel} Starting Now: ${ev.title}`, {
          body: `${ev.title} is starting now (${ev.startTime}–${ev.endTime}).`,
          tag: `ev-${ev.id}-start`,
        });
      }
    }
  }
}

/**
 * Converts standard VAPID public key base64 string to Uint8Array for pushManager.subscribe
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if the browser supports background Web Push API
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Check if current device has an active push subscription
 */
export async function isPushSubscribed(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    return sub !== null;
  } catch {
    return false;
  }
}

/**
 * Subscribes current device to Web Push notifications via VAPID
 */
export async function subscribeToPushNotifications(): Promise<{ success: boolean; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: 'Web Push is not supported in this browser' };
  }

  try {
    // 1. Request notification permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Notification permission was denied' };
    }

    // 2. Fetch VAPID public key from backend
    const vapidPublicKey = await api.getVapidPublicKey();
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

    // 3. Register push subscription with browser push service
    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as unknown as BufferSource,
      });
    }

    // 4. Send subscription to Cloudflare Worker backend
    const saved = await api.subscribePush(subscription.toJSON());
    if (!saved) {
      return { success: false, error: 'Failed to record push subscription on server' };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to subscribe to Web Push' };
  }
}

/**
 * Unsubscribes current device from Web Push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!isPushSupported()) return true;
  try {
    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (subscription) {
      await api.unsubscribePush(subscription.endpoint);
      await subscription.unsubscribe();
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Sends an immediate test Web Push notification from the server
 */
export async function sendTestPushNotification(): Promise<{ success: boolean; sentCount?: number; error?: string }> {
  if (!isPushSupported()) {
    return { success: false, error: 'Web Push is not supported in this browser' };
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      const res = await subscribeToPushNotifications();
      if (!res.success) {
        return { success: false, error: res.error || 'Please enable notifications first' };
      }
      subscription = await reg.pushManager.getSubscription();
    }

    if (subscription) {
      return await api.sendTestPush(subscription.toJSON());
    }
    return await api.sendTestPush();
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to trigger test push' };
  }
}

