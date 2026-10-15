#!/usr/bin/env node
import { Command } from 'commander';
import pc from 'picocolors';
import { WorkspaceDatabase } from '../src/server/db';
import { Task, Paper, ExperimentLog, ScheduleEvent } from '../src/types';

import fs from 'node:fs';
import path from 'node:path';

const program = new Command();
const db = new WorkspaceDatabase();
const STATE_FILE = path.resolve(process.cwd(), '.aw-local-state.json');
const LEGACY_STATE_FILE = path.resolve(process.cwd(), '.phd-local-state.json');

async function loadCliStore() {
  const fileToLoad = fs.existsSync(STATE_FILE) ? STATE_FILE : (fs.existsSync(LEGACY_STATE_FILE) ? LEGACY_STATE_FILE : null);
  if (fileToLoad) {
    try {
      const data = JSON.parse(fs.readFileSync(fileToLoad, 'utf-8'));
      await db.importAll(data);
    } catch (e) {}
  }
}

async function saveCliStore() {
  try {
    const data = await db.exportAll();
    fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {}
}

function parseIso(isoStr: string): Date {
  const [y, m, d] = isoStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function calculateAcademicWeek(targetIso: string, startIso: string): number {
  const target = parseIso(targetIso);
  const start = parseIso(startIso);
  const diffDays = Math.floor((target.getTime() - start.getTime()) / 86400000);
  return Math.floor(diffDays / 7) + 1;
}

function getIsoDayOfWeek(isoStr: string): number {
  const dt = parseIso(isoStr);
  const d = dt.getUTCDay();
  return d === 0 ? 7 : d;
}

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

program
  .name('aw')
  .description('Academic Workspace CLI')
  .version('1.0.0')
  .hook('preAction', async () => {
    await loadCliStore();
  });

// --- TODAY ---
program
  .command('today')
  .description("Display today's academic schedule, week counter, and due tasks")
  .action(async () => {
    const sems = await db.getSemesters();
    const activeSem = sems.find(s => s.isActive) || sems[0];
    const todayIso = new Date().toISOString().split('T')[0];
    const academicWeek = calculateAcademicWeek(todayIso, activeSem.startDate);
    const dayOfWeek = getIsoDayOfWeek(todayIso);

    console.log('');
    console.log(pc.bold(pc.bgBlue(pc.white(' 🎓 ACADEMIC COMMAND CENTER '))) + `  ${pc.bold(activeSem.name)}`);
    console.log(`${pc.cyan(DAY_NAMES[dayOfWeek])}, ${todayIso}  ·  ${pc.yellow(`Week ${academicWeek} of ${activeSem.totalWeeks}`)}`);
    console.log(pc.dim('─'.repeat(55)));

    // Classes today
    const courses = await db.getCourses(activeSem.id);
    const todayCourses: any[] = [];
    courses.forEach(c => {
      if (!c.activeWeeks.includes(academicWeek)) return;
      c.schedules.forEach(s => {
        if (s.dayOfWeek === dayOfWeek) {
          todayCourses.push({ ...c, schedule: s });
        }
      });
    });

    console.log(pc.bold('\n📚 Classes Today:'));
    if (todayCourses.length === 0) {
      console.log(pc.dim('   No classes scheduled for today. Focus on research!'));
    } else {
      todayCourses.forEach(tc => {
        console.log(`   ${pc.green('●')} ${pc.bold(tc.code)}: ${tc.name}`);
        console.log(`     ${pc.dim('Time:')} ${tc.schedule.startTime}–${tc.schedule.endTime} (S${tc.schedule.sessions.join('+')})`);
        console.log(`     ${pc.dim('Room:')} ${tc.location}${tc.teacher ? ` · Prof: ${tc.teacher}` : ''}`);
      });
    }

    // Routines & Events today
    const events = await db.getEvents(activeSem.id);
    const todayEvents: ScheduleEvent[] = [];
    events.forEach(ev => {
      if (ev.type === 'routine') {
        if (!ev.daysOfWeek.includes(dayOfWeek)) return;
        if (ev.activeWeeks && ev.activeWeeks.length > 0 && !ev.activeWeeks.includes(academicWeek)) return;
        todayEvents.push(ev);
      } else if (ev.type === 'event') {
        if (ev.specificDate === todayIso) {
          todayEvents.push(ev);
        }
      }
    });

    console.log(pc.bold('\n🔁 Routines & Events Today:'));
    if (todayEvents.length === 0) {
      console.log(pc.dim('   No routines or special events today.'));
    } else {
      todayEvents.forEach(ev => {
        const icon = ev.type === 'routine' ? pc.cyan('🔁') : pc.red('📅');
        const badge = ev.type === 'routine' ? pc.cyan('[Routine]') : pc.bold(pc.red('[Event]'));
        const timeDisplay = ev.startTime && ev.endTime ? `${ev.startTime}–${ev.endTime}` : (ev.sessions?.length ? `S${ev.sessions.join('+')}` : 'All Day');
        console.log(`   ${icon} ${pc.bold(ev.title)} ${badge}${ev.category ? ` ${pc.magenta(ev.category)}` : ''}`);
        console.log(`     ${pc.dim('Time:')} ${timeDisplay}${ev.location ? ` · ${pc.dim('Loc:')} ${ev.location}` : ''}`);
      });
    }

    // Tasks due today or urgent
    const tasks = await db.getTasks(activeSem.id);
    const urgentTasks = tasks.filter(t => t.status !== 'completed' && t.dueDate <= todayIso);

    console.log(pc.bold('\n⚡ Urgent / Due Tasks:'));
    if (urgentTasks.length === 0) {
      console.log(pc.dim('   All clear! No pending tasks due today.'));
    } else {
      urgentTasks.forEach(t => {
        console.log(`   [ ] ${pc.bold(t.title)}`);
        console.log(`       ${pc.magenta(t.tags.join(' '))} ${pc.dim(`(Due: ${t.dueDate})`)}`);
      });
    }
    console.log('');
  });

// --- EVENTS & ROUTINES ---
const eventCmd = program.command('event').description('Manage routines and scheduled events');

eventCmd
  .command('list')
  .description('List all routines and events')
  .action(async () => {
    const events = await db.getEvents();
    console.log(pc.bold(`\n📅 Scheduled Routines & Events (${events.length}):`));
    if (events.length === 0) {
      console.log(pc.dim('   No routines or events found.'));
    } else {
      events.forEach(ev => {
        const icon = ev.type === 'routine' ? pc.cyan('🔁') : pc.red('📅');
        const typeStr = ev.type === 'routine' ? pc.cyan('[Routine]') : pc.red('[Event]');
        const timeStr = ev.startTime && ev.endTime ? `${ev.startTime}–${ev.endTime}` : (ev.sessions?.length ? `S${ev.sessions.join('+')}` : '');
        const daysStr = ev.type === 'routine' 
          ? ev.daysOfWeek.map(d => DAY_NAMES[d].slice(0, 3)).join(', ') 
          : ev.specificDate;
        console.log(` ${icon} [${pc.cyan(ev.id)}] ${pc.bold(ev.title)} ${typeStr}${ev.category ? ` ${pc.magenta(ev.category)}` : ''}`);
        console.log(`   ${pc.dim('When:')} ${daysStr}${timeStr ? ` · ${timeStr}` : ''}${ev.location ? ` · ${ev.location}` : ''}`);
      });
    }
    console.log('');
  });

// --- TASKS ---
const taskCmd = program.command('task').description('Manage research and coursework tasks');

taskCmd
  .command('list')
  .description('List tasks')
  .option('-p, --pending', 'Show only open/pending tasks', false)
  .option('-a, --archived', 'Show only archived historical tasks', false)
  .option('--all', 'Show all tasks including archived', false)
  .option('-t, --tag <tag>', 'Filter by tag')
  .action(async (opts) => {
    let tasks = await db.getTasks();

    if (opts.archived) {
      tasks = tasks.filter(t => t.status === 'archived');
      console.log(pc.bold(`\n📦 Archived Task History (${tasks.length} tasks):`));
    } else if (opts.pending) {
      tasks = tasks.filter(t => t.status === 'in_progress');
      console.log(pc.bold(`\n📝 Open Tasks (${tasks.length} tasks):`));
    } else if (opts.all) {
      console.log(pc.bold(`\n📝 All Tasks (${tasks.length} tasks):`));
    } else {
      // Default: active tasks (open + recently completed), hiding archived
      tasks = tasks.filter(t => t.status !== 'archived');
      console.log(pc.bold(`\n📝 Active Tasks (${tasks.length} tasks):`));
    }

    if (opts.tag) tasks = tasks.filter(t => t.tags.includes(opts.tag));

    if (tasks.length === 0) {
      console.log(pc.dim('   No tasks found for current criteria.'));
    } else {
      tasks.forEach(t => {
        let mark = pc.yellow('○');
        if (t.status === 'completed') mark = pc.green('✔');
        if (t.status === 'archived') mark = pc.dim('📦');

        const title = t.status === 'in_progress' ? pc.white(t.title) : pc.dim(pc.strikethrough(t.title));
        console.log(` ${mark} [${pc.cyan(t.id)}] ${title}`);
        console.log(`   ${pc.dim('Due:')} ${t.dueDate}  ${pc.magenta(t.tags.join(' '))}${t.archivedAt ? pc.dim(` (Archived: ${t.archivedAt.split('T')[0]})`) : ''}`);
      });
    }
    console.log('');
  });

taskCmd
  .command('add <title>')
  .description('Add a new task')
  .option('-d, --due <date>', 'Due date (YYYY-MM-DD or "today" / "tomorrow")', 'today')
  .option('-t, --tag <tag>', 'Tag e.g. #Research', '#Research')
  .action(async (title, opts) => {
    let dueDate = opts.due;
    const now = new Date();
    if (opts.due === 'today') dueDate = now.toISOString().split('T')[0];
    else if (opts.due === 'tomorrow') {
      now.setDate(now.getDate() + 1);
      dueDate = now.toISOString().split('T')[0];
    }

    const newTask: Task = {
      id: 't_' + Date.now().toString(36),
      title,
      category: opts.tag.includes('#Class') ? 'Coursework' : 'Research',
      tags: [opts.tag],
      dueDate,
      status: 'in_progress',
      priority: 'high',
    };
    await db.saveTask(newTask);
    await saveCliStore();
    console.log(pc.green(`✔ Task created: [${newTask.id}] "${title}" (Due: ${dueDate})`));
  });

taskCmd
  .command('done <id>')
  .description('Mark task as completed')
  .action(async (id) => {
    const tasks = await db.getTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) {
      console.log(pc.red(`Task ${id} not found.`));
      return;
    }
    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    await db.saveTask(task);
    await saveCliStore();
    console.log(pc.green(`✔ Marked task [${id}] "${task.title}" as completed!`));
  });

taskCmd
  .command('archive [id]')
  .description('Archive a specific task or sweep all completed tasks')
  .action(async (id) => {
    const tasks = await db.getTasks();
    const nowIso = new Date().toISOString();

    if (id) {
      const task = tasks.find(t => t.id === id);
      if (!task) {
        console.log(pc.red(`Task ${id} not found.`));
        return;
      }
      task.status = 'archived';
      task.archivedAt = nowIso;
      await db.saveTask(task);
      await saveCliStore();
      console.log(pc.green(`✔ Archived task [${id}] "${task.title}"`));
      return;
    }

    const completed = tasks.filter(t => t.status === 'completed');
    if (completed.length === 0) {
      console.log(pc.yellow('No completed tasks to archive.'));
      return;
    }

    for (const t of completed) {
      t.status = 'archived';
      t.archivedAt = nowIso;
      await db.saveTask(t);
    }
    await saveCliStore();
    console.log(pc.green(`✔ Swept and archived ${completed.length} completed task(s)!`));
  });

taskCmd
  .command('unarchive <id>')
  .description('Restore an archived task back to active')
  .action(async (id) => {
    const tasks = await db.getTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) {
      console.log(pc.red(`Task ${id} not found.`));
      return;
    }
    task.status = 'in_progress';
    task.archivedAt = undefined;
    await db.saveTask(task);
    await saveCliStore();
    console.log(pc.green(`✔ Restored task [${id}] "${task.title}" to active!`));
  });

