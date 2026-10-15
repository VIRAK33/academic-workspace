import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { WorkspaceDatabase, DatabaseEnv } from './db';

type Bindings = DatabaseEnv;

const app = new Hono<{ Bindings: Bindings }>();

app.use('*', cors());

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// --- SEMESTERS ---
app.get('/api/semesters', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const data = await db.getSemesters();
  return c.json(data);
});

app.post('/api/semesters', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const body = await c.req.json();
  const saved = await db.saveSemester(body);
  return c.json(saved);
});

app.delete('/api/semesters/:id', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const id = c.req.param('id');
  const success = await db.deleteSemester(id);
  return c.json({ success });
});

// --- TIME SLOTS ---
app.get('/api/timeslots', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const data = await db.getTimeSlots();
  return c.json(data);
});

app.put('/api/timeslots', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const body = await c.req.json();
  const saved = await db.saveTimeSlots(body);
  return c.json(saved);
});

// --- COURSES ---
app.get('/api/courses', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const semId = c.req.query('semesterId');
  const data = await db.getCourses(semId);
  return c.json(data);
});

app.post('/api/courses', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const body = await c.req.json();
  const saved = await db.saveCourse(body);
  return c.json(saved);
});

app.delete('/api/courses/:id', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const id = c.req.param('id');
  await db.deleteCourse(id);
  return c.json({ success: true, id });
});

// --- TASKS ---
app.get('/api/tasks', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const semId = c.req.query('semesterId');
  const data = await db.getTasks(semId);
  return c.json(data);
});

app.post('/api/tasks', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const body = await c.req.json();
  const saved = await db.saveTask(body);
  return c.json(saved);
});

app.delete('/api/tasks/:id', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const id = c.req.param('id');
  await db.deleteTask(id);
  return c.json({ success: true, id });
});

// --- KANBAN ---
app.get('/api/kanban', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const data = await db.getKanban();
  return c.json(data);
});

app.post('/api/kanban', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const body = await c.req.json();
  const saved = await db.saveKanban(body);
  return c.json(saved);
});

app.delete('/api/kanban/:id', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const id = c.req.param('id');
  await db.deleteKanban(id);
  return c.json({ success: true, id });
});

// --- PAPERS (LITERATURE) ---
app.get('/api/papers', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const data = await db.getPapers();
  return c.json(data);
});

app.post('/api/papers', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const body = await c.req.json();
  const saved = await db.savePaper(body);
  return c.json(saved);
});

app.delete('/api/papers/:id', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const id = c.req.param('id');
  await db.deletePaper(id);
  return c.json({ success: true, id });
});

// --- CONFERENCES ---
app.get('/api/conferences', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const data = await db.getConferences();
  return c.json(data);
});

app.post('/api/conferences', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const body = await c.req.json();
  const saved = await db.saveConference(body);
  return c.json(saved);
});

app.delete('/api/conferences/:id', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const id = c.req.param('id');
  await db.deleteConference(id);
  return c.json({ success: true, id });
});

// --- EXPERIMENTS ---
app.get('/api/experiments', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const data = await db.getExperiments();
  return c.json(data);
});

app.post('/api/experiments', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const body = await c.req.json();
  const saved = await db.saveExperiment(body);
  return c.json(saved);
});

// --- ADVISOR MEETINGS ---
app.get('/api/meetings', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const data = await db.getMeetings();
  return c.json(data);
});

app.post('/api/meetings', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const body = await c.req.json();
  const saved = await db.saveMeeting(body);
  return c.json(saved);
});

// --- 1-CLICK WEEKLY DIGEST GENERATOR ---
app.get('/api/digest', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const tasks = await db.getTasks();
  const exps = await db.getExperiments();
  const papers = await db.getPapers();

  const completedTasks = tasks.filter(t => t.status === 'completed');
  const pendingTasks = tasks.filter(t => t.status !== 'completed');
  const recentExps = exps.slice(0, 3);
  const readingPapers = papers.filter(p => p.status === 'reading' || p.status === 'read').slice(0, 3);

  const digest = [
    `# Academic Weekly Digest (${new Date().toISOString().split('T')[0]})`,
    '',
    '## 1. Accomplished This Week',
    completedTasks.length > 0
      ? completedTasks.map(t => `- [x] ${t.title} (${t.tags.join(', ')})`).join('\n')
      : '- No tasks completed this cycle.',
    '',
    '## 2. Experimental Milestones & Compute Runs',
    recentExps.length > 0
      ? recentExps.map(e => `- **${e.name}** [${e.projectTag}]: ${e.notes || e.hypothesis || 'Done'} | Metrics: ${JSON.stringify(e.metrics || {})}`).join('\n')
      : '- No experimental logs logged.',
    '',
    '## 3. Literature Synthesis',
    readingPapers.length > 0
      ? readingPapers.map(p => `- *${p.title}* (${p.venue || 'ArXiv'} ${p.year || ''}) - TL;DR: ${p.tldr || 'Reviewed'}`).join('\n')
      : '- Ongoing literature review.',
    '',
    '## 4. Next Week Commitments & Discussion Points',
    pendingTasks.slice(0, 4).map(t => `- [ ] ${t.title} (Target: ${t.dueDate})`).join('\n') || '- Refine research methodology.',
    '',
    '---\n*Generated by Academic Workspace*'
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

  // Local fallback mock
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

// --- BACKUP & RESTORE ---
app.get('/api/backup', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const all = await db.exportAll();
  return c.json(all);
});

app.post('/api/backup/restore', async (c) => {
  const db = new WorkspaceDatabase(c.env);
  const body = await c.req.json();
  await db.importAll(body);
  return c.json({ success: true });
});

export default app;
