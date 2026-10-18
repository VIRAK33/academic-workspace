import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { WorkspaceDatabase, DatabaseEnv } from './db';
import {
  getJwtSecret,
  createSessionToken,
  verifySessionToken,
  verifyGoogleIdToken,
  TokenPayload,
} from './auth';
import {
  sendWebPush,
  DEFAULT_VAPID_PUBLIC_KEY,
  PushEnv,
} from './push';

export interface ServerBindings extends DatabaseEnv, PushEnv {
  JWT_SECRET?: string;
  GOOGLE_CLIENT_ID?: string;
}

type Variables = {
  userId?: string;
  user?: TokenPayload;
};

const app = new Hono<{ Bindings: ServerBindings; Variables: Variables }>();

app.use('*', cors());

// Extract Bearer token & assign userId to context
app.use('*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const secret = getJwtSecret(c.env);
    const payload = await verifySessionToken(token, secret);
    if (payload) {
      c.set('userId', payload.sub);
      c.set('user', payload);
    }
  }
  await next();
});

function getDb(c: any): WorkspaceDatabase {
  const userId = c.get('userId');
  return new WorkspaceDatabase(c.env, userId);
}

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Real Engine Time
app.get('/api/time', (c) => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return c.json({
    isoDate: `${y}-${m}-${d}`,
    timestamp: now.toISOString(),
    hours: now.getHours(),
    minutes: now.getMinutes(),
    totalMinutes: now.getHours() * 60 + now.getMinutes(),
  });
});

// --- AUTHENTICATION ENDPOINTS ---
app.post('/api/auth/google', async (c) => {
  try {
    const body = await c.req.json();
    const { credential, clientId } = body;
    if (!credential) {
      return c.json({ success: false, error: 'Google credential token is required' }, 400);
    }

    const expectedAud = clientId || c.env.GOOGLE_CLIENT_ID;
    const verified = await verifyGoogleIdToken(credential, expectedAud);
    if (!verified) {
      return c.json({ success: false, error: 'Failed to verify Google identity credential' }, 401);
    }

    const db = new WorkspaceDatabase(c.env);
    const user = await db.createOrUpdateUser({
      googleSub: verified.sub,
      email: verified.email,
      name: verified.name,
      picture: verified.picture,
    });

    const secret = getJwtSecret(c.env);
    const token = await createSessionToken(user, secret);

    return c.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture,
        provider: 'google',
      },
    });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || 'Authentication error' }, 500);
  }
});