// --- PAPERS ---
const paperCmd = program.command('paper').description('Manage literature, BibTeX, and papers');

paperCmd
  .command('list')
  .description('List papers in reading queue')
  .action(async () => {
    const papers = await db.getPapers();
    console.log(pc.bold(`\n📖 Research Papers & Reading Queue (${papers.length}):`));
    papers.forEach(p => {
      const statusBadge = p.status === 'read' ? pc.green('[READ]') : pc.yellow('[TO READ]');
      console.log(` ${statusBadge} ${pc.bold(p.title)}`);
      console.log(`   ${pc.dim('Venue:')} ${p.venue || 'ArXiv'} ${p.year || ''}  ${pc.cyan(`(ID: ${p.id})`)}`);
      if (p.tldr) console.log(`   ${pc.dim('TL;DR:')} ${p.tldr}`);
    });
    console.log('');
  });

paperCmd
  .command('add <title>')
  .description('Add a new paper to reading list')
  .option('-a, --authors <authors>', 'Authors list')
  .option('-v, --venue <venue>', 'Venue (e.g. NeurIPS 2025)')
  .option('-y, --year <year>', 'Year', String(new Date().getFullYear()))
  .option('--arxiv <id>', 'ArXiv ID')
  .option('--tldr <tldr>', 'Quick summary')
  .action(async (title, opts) => {
    const newPaper: Paper = {
      id: 'p_' + Date.now().toString(36),
      title,
      authors: opts.authors,
      venue: opts.venue,
      year: parseInt(opts.year, 10),
      arxivId: opts.arxiv,
      tldr: opts.tldr,
      status: 'to_read',
      rating: 4,
      tags: ['#Literature'],
    };
    await db.savePaper(newPaper);
    await saveCliStore();
    console.log(pc.green(`✔ Paper added to reading list: [${newPaper.id}] "${title}"`));
  });

