import React, { useState, useMemo } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { X, Sparkles, Copy, Check, AlertCircle, Calendar, Clock, BookOpen, Layers, ArrowRight, FileText } from 'lucide-react';
import { Semester, TimeSlot, Course, CourseSchedule } from '../../../types';
import { api } from '../../api';

interface AiScheduleImportModalProps {
  ws: ReturnType<typeof useWorkspace>;
  isOpen: boolean;
  onClose: () => void;
}

export const AI_TIMETABLE_PROMPT_TEMPLATE = `You are an academic schedule extraction assistant.
I have provided a photo, screenshot, PDF text, or syllabus of my university class timetable and session bell schedule.

Please extract my academic schedule and output ONLY a single valid JSON object matching this exact structure:

{
  "semester": {
    "name": "2026-2027 Fall",
    "startDate": "2026-09-14",
    "totalWeeks": 19
  },
  "timeSlots": [
    { "session": "1-2", "startTime": "08:25", "endTime": "10:00", "displayOrder": 1 },
    { "session": "3-4", "startTime": "10:25", "endTime": "12:00", "displayOrder": 2 },
    { "session": "5-6", "startTime": "14:30", "endTime": "16:05", "displayOrder": 3 },
    { "session": "7-8", "startTime": "16:30", "endTime": "18:05", "displayOrder": 4 },
    { "session": "9-10", "startTime": "19:30", "endTime": "21:10", "displayOrder": 5 }
  ],
  "courses": [
    {
      "code": "CS801",
      "name": "Foundations of Deep Learning",
      "teacher": "Prof. Alan Turing",
      "location": "Turing Hall 101",
      "color": "#2563EB",
      "activeWeeks": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
      "schedules": [
        {
          "dayOfWeek": 1,
          "sessions": ["5-6", "7-8"],
          "startTime": "14:30",
          "endTime": "18:05"
        },
        {
          "dayOfWeek": 3,
          "sessions": ["5-6"],
          "startTime": "14:30",
          "endTime": "16:05"
        }
      ]
    }
  ]
}

Extraction Rules:
1. dayOfWeek must be an integer: 1 = Monday, 2 = Tuesday, 3 = Wednesday, 4 = Thursday, 5 = Friday, 6 = Saturday, 7 = Sunday.
2. If a course meets multiple times per week (e.g. Mon and Wed), include each meeting day under the "schedules" array.
3. If specific weeks are specified (e.g., "Weeks 1-12", "odd weeks"), convert them into a number array for "activeWeeks". If all semester, use [1, 2, ... totalWeeks].
4. If session time slots / bell schedules are listed on the timetable (e.g., Session 1-2 is 08:25-10:00), populate the "timeSlots" array accordingly.
5. If the exact semester start date is not explicitly visible, estimate based on the term start month or use the nearest Monday.
6. Choose distinct aesthetic HEX badge colors for courses (e.g., #2563EB, #7C3AED, #059669, #D97706, #E11D48).
7. Output RAW JSON ONLY. Do not wrap in conversational chatter or explanation.`;

const SAMPLE_DEMO_JSON = `{
  "semester": {
    "name": "2026-2027 Fall",
    "startDate": "2026-09-14",
    "totalWeeks": 19
  },
  "timeSlots": [
    { "session": "1-2", "startTime": "08:25", "endTime": "10:00", "displayOrder": 1 },
    { "session": "3-4", "startTime": "10:25", "endTime": "12:00", "displayOrder": 2 },
    { "session": "5-6", "startTime": "14:30", "endTime": "16:05", "displayOrder": 3 },
    { "session": "7-8", "startTime": "16:30", "endTime": "18:05", "displayOrder": 4 },
    { "session": "9-10", "startTime": "19:30", "endTime": "21:10", "displayOrder": 5 }
  ],
  "courses": [
    {
      "code": "CS801",
      "name": "Foundations of Deep Learning",
      "teacher": "Prof. Alan Turing",
      "location": "Turing Hall 101",
      "color": "#2563EB",
      "activeWeeks": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
      "schedules": [
        { "dayOfWeek": 1, "sessions": ["5-6", "7-8"], "startTime": "14:30", "endTime": "18:05" },
        { "dayOfWeek": 3, "sessions": ["5-6"], "startTime": "14:30", "endTime": "16:05" }
      ]
    },
    {
      "code": "CS820",
      "name": "Research Methodologies & Scientific Communication",
      "teacher": "Prof. Grace Hopper",
      "location": "Hopper Hall 204",
      "color": "#7C3AED",
      "activeWeeks": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      "schedules": [
        { "dayOfWeek": 4, "sessions": ["5-6", "7-8"], "startTime": "14:30", "endTime": "18:05" }
      ]
    },
    {
      "code": "MATH701",
      "name": "Statistical Learning & High-Dimensional Inference",
      "teacher": "Dr. Claude Shannon",
      "location": "Math Building 305",
      "color": "#059669",
      "activeWeeks": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      "schedules": [
        { "dayOfWeek": 2, "sessions": ["3-4"], "startTime": "10:25", "endTime": "12:00" },
        { "dayOfWeek": 4, "sessions": ["1-2"], "startTime": "08:25", "endTime": "10:00" }
      ]
    }
  ]
}`;