app.post('/api/auth/demo', async (c) => {
  const body = (await c.req.json().catch(() => ({}))) || {};
  const name = body.name || 'Student Scholar';
  const email = body.email || 'scholar@academic.edu';
  const demoSub = `demo_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;

  const db = new WorkspaceDatabase(c.env);
  const user = await db.createOrUpdateUser({
    googleSub: demoSub,
    email,
    name,
    picture: undefined,
  });

  const secret = getJwtSecret(c.env);
  const token = await createSessionToken(user, secret);

  return c.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      provider: 'local_demo',
    },
  });
});

app.get('/api/auth/me', async (c) => {
  const user = c.get('user');
  if (!user) {
    return c.json({ authenticated: false });
  }
  const db = new WorkspaceDatabase(c.env);
  const fullUser = await db.getUserById(user.sub);
  return c.json({
    authenticated: true,
    user: fullUser || {
      id: user.sub,
      email: user.email,
      name: user.name,
      picture: user.picture,
    },
  });
});

// --- PUSH NOTIFICATION ENDPOINTS ---
app.get('/api/notifications/vapid-public-key', (c) => {
  const key = c.env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
  return c.json({ publicKey: key });
});

app.post('/api/notifications/subscribe', async (c) => {
  try {
    const userId = c.get('userId') || 'guest_user';
    const body = await c.req.json();
    const { endpoint, keys, userAgent } = body;

    if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
      return c.json({ success: false, error: 'Valid PushSubscription required' }, 400);
    }

    const db = new WorkspaceDatabase(c.env);
    await db.savePushSubscription({
      userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: userAgent || c.req.header('User-Agent'),
    });

    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || 'Subscription error' }, 500);
  }
});

app.post('/api/notifications/unsubscribe', async (c) => {
  try {
    const body = await c.req.json();
    if (body.endpoint) {
      const db = new WorkspaceDatabase(c.env);
      await db.deletePushSubscription(body.endpoint);
    }
    return c.json({ success: true });
  } catch {
    return c.json({ success: true });
  }
});

app.post('/api/notifications/test', async (c) => {
  try {
    const userId = c.get('userId');
    const db = new WorkspaceDatabase(c.env);
    let subs = userId ? await db.getPushSubscriptionsForUser(userId) : [];

    if (subs.length === 0) {
      // If no subscription found for current user, check body for direct subscription
      const body = await c.req.json().catch(() => ({}));
      if (body.endpoint && body.keys) {
        subs = [{
          id: 'temp_sub',
          userId: userId || 'guest',
          endpoint: body.endpoint,
          p256dh: body.keys.p256dh,
          auth: body.keys.auth,
        }];
      } else {
        return c.json({ success: false, error: 'No active push subscriptions found. Please enable notifications first.' }, 400);
      }
    }

    const userDb = getDb(c);
    const semesters = await userDb.getSemesters();
    const activeSem = semesters.find((s) => s.isActive) || semesters[0];
    const courses = activeSem ? await userDb.getCourses(activeSem.id) : [];
    const firstCourse = courses[0];

    const payload = {
      title: '🔔 Academic Alert Test',
      body: firstCourse
        ? `Push alerts active! Tap to preview class details for ${firstCourse.code}: ${firstCourse.name}.`
        : 'Push notifications are active! You will receive background alerts 30m before scheduled classes.',
      url: firstCourse ? `/?previewType=course&previewId=${firstCourse.id}` : '/',
      previewType: firstCourse ? 'course' : undefined,
      previewId: firstCourse ? firstCourse.id : undefined,
      tag: 'academic-test-push',
    };

    let sent = 0;
    let lastErr = '';
    for (const sub of subs) {
      const res = await sendWebPush(sub, payload, c.env);
      if (res.success) {
        sent++;
      } else if (res.error) {
        lastErr = res.error;
      }
    }

    if (sent === 0 && subs.length > 0) {
      return c.json({
        success: false,
        error: lastErr || 'Device push endpoint rejected the notification payload',
        totalSubs: subs.length,
      }, 400);
    }

    return c.json({ success: true, sentCount: sent, totalSubs: subs.length });
  } catch (err: any) {
    return c.json({ success: false, error: err?.message || 'Failed to dispatch push notification' }, 500);
  }
});

// --- SEMESTERS ---
app.get('/api/semesters', async (c) => {
  const db = getDb(c);
  const data = await db.getSemesters();
  return c.json(data);
});

app.post('/api/semesters', async (c) => {
  const db = getDb(c);
  const body = await c.req.json();
  const saved = await db.saveSemester(body);
  return c.json(saved);
});

app.delete('/api/semesters/:id', async (c) => {
  const db = getDb(c);
  const id = c.req.param('id');
  const success = await db.deleteSemester(id);
  return c.json({ success });
});

// --- TIME SLOTS ---
app.get('/api/timeslots', async (c) => {
  const db = getDb(c);
  const data = await db.getTimeSlots();
  return c.json(data);
});

app.put('/api/timeslots', async (c) => {
  const db = getDb(c);
  const body = await c.req.json();
  const saved = await db.saveTimeSlots(body);
  return c.json(saved);
});

// --- COURSES ---
app.get('/api/courses', async (c) => {
  const db = getDb(c);
  const semId = c.req.query('semesterId');
  const data = await db.getCourses(semId);
  return c.json(data);
});

app.post('/api/courses', async (c) => {
  const db = getDb(c);
  const body = await c.req.json();
  const saved = await db.saveCourse(body);
  return c.json(saved);
});

app.delete('/api/courses/:id', async (c) => {
  const db = getDb(c);
  const id = c.req.param('id');
  await db.deleteCourse(id);
  return c.json({ success: true, id });
});

// --- EVENTS & ROUTINES ---
app.get('/api/events', async (c) => {
  const db = getDb(c);
  const semId = c.req.query('semesterId');
  const data = await db.getEvents(semId);
  return c.json(data);
});

app.post('/api/events', async (c) => {
  const db = getDb(c);
  const body = await c.req.json();
  const saved = await db.saveEvent(body);
  return c.json(saved);
});

app.delete('/api/events/:id', async (c) => {
  const db = getDb(c);
  const id = c.req.param('id');
  await db.deleteEvent(id);
  return c.json({ success: true, id });
});

// --- TASKS ---
app.get('/api/tasks', async (c) => {
  const db = getDb(c);
  const semId = c.req.query('semesterId');
  const data = await db.getTasks(semId);
  return c.json(data);
});

app.post('/api/tasks', async (c) => {
  const db = getDb(c);
  const body = await c.req.json();
  const saved = await db.saveTask(body);
  return c.json(saved);
});

app.delete('/api/tasks/:id', async (c) => {
  const db = getDb(c);
  const id = c.req.param('id');
  await db.deleteTask(id);
  return c.json({ success: true, id });
});

// --- KANBAN ---
app.get('/api/kanban', async (c) => {
  const db = getDb(c);
  const data = await db.getKanban();
  return c.json(data);
});

app.post('/api/kanban', async (c) => {
  const db = getDb(c);
  const body = await c.req.json();
  const saved = await db.saveKanban(body);
  return c.json(saved);
});

app.delete('/api/kanban/:id', async (c) => {
  const db = getDb(c);
  const id = c.req.param('id');
  await db.deleteKanban(id);
  return c.json({ success: true, id });
});

// --- PAPERS (LITERATURE) ---
app.get('/api/papers', async (c) => {
  const db = getDb(c);
  const data = await db.getPapers();
  return c.json(data);
});

app.post('/api/papers', async (c) => {
  const db = getDb(c);
  const body = await c.req.json();
  const saved = await db.savePaper(body);
  return c.json(saved);
});

app.delete('/api/papers/:id', async (c) => {
  const db = getDb(c);
  const id = c.req.param('id');
  await db.deletePaper(id);
  return c.json({ success: true, id });
});

// --- CONFERENCES ---
app.get('/api/conferences', async (c) => {
  const db = getDb(c);
  const data = await db.getConferences();
  return c.json(data);
});

app.post('/api/conferences', async (c) => {
  const db = getDb(c);
  const body = await c.req.json();
  const saved = await db.saveConference(body);
  return c.json(saved);
});

app.delete('/api/conferences/:id', async (c) => {
  const db = getDb(c);
  const id = c.req.param('id');
  await db.deleteConference(id);
  return c.json({ success: true, id });
});

// --- EXPERIMENTS ---
app.get('/api/experiments', async (c) => {
  const db = getDb(c);
  const data = await db.getExperiments();
  return c.json(data);
});

app.post('/api/experiments', async (c) => {
  const db = getDb(c);
  const body = await c.req.json();
  const saved = await db.saveExperiment(body);
  return c.json(saved);
});

// --- ADVISOR MEETINGS ---
app.get('/api/meetings', async (c) => {
  const db = getDb(c);
  const data = await db.getMeetings();
  return c.json(data);
});

app.post('/api/meetings', async (c) => {
  const db = getDb(c);
  const body = await c.req.json();
  const saved = await db.saveMeeting(body);
  return c.json(saved);
});

// --- ATTENDANCE & ROUTINE COMPLETION RECORDS ---
app.get('/api/attendance', async (c) => {
  const db = getDb(c);
  const date = c.req.query('date');
  const targetId = c.req.query('targetId');
  const data = await db.getAttendanceRecords(date, targetId);
  return c.json(data);
});

app.post('/api/attendance', async (c) => {
  const db = getDb(c);
  const body = await c.req.json();
  const saved = await db.saveAttendanceRecord(body);
  return c.json(saved);
});

app.delete('/api/attendance/:id', async (c) => {
  const db = getDb(c);
  const id = c.req.param('id');
  await db.deleteAttendanceRecord(id);
  return c.json({ success: true, id });
});

// --- 1-CLICK WEEKLY DIGEST GENERATOR ---
app.get('/api/digest', async (c) => {
  const db = getDb(c);
  const tasks = await db.getTasks();
  const exps = await db.getExperiments();
  const papers = await db.getPapers();

  const completedTasks = tasks.filter((t) => t.status === 'completed');
  const pendingTasks = tasks.filter((t) => t.status !== 'completed');
  const recentExps = exps.slice(0, 3);
  const readingPapers = papers.filter((p) => p.status === 'reading' || p.status === 'read').slice(0, 3);

  const digest = [
    `# Academic Weekly Digest (${new Date().toISOString().split('T')[0]})`,
    '',
    '## 1. Accomplished This Week',
    completedTasks.length > 0
      ? completedTasks.map((t) => `- [x] ${t.title} (${t.tags.join(', ')})`).join('\n')
      : '- No tasks completed this cycle.',
    '',
    '## 2. Experimental Milestones & Compute Runs',
    recentExps.length > 0
      ? recentExps.map((e) => `- **${e.name}** [${e.projectTag}]: ${e.notes || e.hypothesis || 'Done'} | Metrics: ${JSON.stringify(e.metrics || {})}`).join('\n')
      : '- No experimental logs logged.',
    '',
    '## 3. Literature Synthesis',
    readingPapers.length > 0
      ? readingPapers.map((p) => `- *${p.title}* (${p.venue || 'ArXiv'} ${p.year || ''}) - TL;DR: ${p.tldr || 'Reviewed'}`).join('\n')
      : '- Ongoing literature review.',
    '',
    '## 4. Next Week Commitments & Discussion Points',
    pendingTasks.slice(0, 4).map((t) => `- [ ] ${t.title} (Target: ${t.dueDate})`).join('\n') || '- Refine research methodology.',
    '',
    '---\n*Generated by Academic Workspace*',
  ].join('\n');

  return c.json({ digest });
});