paperCmd
  .command('bibtex <id>')
  .description('Print BibTeX citation for a paper')
  .action(async (id) => {
    const papers = await db.getPapers();
    const paper = papers.find(p => p.id === id);
    if (!paper) {
      console.log(pc.red(`Paper ${id} not found.`));
      return;
    }
    console.log(paper.bibtex || `@misc{${paper.id},\n  title={${paper.title}},\n  author={${paper.authors || 'Unknown'}},\n  year={${paper.year || 2026}}\n}`);
  });

// --- EXPERIMENTS ---
const expCmd = program.command('exp').description('Log and track ML/scientific experiment runs');

expCmd
  .command('list')
  .description('List recent experiment logs')
  .action(async () => {
    const exps = await db.getExperiments();
    console.log(pc.bold(`\n🔬 Experiment Run Logs (${exps.length}):`));
    exps.forEach(e => {
      console.log(` ● ${pc.bold(e.name)} [${pc.magenta(e.projectTag)}]`);
      console.log(`   ${pc.dim('Dataset:')} ${e.dataset || 'N/A'}  ${pc.dim('Metrics:')} ${JSON.stringify(e.metrics || {})}`);
      if (e.notes) console.log(`   ${pc.dim('Notes:')} ${e.notes}`);
    });
    console.log('');
  });

