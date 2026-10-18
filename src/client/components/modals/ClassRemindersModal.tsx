import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { Twemoji } from '../common/Twemoji';
import {
  Bell,
  BellRing,
  Calendar,
  Volume2,
  Clock,
  Check,
  AlertTriangle,
  Download,
  Smartphone,
  Laptop,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { ModalSheet } from '../common/ModalSheet';
import {
  NotificationSettings,
  getNotificationSettings,
  saveNotificationSettings,
  requestNotificationPermission,
  sendTestNotification,
  isNotificationSupported,
  isPushSupported,
  isPushSubscribed,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  sendTestPushNotification,
  checkUpcomingClassAlerts,
} from '../../utils/notificationScheduler';
import { generateSemesterIcs, downloadIcsFile } from '../../utils/icsExport';

interface ClassRemindersModalProps {
  ws: ReturnType<typeof useWorkspace>;
  isOpen: boolean;
  onClose: () => void;
}

export const ClassRemindersModal: React.FC<ClassRemindersModalProps> = ({
  ws,
  isOpen,
  onClose,
}) => {
  const { viewedSemester, courses, showToast } = ws;

  // Notification Settings State
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<string | null>(null);

  // Cloud Web Push State
  const [isPushActive, setIsPushActive] = useState(false);
  const [isPushLoading, setIsPushLoading] = useState(false);

  // Calendar (.ics) Export State
  const [alarmMinutes, setAlarmMinutes] = useState(30);
  const [includeSecondAlarm, setIncludeSecondAlarm] = useState(true);
  const [includeAtStartAlarm, setIncludeAtStartAlarm] = useState(false);
  const [activeTab, setActiveTab] = useState<'notifications' | 'calendar'>('notifications');

  // Check current permission on mount / modal open
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      setSettings(getNotificationSettings());
      setTestStatus(null);
      isPushSubscribed().then(setIsPushActive);
    }
  }, [isOpen]);


  if (!isOpen) return null;

  const supported = isNotificationSupported();

  const handleToggleEnable = async (enable: boolean) => {
    if (enable) {
      const perm = await requestNotificationPermission();
      setPermission(perm);
      if (perm === 'granted') {
        const next = { ...settings, enabled: true };
        setSettings(next);
        saveNotificationSettings(next);
        showToast('Local class notifications enabled');
      } else if (perm === 'denied') {
        showToast('Notification permission denied by browser');
      }
    } else {
      const next = { ...settings, enabled: false };
      setSettings(next);
      saveNotificationSettings(next);
      showToast('Class notifications paused');
    }
  };

  const handleUpdateOption = (key: keyof NotificationSettings, value: boolean) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveNotificationSettings(next);
  };

  const handleTestAlert = async () => {
    setIsTesting(true);
    setTestStatus(null);
    try {
      const firstCourse = courses[0];
      const ok = await sendTestNotification(
        firstCourse ? { type: 'course', id: firstCourse.id, name: `${firstCourse.code} (${firstCourse.name})` } : undefined
      );
      if (ok) {
        setTestStatus('Notification delivered! Tap the banner to preview class details.');
        setPermission(Notification.permission);
      } else {
        setTestStatus('Could not send notification. Please check browser permissions.');
      }
    } catch (e: any) {
      setTestStatus(`Error: ${e?.message || 'Failed to dispatch alert'}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleTogglePush = async (enable: boolean) => {
    setIsPushLoading(true);
    try {
      if (enable) {
        const res = await subscribeToPushNotifications();
        if (res.success) {
          setIsPushActive(true);
          showToast('Cloud Web Push background alerts enabled');
        } else {
          showToast(res.error || 'Failed to enable Web Push');
        }
      } else {
        await unsubscribeFromPushNotifications();
        setIsPushActive(false);
        showToast('Web Push notifications unsubscribed');
      }
    } finally {
      setIsPushLoading(false);
    }
  };

  const handleTestPush = async () => {
    setIsTesting(true);
    setTestStatus(null);
    try {
      const res = await sendTestPushNotification();
      if (res.success) {
        setTestStatus('Cloud Web Push delivered! Check your notification center.');
        setIsPushActive(true);
        showToast('Cloud Web Push delivered! Check your notification center.');
      } else {
        const errorMsg = res.error || 'Failed to dispatch cloud push';
        setTestStatus(`Push test: ${errorMsg}`);
        showToast(`Push test: ${errorMsg}`);
      }
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to test push';
      setTestStatus(`Error: ${errorMsg}`);
      showToast(`Error: ${errorMsg}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleExportIcs = () => {
    const semesterCourses = courses.filter((c) => c.semesterId === viewedSemester.id);
    if (semesterCourses.length === 0) {
      showToast('No courses found in this semester to export');
      return;
    }

    const icsContent = generateSemesterIcs(viewedSemester, courses, {
      alarmMinutesBefore: alarmMinutes,
      includeSecondAlarm,
      includeAtStartAlarm,
    });

    const cleanSemName = viewedSemester.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `academic_schedule_${cleanSemName}.ics`;
    downloadIcsFile(filename, icsContent);
    showToast(`Downloaded ${filename} with ${alarmMinutes}m reminders`);
  };

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} maxWidthClass="sm:max-w-xl">
      {({ requestClose, dragHandleProps }) => (
        <>
          {/* Draggable Header */}
          <div
            {...dragHandleProps}
            className="px-5 py-3 sm:px-6 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
          >
            <div className="flex items-center gap-2 sm:gap-2.5">
              <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 shrink-0">
                <BellRing className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white">
                  Reminders & Push Notifications
                </h2>
                <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  PWA alerts 30m before classes, routines & events with 1-click preview
                </p>
              </div>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-5 sm:px-6 pt-2 gap-2 shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab('notifications')}
              className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'notifications'
                  ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-semibold'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>PWA & Desktop Local Alerts</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className={`pb-2.5 px-3 text-xs font-medium border-b-2 transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                activeTab === 'calendar'
                  ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-semibold'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Mobile Phone Alarms (.ics)</span>
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-5 sm:p-6 space-y-4 text-xs min-h-0">
          {activeTab === 'notifications' ? (
            /* TAB 1: PWA LOCAL NOTIFICATIONS */
            <div className="space-y-4">
              {/* Permission Banner */}
              <div className="p-3 rounded-lg border bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      permission === 'granted'
                        ? 'bg-emerald-500 shadow-xs shadow-emerald-400'
                        : permission === 'denied'
                        ? 'bg-rose-500'
                        : 'bg-amber-400'
                    }`}
                  />
                  <div>
                    <div className="font-medium text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <span>Browser Notification Permission:</span>
                      <span className="font-mono uppercase text-[10px] px-1.5 py-0.5 rounded border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                        {permission}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {permission === 'granted'
                        ? 'System is allowed to send class popups directly to your OS tray.'
                        : permission === 'denied'
                        ? 'Notifications are blocked in your browser. Click the lock/settings icon next to URL to allow.'
                        : 'Allow notifications so the app can alert you before lectures start.'}
                    </p>
                  </div>
                </div>

                {permission !== 'granted' && supported && (
                  <button
                    type="button"
                    onClick={() => handleToggleEnable(true)}
                    className="shrink-0 px-3 py-1.5 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-md font-medium text-xs shadow-xs transition"
                  >
                    Grant Access
                  </button>
                )}
              </div>

              {/* Master Toggle */}
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                    <span>Enable Local Class Reminders</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Runs locally in the background whenever the PWA or browser tab is open
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enabled && permission === 'granted'}
                    onChange={(e) => handleToggleEnable(e.target.checked)}
                    disabled={!supported}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-slate-900 dark:peer-checked:bg-white dark:peer-checked:after:bg-slate-900"></div>
                </label>
              </div>

              {/* Cloud Web Push Master Toggle */}
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Cloud Web Push (Background Alerts)</span>
                    {isPushActive && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Cloudflare Worker Cron sends alerts even when your browser or tab is completely closed
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPushActive}
                    onChange={(e) => handleTogglePush(e.target.checked)}
                    disabled={isPushLoading || !isPushSupported()}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600 dark:peer-checked:bg-indigo-500 dark:peer-checked:after:bg-white"></div>
                </label>
              </div>


              {/* Trigger Options */}
              <div className="space-y-2 pt-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold px-1">
                  Reminder Intervals
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <div>
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          30 Minutes Before Start
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Advance notice before upcoming classes, routines, and events
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.remind30Min}
                      onChange={(e) => handleUpdateOption('remind30Min', e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900 dark:accent-white w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <div>
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          10 Minutes Before Start
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Final reminder to prepare lecture notes or routine materials
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.remind10Min}
                      onChange={(e) => handleUpdateOption('remind10Min', e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900 dark:accent-white w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <div>
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          At Exact Start Time
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Alerts you right as the class, routine, or event officially begins
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.remindAtStart}
                      onChange={(e) => handleUpdateOption('remindAtStart', e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900 dark:accent-white w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition">
                    <div className="flex items-center gap-2">
                      <Volume2 className="w-3.5 h-3.5 text-slate-500" />
                      <div>
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          Play Gentle Alert Chime
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Synthesized offline audio tone when notification fires
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.playSound}
                      onChange={(e) => handleUpdateOption('playSound', e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900 dark:accent-white w-4 h-4"
                    />
                  </label>

                  <label className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <div>
                        <div className="font-medium text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <span>Send Real Alerts in Simulation Mode</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400">
                            Interactive
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Trigger real OS notifications and audio chimes when testing schedules using the time slider
                        </div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifyInSimulation !== false}
                      onChange={(e) => handleUpdateOption('notifyInSimulation', e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900 dark:accent-white w-4 h-4"
                    />
                  </label>
                </div>
              </div>

              {/* Test Alert Button */}
              <div className="pt-2 flex flex-col sm:flex-row flex-wrap items-center gap-2 justify-between">
                <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleTestAlert}
                    disabled={isTesting}
                    className="flex-1 sm:flex-initial px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium transition flex items-center justify-center gap-1.5"
                  >
                    <BellRing className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                    <span>{isTesting ? 'Sending...' : 'Local Test Alert'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      setIsTesting(true);
                      if (permission !== 'granted') {
                        const perm = await requestNotificationPermission();
                        setPermission(perm);
                        if (perm !== 'granted') {
                          setTestStatus('Permission denied');
                          setIsTesting(false);
                          return;
                        }
                      }
                      const sent = await checkUpcomingClassAlerts(
                        courses,
                        viewedSemester,
                        ws.currentAcademicWeek,
                        { ...settings, enabled: true, notifyInSimulation: true },
                        ws.events,
                        {
                          simulatedMinutes: ws.simulatedMinutes,
                          isSimulation: true,
                          simulatedDate: ws.selectedDate,
                          forceTestNotice: true,
                        }
                      );
                      setTestStatus(sent ? 'Simulated alert fired! 🔔' : 'No alert scheduled');
                      setTimeout(() => setTestStatus(null), 4000);
                      setIsTesting(false);
                    }}
                    disabled={isTesting}
                    className="flex-1 sm:flex-initial px-3 py-1.5 rounded-md border border-amber-200 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-medium transition flex items-center justify-center gap-1.5"
                  >
                    <Bell className="w-3.5 h-3.5 text-amber-500" />
                    <span>Test Sim Alert</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestPush}
                    disabled={isTesting}
                    className="flex-1 sm:flex-initial px-3 py-1.5 rounded-md border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-medium transition flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Test Cloud Push</span>
                  </button>
                </div>

                {testStatus && (
                  <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium">
                    {testStatus}
                  </span>
                )}
              </div>

              {/* Informational tip */}
              <div className="p-3 rounded-lg bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex items-start gap-2 text-slate-700 dark:text-slate-300 text-[11px]">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-slate-500 dark:text-slate-400" />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">Desktop PWA vs Closed Phone:</span> On Mac and Windows, keeping the PWA running or minimized in your Dock will trigger system popups reliably. For locked mobile phones when the app is completely closed, use the <strong>Mobile Phone Offline Alarms (.ics)</strong> tab next door!
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: MOBILE PHONE CALENDAR (.ICS) SYNC */
            <div className="space-y-4">
              <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>100% Reliable Offline Mobile Lock-Screen Alarms</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  Exporting to <strong>Apple Calendar</strong>, <strong>Google Calendar</strong>, or <strong>Outlook</strong> schedules native hardware alarms. Your phone will ring <strong>30 minutes before every class even if your phone is locked, asleep, or in Airplane mode without internet</strong>.
                </p>
              </div>

              {/* Alarm Config for ICS */}
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  Advance Alarm Timing for Calendar Events
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setAlarmMinutes(mins)}
                      className={`p-2 rounded-lg border text-center transition ${
                        alarmMinutes === mins
                          ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold shadow-2xs'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="text-sm font-bold">{mins} min</div>
                      <div className="text-[10px] opacity-75">before class</div>
                    </button>
                  ))}
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeSecondAlarm}
                      onChange={(e) => setIncludeSecondAlarm(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900 dark:accent-white w-3.5 h-3.5"
                    />
                    <span className="text-slate-700 dark:text-slate-300">
                      Also include a 10-minute final reminder alarm
                    </span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeAtStartAlarm}
                      onChange={(e) => setIncludeAtStartAlarm(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900 dark:accent-white w-3.5 h-3.5"
                    />
                    <span className="text-slate-700 dark:text-slate-300">
                      Include an alert right at class start time
                    </span>
                  </label>
                </div>
              </div>

              {/* Export Action */}
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {viewedSemester.name} Timetable
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {courses.filter((c) => c.semesterId === viewedSemester.id).length} courses · Week 1 starts {viewedSemester.startDate}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExportIcs}
                  className="px-4 py-2 bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 rounded-lg font-medium text-xs shadow-xs transition flex items-center justify-center gap-2 shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .ics Calendar</span>
                </button>
              </div>

              {/* Device Quick Instructions */}
              <div className="space-y-2 pt-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold px-1">
                  How to install on your devices:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Twemoji emoji="🍎" className="w-3.5 h-3.5" />
                      <span>iPhone & iPad (Apple Calendar)</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                      1. Download the <code className="text-slate-900 dark:text-white font-mono font-bold">.ics</code> file in Safari.<br />
                      2. Tap to open it and choose <strong>"Add All"</strong>.<br />
                      3. iOS will automatically trigger lock-screen alarms 30m before each class.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Twemoji emoji="🤖" className="w-3.5 h-3.5" />
                      <span>Android (Google Calendar)</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                      1. Download the <code className="text-slate-900 dark:text-white font-mono font-bold">.ics</code> file.<br />
                      2. Open with Google Calendar or import into calendar.google.com.<br />
                      3. Full semester schedule is mapped with automatic notifications.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] sm:pb-3.5 sm:px-6 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs flex items-center justify-between shrink-0 z-10">
          <span className="text-[11px] text-slate-500 font-mono">
            {courses.filter((c) => c.semesterId === viewedSemester.id).length} Courses in {viewedSemester.name}
          </span>
          <button
            type="button"
            onClick={requestClose}
            className="px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold text-xs transition hover:bg-slate-800 dark:hover:bg-slate-100 shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </>
    )}
  </ModalSheet>
);
};