// --- R2 STORAGE ENDPOINTS ---
app.post('/api/storage/upload', async (c) => {
  const r2 = c.env.ACADEMIC_STORAGE;
  const key = c.req.query('key') || `uploads/${Date.now()}`;

  if (r2) {
    const body = await c.req.arrayBuffer();
    const contentType = c.req.header('content-type') || 'application/octet-stream';
    await r2.put(key, body, { httpMetadata: { contentType } });
    return c.json({ success: true, key, url: `/api/storage/file?key=${encodeURIComponent(key)}` });
  }

  return c.json({ success: true, key, mock: true, url: `/api/storage/file?key=${encodeURIComponent(key)}` });
});

app.get('/api/storage/file', async (c) => {
  const r2 = c.env.ACADEMIC_STORAGE;
  const key = c.req.query('key');
  if (!key) return c.text('Key required', 400);

  if (r2) {
    const object = await r2.get(key);
    if (!object) return c.text('File not found', 404);
    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    return new Response(object.body, { headers });
  }

  return c.text('File storage simulated in local dev mode.');
});

// --- SAMPLE DATA & WORKSPACE RESET ---
app.post('/api/workspace/sample-data', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ success: false, error: 'Unauthorized' }, 401);
  const db = getDb(c);
  await db.loadSampleData();
  return c.json({ success: true });
});