expCmd
  .command('log')
  .description('Record an experiment run (ideal for ML training scripts)')
  .requiredOption('-n, --name <name>', 'Run name e.g. "Ablation-Attn-k16"')
  .option('-p, --project <project>', 'Project tag', 'Research')
  .option('-d, --dataset <dataset>', 'Dataset used')
  .option('--metric <keyval...>', 'Metrics in key=val format e.g. f1=88.4')
  .option('--notes <notes>', 'Key findings')
  .action(async (opts) => {
    const metrics: Record<string, any> = {};
    if (opts.metric) {
      opts.metric.forEach((kv: string) => {
        const [k, v] = kv.split('=');
        metrics[k] = isNaN(Number(v)) ? v : Number(v);
      });
    }

    const exp: ExperimentLog = {
      id: 'exp_' + Date.now().toString(36),
      name: opts.name,
      projectTag: opts.project,
      dataset: opts.dataset,
      metrics,
      status: 'completed',
      notes: opts.notes,
    };
    await db.saveExperiment(exp);
    await saveCliStore();
    console.log(pc.green(`✔ Experiment run logged: [${exp.name}] Metrics: ${JSON.stringify(metrics)}`));
  });

// --- CONFERENCES ---
program
  .command('conf')
  .description('Show countdowns to upcoming academic conference and journal deadlines')
  .action(async () => {
    const confs = await db.getConferences();
    const now = new Date();
    console.log(pc.bold('\n⏰ Upcoming Conference Deadlines:'));
    confs.forEach(c => {
      const target = parseIso(c.submissionDeadline);
      const diffDays = Math.ceil((target.getTime() - now.getTime()) / 86400000);
      const countdown = diffDays > 0 ? pc.yellow(`D-${diffDays} days`) : pc.red('PASSED');
      console.log(` 🏆 ${pc.bold(c.acronym)} (${c.name})`);
      console.log(`    ${pc.bold(countdown)} · Deadline: ${c.submissionDeadline} [Tier: ${c.tier || 'Core A*'}]`);
      if (c.paperTitle) console.log(`    ${pc.dim('Target Paper:')} "${c.paperTitle}"`);
    });
    console.log('');
  });

