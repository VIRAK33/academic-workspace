import { WorkspaceData } from '../types';

export const defaultWorkspaceData: WorkspaceData = {
  semesters: [
    {
      id: 'sem_2026_fall',
      name: '2026-2027 Fall',
      startDate: '2026-09-14',
      totalWeeks: 19,
      isActive: true,
      isArchived: false
    },
    {
      id: 'sem_2026_spring',
      name: '2025-2026 Spring',
      startDate: '2026-03-02',
      totalWeeks: 19,
      isActive: false,
      isArchived: true
    },
    {
      id: 'sem_2025_fall',
      name: '2025-2026 Fall',
      startDate: '2025-09-15',
      totalWeeks: 19,
      isActive: false,
      isArchived: true
    }
  ],

  timeSlots: [
    { session: '1-2', startTime: '08:25', endTime: '10:00', displayOrder: 1 },
    { session: '3-4', startTime: '10:25', endTime: '12:00', displayOrder: 2 },
    { session: '5-6', startTime: '14:30', endTime: '16:05', displayOrder: 3 },
    { session: '7-8', startTime: '16:30', endTime: '18:05', displayOrder: 4 },
    { session: '9-10', startTime: '19:30', endTime: '21:10', displayOrder: 5 }
  ],

  courses: [
    {
      id: 'c_cs801_deep_learning',
      semesterId: 'sem_2026_fall',
      code: 'CS801',
      name: 'Foundations of Deep Learning',
      teacher: 'Prof. Alan Turing',
      location: 'Turing Hall 101',
      color: '#2563EB',
      activeWeeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
      schedules: [
        { dayOfWeek: 1, sessions: ['5-6', '7-8'], startTime: '14:30', endTime: '18:05' },
        { dayOfWeek: 3, sessions: ['5-6'], startTime: '14:30', endTime: '16:05' }
      ]
    },
    {
      id: 'c_cs820_research_methods',
      semesterId: 'sem_2026_fall',
      code: 'CS820',
      name: 'Research Methodologies & Scientific Communication',
      teacher: 'Prof. Grace Hopper',
      location: 'Hopper Hall 204',
      color: '#7C3AED',
      activeWeeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      schedules: [
        { dayOfWeek: 4, sessions: ['5-6', '7-8'], startTime: '14:30', endTime: '18:05' }
      ]
    },
    {
      id: 'c_algo_design',
      semesterId: 'sem_2026_fall',
      code: 'CS840',
      name: 'Advanced Algorithm Design & Complexity',
      teacher: 'Prof. Donald Knuth',
      location: 'Science Complex 402',
      color: '#D97706',
      activeWeeks: [1, 2, 3, 4, 9, 10, 11, 12, 13, 14],
      schedules: [
        { dayOfWeek: 1, sessions: ['1-2', '3-4'], startTime: '08:25', endTime: '12:00' }
      ]
    },
    {
      id: 'c_stat_learning',
      semesterId: 'sem_2026_fall',
      code: 'MATH701',
      name: 'Statistical Learning & High-Dimensional Inference',
      teacher: 'Dr. Claude Shannon',
      location: 'Math Building 305',
      color: '#059669',
      activeWeeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      schedules: [
        { dayOfWeek: 2, sessions: ['3-4'], startTime: '10:25', endTime: '12:00' },
        { dayOfWeek: 4, sessions: ['1-2'], startTime: '08:25', endTime: '10:00' }
      ]
    },
    {
      id: 'c_phd_seminar',
      semesterId: 'sem_2026_fall',
      code: 'RES890',
      name: 'Advanced Research Lab Seminar',
      teacher: 'Prof. Margaret Hamilton',
      location: 'Computing Lab 12',
      color: '#4F46E5',
      activeWeeks: [1, 3, 5, 6, 7, 9, 11, 13, 15, 17],
      schedules: [
        { dayOfWeek: 3, sessions: ['9-10'], startTime: '19:30', endTime: '21:10' },
        { dayOfWeek: 5, sessions: ['5-6'], startTime: '14:30', endTime: '16:05' }
      ]
    }
  ],

  events: [
    {
      id: 'ev_gym',
      semesterId: 'sem_2026_fall',
      title: 'Morning Gym & Cardio Routine',
      type: 'routine',
      category: 'Fitness',
      daysOfWeek: [1, 3, 5],
      startTime: '07:00',
      endTime: '08:00',
      location: 'Campus Fitness Center',
      notes: 'Cardio & core workout before morning lectures',
      color: '#059669',
      activeWeeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
    },
    {
      id: 'ev_study_block',
      semesterId: 'sem_2026_fall',
      title: 'Library Deep Work Focus Block',
      type: 'routine',
      category: 'Study',
      daysOfWeek: [2, 4],
      sessions: ['9-10'],
      startTime: '19:30',
      endTime: '21:10',
      location: 'Science & Engineering Library 3F',
      notes: 'Weekly problem sets and literature synthesis',
      color: '#6366F1',
      activeWeeks: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]
    },
    {
      id: 'ev_midterm',
      semesterId: 'sem_2026_fall',
      title: 'MATH701 Midterm Examination',
      type: 'event',
      category: 'Exam',
      daysOfWeek: [4],
      specificDate: '2026-10-22',
      startTime: '08:25',
      endTime: '10:00',
      location: 'Math Hall 305',
      notes: 'Covers High-Dimensional Inference proofs & problem sets 1-3. Bring scientific calculator.',
      color: '#DC2626'
    }
  ],

  tasks: [
    {
      id: 't0',
      semesterId: 'sem_2026_fall',
      title: 'Finish Literature Review section for Graph-RAG',
      category: 'Research',
      tags: ['#Research', '#Paper'],
      dueDate: '2026-10-15',
      status: 'completed',
      priority: 'high'
    },
    {
      id: 't1',
      semesterId: 'sem_2026_fall',
      title: 'Complete the research proposal draft',
      category: 'Research',
      tags: ['#Research', '#Paper'],
      dueDate: '2026-10-15',
      status: 'in_progress',
      priority: 'high'
    },
    {
      id: 't2',
      semesterId: 'sem_2026_fall',
      title: 'Review lecture notes & proofs for CS820 Research Methodologies',
      category: 'Coursework',
      tags: ['#Class'],
      dueDate: '2026-10-15',
      status: 'in_progress',
      priority: 'medium'
    },
    {
      id: 't3',
      semesterId: 'sem_2026_fall',
      title: 'Submit finalized research proposal PDF to supervisor',
      category: 'Research',
      tags: ['#Research'],
      dueDate: '2026-10-16',
      status: 'in_progress',
      priority: 'high'
    },
    {
      id: 't4',
      semesterId: 'sem_2026_fall',
      title: 'Complete problem set 3 for CS801 Deep Learning Foundations',
      category: 'Coursework',
      tags: ['#Class'],
      dueDate: '2026-10-19',
      status: 'in_progress',
      priority: 'low'
    },
    {
      id: 't5',
      semesterId: 'sem_2026_fall',
      title: 'Run latency ablation on 3-hop subgraph retrieval dataset',
      category: 'Research',
      tags: ['#Research', '#Paper'],
      dueDate: '2026-10-22',
      status: 'in_progress',
      priority: 'high'
    }
  ],

  kanban: [
    {
      id: 'k1',
      title: 'Taxonomy of Hybrid Vector + Graph Retrieval (2023–2026)',
      stage: 'lit_review',
      targetWeek: 'W5',
      project: 'Graph-RAG Paper',
      notes: 'Survey 15 top papers'
    },
    {
      id: 'k2',
      title: 'Survey Dynamic Programming Lower Bounds for Sparse Graphs',
      stage: 'lit_review',
      targetWeek: 'W7',
      project: 'Thesis Proposal'
    },
    {
      id: 'k3',
      title: 'Multi-hop QA Evaluation on HotpotQA & MuSiQue',
      stage: 'experiments',
      targetWeek: 'W6',
      project: 'Graph-RAG Paper'
    },
    {
      id: 'k4',
      title: 'Section 3: Hierarchical Community Summarization Method',
      stage: 'drafting',
      targetWeek: 'W5',
      project: 'Graph-RAG Paper'
    },
    {
      id: 'k5',
      title: 'Term Project Research Proposal Draft v2',
      stage: 'drafting',
      targetWeek: 'W5',
      project: 'Thesis Proposal'
    },
    {
      id: 'k6',
      title: 'Workshop Paper: Low-Resource Citation Graph Alignment',
      stage: 'under_review',
      targetWeek: 'W9',
      project: 'Workshop Track'
    }
  ],

  papers: [
    {
      id: 'p1',
      title: 'From Local to Global: A Graph RAG Approach to Query-Focused Summarization',
      authors: 'Darren Edge, Ha Trinh, Newman Cheng, Joshua Bradley, et al.',
      venue: 'ArXiv',
      year: 2024,
      arxivId: '2404.16130',
      codeUrl: 'https://github.com/microsoft/graphrag',
      status: 'read',
      rating: 5,
      tldr: 'Combines LLM-generated knowledge graphs, Leiden community clustering, and hierarchical summaries for global dataset understanding.',
      tags: ['#Graph-RAG', '#Summarization'],
      bibtex: `@article{edge2024graphrag,
  title={From Local to Global: A Graph RAG Approach to Query-Focused Summarization},
  author={Edge, Darren and Trinh, Ha and Cheng, Newman and Bradley, Joshua and others},
  journal={arXiv preprint arXiv:2404.16130},
  year={2024}
}`,
      notesMarkdown: `### Key Strengths
- Leiden hierarchical community detection organizes concepts at multiple abstraction levels.
- Outperforms vector-only baseline on comprehensive multi-hop summarization tasks.

### Next Steps for Our Work
- Investigate graph sparsity during construction to decrease LLM token extraction overhead.`
    },
    {
      id: 'p2',
      title: 'Retrieval-Augmented Generation for Large Language Models: A Survey',
      authors: 'Yunfan Gao, Yun Xiong, Xinyu Gao, Kangxiang Jia, et al.',
      venue: 'ArXiv',
      year: 2024,
      arxivId: '2312.10997',
      status: 'reading',
      rating: 4,
      tldr: 'Detailed classification of Naive, Advanced, and Modular RAG architectures with benchmark survey.',
      tags: ['#Survey', '#RAG'],
      notesMarkdown: 'Reviewing Section 4 for citation baseline graph.'
    }
  ],

  conferences: [
    {
      id: 'conf_1',
      name: 'Annual Meeting of the Association for Computational Linguistics 2027',
      acronym: 'ACL 2027',
      tier: 'CCF-A / Core A*',
      abstractDeadline: '2027-01-15',
      submissionDeadline: '2027-01-22',
      rebuttalDeadline: '2027-03-10',
      cameraReadyDeadline: '2027-04-15',
      paperTitle: 'Hierarchical Graph-RAG for Multi-hop Reasoning',
      status: 'preparing'
    },
    {
      id: 'conf_2',
      name: 'Conference on Neural Information Processing Systems 2027',
      acronym: 'NeurIPS 2027',
      tier: 'CCF-A / Core A*',
      abstractDeadline: '2027-05-15',
      submissionDeadline: '2027-05-22',
      rebuttalDeadline: '2027-08-01',
      cameraReadyDeadline: '2027-09-01',
      paperTitle: 'Sparse Subgraph Contrastive Learning',
      status: 'preparing'
    }
  ],

  experimentLogs: [
    {
      id: 'exp_1',
      projectTag: 'Graph-RAG',
      name: 'Exp-01: Baseline Vector vs Hybrid Graph',
      hypothesis: 'Hierarchical community summarization improves multi-hop recall by >= 10%',
      dataset: 'HotpotQA',
      hyperparameters: { k: 16, model: 'text-embedding-3-large', top_p: 0.95 },
      metrics: { f1: 84.6, recall: 89.2, latency_ms: 115 },
      status: 'completed',
      notes: 'Hybrid graph beats standard dense retrieval by 12.4% F1.'
    },
    {
      id: 'exp_2',
      projectTag: 'Graph-RAG',
      name: 'Exp-02: 3-Hop Subgraph Retrieval Latency',
      hypothesis: 'Pruning edge weights < 0.2 reduces latency by 40% with < 1% recall loss',
      dataset: 'MuSiQue',
      hyperparameters: { k: 32, edge_threshold: 0.2, beam_size: 4 },
      metrics: { f1: 81.3, recall: 85.8, latency_ms: 68 },
      status: 'completed',
      notes: 'Substantial latency drop observed.'
    }
  ],

  advisorMeetings: [
    {
      id: 'm_1',
      meetingDate: '2026-10-16',
      agendaMarkdown: `1. Present HotpotQA ablation results
2. Discuss term project proposal timeline
3. Clarify committee members`,
      discussionNotes: 'Supervisor approved the HotpotQA experimental methodology. Recommended focusing on computational efficiency for the rebuttal.',
      actionItems: ['Finalize Table 2 ablation metrics', 'Draft Chapter 3 outline by Friday'],
      weeklyDigestMarkdown: `### Weekly Progress Digest (Oct 9 - Oct 16)

**Accomplished this week:**
- Completed literature review section for Graph-RAG manuscript
- Finished Exp-01 baseline evaluation with 84.6% F1 score
- Reviewed problem sets and literature benchmarks for CS820

**Next week priorities:**
- Run edge-threshold ablation on MuSiQue
- Submit revised proposal outline to supervisor`
    }
  ],

  attendanceRecords: [
    {
      id: 'att_course_c_cs801_deep_learning_2026-10-12',
      targetId: 'c_cs801_deep_learning',
      targetType: 'course',
      date: '2026-10-12',
      status: 'attended',
      academicWeek: 5,
      updatedAt: '2026-10-12T18:10:00Z',
    },
    {
      id: 'att_course_c_cs801_deep_learning_2026-10-14',
      targetId: 'c_cs801_deep_learning',
      targetType: 'course',
      date: '2026-10-14',
      status: 'attended',
      academicWeek: 5,
      updatedAt: '2026-10-14T16:10:00Z',
    },
    {
      id: 'att_course_c_cs820_research_methods_2026-10-13',
      targetId: 'c_cs820_research_methods',
      targetType: 'course',
      date: '2026-10-13',
      status: 'attended',
      academicWeek: 5,
      updatedAt: '2026-10-13T12:05:00Z',
    },
    {
      id: 'att_course_c_cs820_research_methods_2026-10-06',
      targetId: 'c_cs820_research_methods',
      targetType: 'course',
      date: '2026-10-06',
      status: 'missed',
      academicWeek: 4,
      note: 'Flu - borrowed slides from classmate',
      updatedAt: '2026-10-06T12:05:00Z',
    },
    {
      id: 'att_routine_evt_morning_read_2026-10-16',
      targetId: 'evt_morning_read',
      targetType: 'routine',
      date: '2026-10-16',
      status: 'attended',
      academicWeek: 5,
      updatedAt: '2026-10-16T08:15:00Z',
    },
  ]
};