app.post('/api/workspace/clear', async (c) => {
  const userId = c.get('userId');
  if (!userId) return c.json({ success: false, error: 'Unauthorized' }, 401);
  const db = getDb(c);
  await db.clearUserData();
  return c.json({ success: true });
});

// --- BACKUP & RESTORE ---
app.get('/api/backup', async (c) => {
  const db = getDb(c);
  const all = await db.exportAll();
  return c.json(all);
});

app.post('/api/backup/restore', async (c) => {
  const db = getDb(c);
  const body = await c.req.json();
  await db.importAll(body);
  return c.json({ success: true });
});

// Helper to compute academic week in server cron
function getAcademicWeek(todayIso: string, startIso: string): number {
  try {
    const [ty, tm, td] = todayIso.split('-').map(Number);
    const [sy, sm, sd] = startIso.split('-').map(Number);
    const t = Date.UTC(ty, tm - 1, td);
    const s = Date.UTC(sy, sm - 1, sd);
    const diffDays = Math.floor((t - s) / 86400000);
    return Math.floor(diffDays / 7) + 1;
  } catch {
    return 1;
  }
}

// --- CLOUDFLARE WORKER DISPATCHER (FETCH + SCHEDULED CRON) ---
export default {
  fetch: app.fetch,

  /**
   * Cloudflare Scheduled Handler: Runs every 15 minutes to evaluate upcoming classes,
   * routines, and events, and dispatch Web Push notifications to subscribed devices even when closed.
   */
  async scheduled(event: any, env: ServerBindings, ctx: any) {
    try {
      const now = new Date();
      const currentDayOfWeek = now.getDay() === 0 ? 7 : now.getDay();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      const db = new WorkspaceDatabase(env);
      const allSubs = await db.getAllPushSubscriptions();
      if (allSubs.length === 0) return;

      // Group subscriptions by userId
      const userSubsMap = new Map<string, typeof allSubs>();
      for (const sub of allSubs) {
        const list = userSubsMap.get(sub.userId) || [];
        list.push(sub);
        userSubsMap.set(sub.userId, list);
      }

      // Check upcoming classes, routines, and events for each subscribed user
      for (const [userId, subs] of userSubsMap.entries()) {
        const userDb = new WorkspaceDatabase(env, userId);
        const semesters = await userDb.getSemesters();
        const activeSem = semesters.find((s) => s.isActive) || semesters[0];
        if (!activeSem) continue;

        const currentAcademicWeek = activeSem.startDate ? getAcademicWeek(todayIso, activeSem.startDate) : 1;

        // 1. Evaluate Courses
        const courses = await userDb.getCourses(activeSem.id);
        for (const course of courses) {
          const isActiveThisWeek =
            !course.activeWeeks ||
            course.activeWeeks.length === 0 ||
            course.activeWeeks.includes(currentAcademicWeek);
          if (!isActiveThisWeek) continue;

          for (const sched of course.schedules || []) {
            if (sched.dayOfWeek !== currentDayOfWeek) continue;
            const [h, m] = sched.startTime.split(':').map(Number);
            if (isNaN(h) || isNaN(m)) continue;
            const classMins = h * 60 + m;
            const diff = classMins - currentMinutes;

            // Trigger alert if class starts in 15 to 30 minutes
            if (diff >= 15 && diff <= 30) {
              const payload = {
                title: `🔔 Class in ${diff}m: ${course.code}`,
                body: `${course.name}\n📍 ${course.location || 'Campus'} · ${sched.startTime}–${sched.endTime}\n(Tap to preview class details)`,
                url: `/?previewType=course&previewId=${course.id}`,
                previewType: 'course',
                previewId: course.id,
                tag: `class-${course.id}-${sched.startTime}`,
              };
              for (const s of subs) {
                await sendWebPush(s, payload, env);
              }
            }
          }
        }

        // 2. Evaluate Routines and Scheduled Events
        const events = await userDb.getEvents(activeSem.id);
        for (const ev of events) {
          let isActiveToday = false;
          if (ev.type === 'routine') {
            const activeWeeksOk =
              !ev.activeWeeks ||
              ev.activeWeeks.length === 0 ||
              ev.activeWeeks.includes(currentAcademicWeek);
            const dayOk = ev.daysOfWeek?.includes(currentDayOfWeek);
            isActiveToday = activeWeeksOk && dayOk;
          } else if (ev.type === 'event') {
            const evStart = ev.specificDate || '';
            const evEnd = ev.endDate || evStart;
            isActiveToday = evStart ? (todayIso >= evStart && todayIso <= evEnd) : false;
          }

          if (!isActiveToday || ev.isAllDay) continue;

          const [h, m] = ev.startTime.split(':').map(Number);
          if (isNaN(h) || isNaN(m)) continue;
          const evMins = h * 60 + m;
          const diff = evMins - currentMinutes;

          if (diff >= 15 && diff <= 30) {
            const typeLabel = ev.type === 'routine' ? 'Routine' : 'Event';
            const payload = {
              title: `🔔 ${typeLabel} in ${diff}m: ${ev.title}`,
              body: `${ev.category ? `[${ev.category}] ` : ''}${ev.startTime}–${ev.endTime}${ev.location ? ` · ${ev.location}` : ''}\n(Tap to preview details)`,
              url: `/?previewType=${ev.type === 'routine' ? 'routine' : 'event'}&previewId=${ev.id}`,
              previewType: ev.type === 'routine' ? 'routine' : 'event',
              previewId: ev.id,
              tag: `ev-${ev.id}-${ev.startTime}`,
            };
            for (const s of subs) {
              await sendWebPush(s, payload, env);
            }
          }
        }
      }
    } catch (cronErr) {
      console.error('Scheduled cron trigger error:', cronErr);
    }
  },
};