// --- DIGEST ---
program
  .command('digest')
  .description('Generate weekly progress report in Markdown for your advisor')
  .action(async () => {
    const tasks = await db.getTasks();
    const exps = await db.getExperiments();
    const papers = await db.getPapers();

    const done = tasks.filter(t => t.status === 'completed');
    const pending = tasks.filter(t => t.status !== 'completed');

    console.log(`
# Academic Weekly Digest (${new Date().toISOString().split('T')[0]})

## 1. Accomplished This Week
${done.length > 0 ? done.map(t => `- [x] ${t.title} (${t.tags.join(', ')})`).join('\n') : '- No tasks marked completed.'}

## 2. Experimental Results & Compute Runs
${exps.length > 0 ? exps.slice(0, 3).map(e => `- **${e.name}** [${e.projectTag}]: Metrics: ${JSON.stringify(e.metrics || {})} (${e.notes || 'Done'})`).join('\n') : '- In progress.'}

## 3. Literature Synthesis
${papers.slice(0, 3).map(p => `- *${p.title}* (${p.venue || 'ArXiv'}) - TL;DR: ${p.tldr || 'Read'}`).join('\n')}

## 4. Next Week Commitments & Discussion Points
${pending.slice(0, 4).map(t => `- [ ] ${t.title} (Target: ${t.dueDate})`).join('\n') || '- Refine experimental setup.'}

---
*Generated by aw CLI*
`);
  });

// --- MODE ---
program
  .command('mode [preset]')
  .description('View or switch workspace mode (basic | research)')
  .action(async (preset) => {
    if (!preset) {
      console.log(pc.bold('\n🎓 Workspace Mode Presets:'));
      console.log(` • ${pc.cyan('basic')}: Student Essentials (Schedule, Timetable & Matrix, Tasks)`);
      console.log(` • ${pc.cyan('research')}: Advanced Suite (+ Pipeline, Literature, Advisor, Conferences, Experiments)`);
      console.log(`\nRun ${pc.green('aw mode basic')} or ${pc.green('aw mode research')} to toggle.\n`);
      return;
    }
    const mode = preset.toLowerCase();
    if (mode === 'basic' || mode === 'student') {
      console.log(pc.green('✔ Mode set: Basic Student (Schedule, Timetable, Tasks).'));
    } else if (mode === 'research' || mode === 'phd' || mode === 'full') {
      console.log(pc.green('✔ Mode set: Advanced Mode (All 8 views unlocked).'));
    } else {
      console.log(pc.red(`Unknown mode "${preset}". Available options: "basic" or "research".`));
    }
  });

program.parse(process.argv);