export const AiScheduleImportModal: React.FC<AiScheduleImportModalProps> = ({ ws, isOpen, onClose }) => {
  const { viewedSemester, showToast, refreshData, setViewedSemesterId } = ws;

  const [inputJson, setInputJson] = useState('');
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showPromptDetails, setShowPromptDetails] = useState(false);
  const [importOption, setImportOption] = useState<'new_semester' | 'replace_current'>('new_semester');
  const [isImporting, setIsImporting] = useState(false);

  // Copy AI prompt to clipboard
  const handleCopyPrompt = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(AI_TIMETABLE_PROMPT_TEMPLATE);
        setCopiedPrompt(true);
        showToast('AI Prompt copied to clipboard!');
        setTimeout(() => setCopiedPrompt(false), 2500);
      }
    } catch (err) {
      showToast('Could not auto-copy. Please select and copy manually.');
    }
  };

  // Paste from clipboard helper
  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard) {
        const text = await navigator.clipboard.readText();
        if (text) setInputJson(text);
      }
    } catch (err) {
      showToast('Clipboard access not granted. Please paste directly into the box.');
    }
  };

  // Parse & validate JSON dynamically
  const parseResult = useMemo(() => {
    const raw = inputJson.trim();
    if (!raw) return { valid: false, error: null, data: null };

    // Strip markdown code fences if user copied ```json ... ```
    let clean = raw;
    if (clean.startsWith('```')) {
      clean = clean.replace(/^```[a-zA-Z]*\n?/, '').replace(/\n?```$/, '').trim();
    }

    try {
      const parsed = JSON.parse(clean);
      if (typeof parsed !== 'object' || parsed === null) {
        return { valid: false, error: 'JSON must be an object with semester, timeSlots, or courses.', data: null };
      }

      const courses = Array.isArray(parsed.courses) ? parsed.courses : [];
      const timeSlots = Array.isArray(parsed.timeSlots) ? parsed.timeSlots : [];
      const semester = parsed.semester || null;

      if (courses.length === 0 && !semester && timeSlots.length === 0) {
        return { valid: false, error: 'No semester, timeSlots, or courses detected in JSON.', data: null };
      }

      return {
        valid: true,
        error: null,
        data: {
          semester,
          timeSlots,
          courses,
        },
      };
    } catch (e: any) {
      return { valid: false, error: `Invalid JSON syntax: ${e.message}`, data: null };
    }
  }, [inputJson]);

  if (!isOpen) return null;

  // Execute Import
  const handleApplyImport = async () => {
    if (!parseResult.valid || !parseResult.data) return;

    setIsImporting(true);
    try {
      const { semester: parsedSem, timeSlots: parsedSlots, courses: parsedCourses } = parseResult.data;

      let targetSemesterId = viewedSemester.id;

      // 1. Handle Semester
      if (importOption === 'new_semester') {
        const newSemId = 'sem_' + Date.now().toString(36);
        const newSem: Semester = {
          id: newSemId,
          name: parsedSem?.name || `Academic Term ${new Date().getFullYear()}`,
          startDate: parsedSem?.startDate || '2026-09-14',
          totalWeeks: Number(parsedSem?.totalWeeks) || 19,
          isActive: true,
          isArchived: false,
        };
        await api.saveSemester(newSem);
        targetSemesterId = newSemId;
      } else {
        // Update current viewed semester if details were provided
        if (parsedSem) {
          const updated: Semester = {
            ...viewedSemester,
            name: parsedSem.name || viewedSemester.name,
            startDate: parsedSem.startDate || viewedSemester.startDate,
            totalWeeks: Number(parsedSem.totalWeeks) || viewedSemester.totalWeeks,
          };
          await api.saveSemester(updated);
        }
      }

      // 2. Handle Time Slots (if provided)
      if (parsedSlots && parsedSlots.length > 0) {
        const slotsToSave: TimeSlot[] = parsedSlots.map((s: any, idx: number) => ({
          session: String(s.session || `${idx * 2 + 1}-${idx * 2 + 2}`),
          startTime: String(s.startTime || '08:00'),
          endTime: String(s.endTime || '09:35'),
          displayOrder: s.displayOrder || idx + 1,
        }));
        await api.saveTimeSlots(slotsToSave);
      }

      // 3. Handle Courses
      if (parsedCourses && parsedCourses.length > 0) {
        // If replace current, first remove old courses belonging to target semester
        if (importOption === 'replace_current') {
          const existingCourses = await api.getCourses(targetSemesterId);
          for (const oldC of existingCourses) {
            await api.deleteCourse(oldC.id);
          }
        }

        // Save each parsed course
        for (let i = 0; i < parsedCourses.length; i++) {
          const pc = parsedCourses[i];
          const courseId = `c_${targetSemesterId}_${(pc.code || 'CRS').toLowerCase().replace(/[^a-z0-9]/g, '')}_${i}`;

          // Format schedules array
          const rawSchedules = Array.isArray(pc.schedules) ? pc.schedules : [];
          const schedules: CourseSchedule[] = rawSchedules.map((sch: any, sIdx: number) => ({
            id: `sch_${courseId}_${sIdx}`,
            courseId,
            dayOfWeek: Number(sch.dayOfWeek) || 1,
            sessions: Array.isArray(sch.sessions) ? sch.sessions.map(String) : ['1-2'],
            startTime: String(sch.startTime || '08:25'),
            endTime: String(sch.endTime || '10:00'),
          }));

          const courseToSave: Course = {
            id: courseId,
            semesterId: targetSemesterId,
            code: String(pc.code || `CRS${i + 1}`).toUpperCase(),
            name: String(pc.name || 'Untitled Course'),
            teacher: pc.teacher || 'Faculty Instructor',
            location: pc.location || 'TBD',
            color: pc.color || ['#2563EB', '#7C3AED', '#059669', '#D97706', '#E11D48', '#4F46E5'][i % 6],
            activeWeeks: Array.isArray(pc.activeWeeks) && pc.activeWeeks.length > 0
              ? pc.activeWeeks.map(Number)
              : Array.from({ length: parsedSem?.totalWeeks || viewedSemester.totalWeeks || 19 }, (_, k) => k + 1),
            schedules: schedules.length > 0 ? schedules : [
              {
                id: `sch_${courseId}_0`,
                courseId,
                dayOfWeek: 1,
                sessions: ['1-2'],
                startTime: '08:25',
                endTime: '10:00',
              }
            ],
          };

          await api.saveCourse(courseToSave);
        }
      }

      await refreshData();
      setViewedSemesterId(targetSemesterId);
      showToast(`Successfully imported schedule (${parsedCourses.length} courses)!`);
      onClose();
    } catch (err: any) {
      showToast(`Import error: ${err.message || 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const dayLabels = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85dvh] sm:max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center shadow-xs shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 sm:gap-2">
                <span>AI Schedule & Timetable Importer</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                  Zero Entry
                </span>
              </h2>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                Extract university timetables & session timeslots via AI.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* Step 1: Copy AI Prompt */}
          <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center text-[11px] font-bold">
                  1
                </span>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Copy the Extraction Prompt for ChatGPT / Gemini / Claude
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowPromptDetails(!showPromptDetails)}
                className="text-[11px] font-medium text-slate-700 dark:text-slate-300 hover:underline"
              >
                {showPromptDetails ? 'Hide Template' : 'View Template'}
              </button>
            </div>

            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Open <strong>ChatGPT, Claude, or Google Gemini</strong>, attach your physical timetable photo or syllabus PDF, and paste this prompt:
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyPrompt}
                className="px-3.5 py-1.5 rounded-md bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-medium flex items-center gap-1.5 shadow-xs transition"
              >
                {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPrompt ? 'Copied Prompt to Clipboard!' : 'Copy AI Prompt Template'}</span>
              </button>

              <button
                type="button"
                onClick={() => setInputJson(SAMPLE_DEMO_JSON)}
                className="px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium transition"
              >
                Try Sample Data
              </button>
            </div>

            {/* Collapsible Prompt Preview */}
            {showPromptDetails && (
              <div className="mt-2 p-2.5 rounded bg-slate-900 text-slate-200 text-[10px] font-mono leading-relaxed overflow-x-auto max-h-40 border border-slate-800">
                <pre>{AI_TIMETABLE_PROMPT_TEMPLATE}</pre>
              </div>
            )}
          </div>

          {/* Step 2: Paste AI Output JSON */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 flex items-center justify-center text-[11px] font-bold">
                  2
                </span>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Paste the JSON Returned by the AI
                </span>
              </div>
              <button
                type="button"
                onClick={handlePasteClipboard}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
              >
                <FileText className="w-3 h-3" />
                <span>Paste from Clipboard</span>
              </button>
            </div>

            <textarea
              rows={6}
              value={inputJson}
              onChange={(e) => setInputJson(e.target.value)}
              placeholder="Paste the extracted JSON block here (e.g. { &quot;semester&quot;: { ... }, &quot;courses&quot;: [ ... ] })..."
              className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono text-[11px] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 dark:focus:ring-white"
            />
          </div>

          {/* Step 3: Verification & Pre-flight Preview */}
          {inputJson.trim() && (
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 flex items-center justify-center text-[11px] font-bold">
                  3
                </span>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Pre-Flight Schedule Verification
                </span>
              </div>

              {!parseResult.valid ? (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">JSON Validation Issue</div>
                    <div className="text-[11px] mt-0.5 font-mono">{parseResult.error}</div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 p-3.5 space-y-3">
                  {/* Summary Pills */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-700 dark:text-slate-300 shrink-0" />
                      <div className="truncate">
                        <div className="text-[10px] font-mono uppercase text-slate-400">Term</div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {parseResult.data?.semester?.name || 'Default Term'}
                        </div>
                      </div>
                    </div>

                    <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                      <div>
                        <div className="text-[10px] font-mono uppercase text-slate-400">Session Slots</div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {parseResult.data?.timeSlots?.length || 0} time periods
                        </div>
                      </div>
                    </div>

                    <div className="p-2 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <div className="text-[10px] font-mono uppercase text-slate-400">Courses</div>
                        <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {parseResult.data?.courses?.length || 0} classes detected
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Course list preview */}
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                      Detected Courses & Meeting Times:
                    </div>
                    <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {parseResult.data?.courses?.map((c: any, idx: number) => (
                        <div
                          key={idx}
                          className="p-2 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: c.color || '#2563EB' }}
                            />
                            <div className="truncate">
                              <span className="font-mono font-semibold text-slate-900 dark:text-white mr-2">
                                {c.code || `CRS-${idx + 1}`}
                              </span>
                              <span className="text-slate-600 dark:text-slate-300 truncate">
                                {c.name || 'Untitled'}
                              </span>
                            </div>
                          </div>

                          <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 shrink-0 text-right ml-2">
                            {Array.isArray(c.schedules) && c.schedules.length > 0 ? (
                              c.schedules.map((s: any, sIdx: number) => (
                                <span key={sIdx} className="inline-block ml-1">
                                  {dayLabels[s.dayOfWeek] || 'Day'}: {s.startTime}-{s.endTime}
                                </span>
                              ))
                            ) : (
                              <span>No times</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Step 4: Import Destination Mode */}
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                      Import Destination:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <label className={`p-2.5 rounded-lg border cursor-pointer flex items-start gap-2 transition ${
                        importOption === 'new_semester'
                          ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800/80 ring-1 ring-slate-900/20 dark:ring-white/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}>
                        <input
                          type="radio"
                          name="importOption"
                          checked={importOption === 'new_semester'}
                          onChange={() => setImportOption('new_semester')}
                          className="mt-0.5 accent-slate-900 dark:accent-white text-slate-900 focus:ring-slate-900"
                        />
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            Create New Active Semester
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Archives existing terms and activates this newly imported schedule.
                          </div>
                        </div>
                      </label>

                      <label className={`p-2.5 rounded-lg border cursor-pointer flex items-start gap-2 transition ${
                        importOption === 'replace_current'
                          ? 'border-slate-900 dark:border-white bg-slate-100 dark:bg-slate-800/80 ring-1 ring-slate-900/20 dark:ring-white/20'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                      }`}>
                        <input
                          type="radio"
                          name="importOption"
                          checked={importOption === 'replace_current'}
                          onChange={() => setImportOption('replace_current')}
                          className="mt-0.5 accent-slate-900 dark:accent-white text-slate-900 focus:ring-slate-900"
                        />
                        <div>
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            Apply to {viewedSemester.name}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Replaces courses and timetable in the currently selected term.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 sm:px-5 sm:py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!parseResult.valid || isImporting}
            onClick={handleApplyImport}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition ${
              parseResult.valid && !isImporting
                ? 'bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 shadow-xs cursor-pointer'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {isImporting
                ? 'Importing...'
                : `Import ${parseResult.data?.courses?.length || 0} Courses & Schedule`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
