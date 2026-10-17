import { Course, Semester, ScheduleEvent } from '../../types';
import { api } from '../api';

export interface NotificationSettings {
  enabled: boolean;
  webPushEnabled?: boolean;
  remind30Min: boolean;
  remind10Min: boolean;
  remindAtStart: boolean;
  playSound: boolean;
  notifyInSimulation?: boolean;
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
  notifyInSimulation: true,
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

function clearSentKey(key: string): void {
  try {
    const sent = getSentKeys();
    if (sent.delete(key)) {
      sessionStorage.setItem(SENT_KEYS_SESSION, JSON.stringify(Array.from(sent)));
    }
  } catch {}
}

export interface CheckAlertsOptions {
  simulatedMinutes?: number;
  isSimulation?: boolean;
  simulatedDate?: string;
  forceTestNotice?: boolean;
}

/**
 * Direct simulator to test a real system notification for any course or event
 */
export async function simulateClassAlert(
  title: string,
  body: string,
  tag = 'sim-test-alert'
): Promise<boolean> {
  if (Notification.permission !== 'granted') {
    const perm = await requestNotificationPermission();
    if (perm !== 'granted') return false;
  }
  playChime();
  return await showSystemNotification(title, {
    body,
    tag,
  });
}

/**
 * Evaluates courses and events against current or simulated time and triggers real notifications
 * (e.g. 30 minutes before, 10 minutes before, and when class starts)
 */
export async function checkUpcomingClassAlerts(
  courses: Course[],
  viewedSemester: Semester,
  currentAcademicWeek: number,
  settings: NotificationSettings,
  events: ScheduleEvent[] = [],
  options?: CheckAlertsOptions
): Promise<boolean> {
  const isSim = !!options?.isSimulation;

  // Verify notification permissions and settings
  if (!isNotificationSupported() || Notification.permission !== 'granted') {
    return false;
  }

  // If in simulation mode, respect the notifyInSimulation setting (enabled by default)
  if (isSim) {
    if (settings.notifyInSimulation === false) {
      return false;
    }
  } else if (!settings.enabled) {
    return false;
  }

  const now = new Date();
  let todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  let currentDayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // 1 = Mon .. 7 = Sun
  let currentMinutes = now.getHours() * 60 + now.getMinutes();

  if (isSim && options?.simulatedMinutes !== undefined) {
    currentMinutes = options.simulatedMinutes;
  }

  if (isSim && options?.simulatedDate) {
    todayStr = options.simulatedDate;
    const parts = options.simulatedDate.split('-').map(Number);
    if (parts.length === 3) {
      const d = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
      currentDayOfWeek = d.getDay() === 0 ? 7 : d.getDay();
    }
  }

  const prefix = isSim ? 'sim-' : '';
  const titlePrefix = isSim ? '🔔 [Simulated] ' : '🔔 ';
  const sentKeys = getSentKeys();
  const semesterCourses = courses.filter((c) => c.semesterId === viewedSemester.id);
  let triggeredAlert = false;

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

      const key30m = `${prefix}${course.id}-${todayStr}-${schedule.startTime}-30m`;
      const key10m = `${prefix}${course.id}-${todayStr}-${schedule.startTime}-10m`;
      const keyStart = `${prefix}${course.id}-${todayStr}-${schedule.startTime}-start`;

      // In simulation mode, clear keys if user scrubs away from the time window to allow re-testing
      if (isSim) {
        if (Math.abs(diffMinutes - 30) > 10) clearSentKey(key30m);
        if (Math.abs(diffMinutes - 10) > 8) clearSentKey(key10m);
        if (Math.abs(diffMinutes) > 8) clearSentKey(keyStart);
      }

      // Alert at 30 minutes before
      if (settings.remind30Min && diffMinutes >= 28 && diffMinutes <= 32) {
        if (!sentKeys.has(key30m)) {
          markKeySent(key30m);
          if (settings.playSound) playChime();
          await showSystemNotification(`${titlePrefix}Class in 30 minutes: ${course.code}`, {
            body: `${course.name}\n📍 ${course.location || 'Campus'} · ${schedule.startTime}–${schedule.endTime}`,
            tag: `class-${course.id}-30m`,
          });
          triggeredAlert = true;
        }
      }

      // Alert at 10 minutes before
      if (settings.remind10Min && diffMinutes >= 8 && diffMinutes <= 12) {
        if (!sentKeys.has(key10m)) {
          markKeySent(key10m);
          if (settings.playSound) playChime();
          await showSystemNotification(`${isSim ? '⏳ [Simulated] ' : '⏳ '}Class in 10 minutes: ${course.code}`, {
            body: `Starting soon at ${course.location || 'Campus'} (${schedule.startTime})`,
            tag: `class-${course.id}-10m`,
          });
          triggeredAlert = true;
        }
      }

      // Alert at start time
      if (settings.remindAtStart && diffMinutes >= -2 && diffMinutes <= 2) {
        if (!sentKeys.has(keyStart)) {
          markKeySent(keyStart);
          if (settings.playSound) playChime();
          await showSystemNotification(`${isSim ? '📚 [Simulated] ' : '📚 '}Class Starting Now: ${course.code}`, {
            body: `${course.name} is starting in ${course.location || 'Campus'}.`,
            tag: `class-${course.id}-start`,
          });
          triggeredAlert = true;
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
      const evStart = ev.specificDate || '';
      const evEnd = ev.endDate || evStart;
      isActiveToday = evStart ? (todayStr >= evStart && todayStr <= evEnd) : false;
    }

    if (!isActiveToday || ev.isAllDay) continue;

    const [startH, startM] = ev.startTime.split(':').map(Number);
    if (isNaN(startH) || isNaN(startM)) continue;

    const evStartMinutes = startH * 60 + startM;
    const diffMinutes = evStartMinutes - currentMinutes;
    const typeLabel = ev.type === 'routine' ? 'Routine' : 'Event';

    const key30m = `${prefix}ev-${ev.id}-${todayStr}-${ev.startTime}-30m`;
    const key10m = `${prefix}ev-${ev.id}-${todayStr}-${ev.startTime}-10m`;
    const keyStart = `${prefix}ev-${ev.id}-${todayStr}-${ev.startTime}-start`;

    if (isSim) {
      if (Math.abs(diffMinutes - 30) > 10) clearSentKey(key30m);
      if (Math.abs(diffMinutes - 10) > 8) clearSentKey(key10m);
      if (Math.abs(diffMinutes) > 8) clearSentKey(keyStart);
    }

    // Alert at 30 minutes before
    if (settings.remind30Min && diffMinutes >= 28 && diffMinutes <= 32) {
      if (!sentKeys.has(key30m)) {
        markKeySent(key30m);
        if (settings.playSound) playChime();
        await showSystemNotification(`${titlePrefix}${typeLabel} in 30 minutes: ${ev.title}`, {
          body: `${ev.category ? `[${ev.category}] ` : ''}${ev.startTime}–${ev.endTime}${ev.location ? ` · ${ev.location}` : ''}`,
          tag: `ev-${ev.id}-30m`,
        });
        triggeredAlert = true;
      }
    }

    // Alert at 10 minutes before
    if (settings.remind10Min && diffMinutes >= 8 && diffMinutes <= 12) {
      if (!sentKeys.has(key10m)) {
        markKeySent(key10m);
        if (settings.playSound) playChime();
        await showSystemNotification(`${isSim ? '⏳ [Simulated] ' : '⏳ '}${typeLabel} in 10 minutes: ${ev.title}`, {
          body: `Starting soon at ${ev.startTime}${ev.location ? ` (${ev.location})` : ''}`,
          tag: `ev-${ev.id}-10m`,
        });
        triggeredAlert = true;
      }
    }

    // Alert at start time
    if (settings.remindAtStart && diffMinutes >= -2 && diffMinutes <= 2) {
      if (!sentKeys.has(keyStart)) {
        markKeySent(keyStart);
        if (settings.playSound) playChime();
        await showSystemNotification(`${isSim ? '🎯 [Simulated] ' : '🎯 '}${typeLabel} Starting Now: ${ev.title}`, {
          body: `${ev.title} is starting now (${ev.startTime}–${ev.endTime}).`,
          tag: `ev-${ev.id}-start`,
        });
        triggeredAlert = true;
      }
    }
  }

  // 3. Fallback for forceTestNotice (e.g. user explicitly clicks simulation alert test button)
  if (!triggeredAlert && options?.forceTestNotice) {
    const todayCourses = semesterCourses.filter((c) =>
      c.schedules?.some((s) => s.dayOfWeek === currentDayOfWeek)
    );
    if (todayCourses.length > 0) {
      const firstCourse = todayCourses[0];
      const sched = firstCourse.schedules?.find((s) => s.dayOfWeek === currentDayOfWeek);
      if (settings.playSound) playChime();
      await showSystemNotification(`🔔 [Simulated Test] Class Alert: ${firstCourse.code}`, {
        body: `${firstCourse.name}\n📍 ${firstCourse.location || 'Campus'} · ${sched ? `${sched.startTime}–${sched.endTime}` : ''}`,
        tag: `sim-force-${firstCourse.id}`,
      });
      return true;
    } else {
      // General alert test
      if (settings.playSound) playChime();
      await showSystemNotification(`🔔 [Simulated Test] Academic Workspace Alert`, {
        body: `Simulation mode active at ${Math.floor(currentMinutes / 60)}:${String(currentMinutes % 60).padStart(2, '0')}. Notifications are working!`,
        tag: 'sim-force-general',
      });
      return true;
    }
  }

  return triggeredAlert;
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

