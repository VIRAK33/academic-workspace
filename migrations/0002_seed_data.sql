-- Semesters
INSERT OR IGNORE INTO semesters (id, name, start_date, total_weeks, is_active, is_archived) VALUES
  ('sem_2026_fall', '2026-2027 Fall', '2026-09-14', 19, 1, 0),
  ('sem_2026_spring', '2025-2026 Spring', '2026-03-02', 19, 0, 1),
  ('sem_2025_fall', '2025-2026 Fall', '2025-09-15', 19, 0, 1);

-- Time Slots
INSERT OR IGNORE INTO time_slots (id, session_code, start_time, end_time, display_order) VALUES
  ('slot_1', '1-2', '08:25', '10:00', 1),
  ('slot_2', '3-4', '10:25', '12:00', 2),
  ('slot_3', '5-6', '14:30', '16:05', 3),
  ('slot_4', '7-8', '16:30', '18:05', 4),
  ('slot_5', '9-10', '19:30', '21:10', 5);

-- Courses
INSERT OR IGNORE INTO courses (id, semester_id, code, name, teacher, location, color, active_weeks_json) VALUES
  ('c_cs801_deep_learning', 'sem_2026_fall', 'CS801', 'Foundations of Deep Learning', 'Prof. Alan Turing', 'Turing Hall 101', '#2563EB', '[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16]'),
  ('c_cs820_research_methods', 'sem_2026_fall', 'CS820', 'Research Methodologies & Scientific Communication', 'Prof. Grace Hopper', 'Hopper Hall 204', '#7C3AED', '[1,2,3,4,5,6,7,8,9,10,11,12,13,14]'),
  ('c_algo_design', 'sem_2026_fall', 'CS840', 'Advanced Algorithm Design & Complexity', 'Prof. Donald Knuth', 'Science Complex 402', '#D97706', '[1,2,3,4,9,10,11,12,13,14]'),
  ('c_stat_learning', 'sem_2026_fall', 'MATH701', 'Statistical Learning & High-Dimensional Inference', 'Dr. Claude Shannon', 'Math Building 305', '#059669', '[1,2,3,4,5,6,7,8,9,10,11,12]'),
  ('c_phd_seminar', 'sem_2026_fall', 'PHD890', 'PhD Research Lab Colloquium', 'Prof. Margaret Hamilton', 'Computing Lab 12', '#4F46E5', '[1,3,5,6,7,9,11,13,15,17]');

-- Course Schedules
INSERT OR IGNORE INTO course_schedules (id, course_id, day_of_week, sessions_json, start_time, end_time) VALUES
  ('sch_1', 'c_cs801_deep_learning', 1, '["5-6","7-8"]', '14:30', '18:05'),
  ('sch_2', 'c_cs801_deep_learning', 3, '["5-6"]', '14:30', '16:05'),
  ('sch_3', 'c_cs820_research_methods', 4, '["5-6","7-8"]', '14:30', '18:05'),
  ('sch_4', 'c_algo_design', 1, '["1-2","3-4"]', '08:25', '12:00'),
  ('sch_5', 'c_stat_learning', 2, '["3-4"]', '10:25', '12:00'),
  ('sch_6', 'c_stat_learning', 4, '["1-2"]', '08:25', '10:00'),
  ('sch_7', 'c_phd_seminar', 3, '["9-10"]', '19:30', '21:10'),
  ('sch_8', 'c_phd_seminar', 5, '["5-6"]', '14:30', '16:05');

-- Tasks
INSERT OR IGNORE INTO tasks (id, semester_id, title, category, tags_json, due_date, status, priority) VALUES
  ('t0', 'sem_2026_fall', 'Finish Literature Review section for Graph-RAG', 'Research', '["#Research","#Paper"]', '2026-10-15', 'completed', 'high'),
  ('t1', 'sem_2026_fall', 'Complete the PhD research proposal draft', 'Research', '["#Research","#Paper"]', '2026-10-15', 'in_progress', 'high'),
  ('t2', 'sem_2026_fall', 'Review lecture notes & proofs for CS820 Research Methodologies', 'Coursework', '["#Class"]', '2026-10-15', 'in_progress', 'medium'),
  ('t3', 'sem_2026_fall', 'Submit finalized research proposal PDF to supervisor', 'Research', '["#Research"]', '2026-10-16', 'in_progress', 'high'),
  ('t4', 'sem_2026_fall', 'Complete problem set 3 for CS801 Deep Learning Foundations', 'Coursework', '["#Class"]', '2026-10-19', 'in_progress', 'low'),
  ('t5', 'sem_2026_fall', 'Run latency ablation on 3-hop subgraph retrieval dataset', 'Research', '["#Research","#Paper"]', '2026-10-22', 'in_progress', 'high');

-- Kanban Milestones
INSERT OR IGNORE INTO kanban_milestones (id, semester_id, title, stage, target_week, project, notes, sort_order) VALUES
  ('k1', 'sem_2026_fall', 'Taxonomy of Hybrid Vector + Graph Retrieval (2023–2026)', 'lit_review', 'W5', 'Graph-RAG Paper', 'Review 15 recent papers on graph indexing', 1),
  ('k2', 'sem_2026_fall', 'Survey Dynamic Programming Lower Bounds for Sparse Graphs', 'lit_review', 'W7', 'Thesis Proposal', 'Prepare chapter 2 background', 2),
  ('k3', 'sem_2026_fall', 'Multi-hop QA Evaluation on HotpotQA & MuSiQue', 'experiments', 'W6', 'Graph-RAG Paper', 'Ablate with 2-hop vs 3-hop retrieval', 3),
  ('k4', 'sem_2026_fall', 'Section 3: Hierarchical Community Summarization Method', 'drafting', 'W5', 'Graph-RAG Paper', 'Draft formal math notation', 4),
  ('k5', 'sem_2026_fall', 'PhD Qualification Research Proposal Draft v2', 'drafting', 'W5', 'Thesis Proposal', 'Integrate committee comments', 5),
  ('k6', 'sem_2026_fall', 'Workshop Paper: Low-Resource Citation Graph Alignment', 'under_review', 'W9', 'Workshop Track', 'Submitted to EMNLP Workshop', 6);

-- Papers
INSERT OR IGNORE INTO papers (id, title, authors, venue, year, arxiv_id, code_url, status, rating, tldr, tags_json, bibtex, notes_markdown) VALUES
  ('p1', 'From Local to Global: A Graph RAG Approach to Query-Focused Summarization', 'Darren Edge et al.', 'ArXiv', 2024, '2404.16130', 'https://github.com/microsoft/graphrag', 'read', 5, 'Combines graph extraction, community clustering (Leiden), and hierarchical summarization for global corpus comprehension.', '["#Graph-RAG", "#Survey"]', '@article{edge2024graphrag,\n  title={From Local to Global: A Graph RAG Approach to Query-Focused Summarization},\n  author={Edge, Darren and others},\n  journal={arXiv preprint arXiv:2404.16130},\n  year={2024}\n}', '### Key Takeaways\n- Leiden community clustering creates multi-level hierarchies\n- Drastically beats naive RAG on thematic summary queries'),
  ('p2', 'Retrieval-Augmented Generation for Large Language Models: A Survey', 'Yunfan Gao et al.', 'ArXiv', 2024, '2312.10997', '', 'reading', 4, 'Comprehensive taxonomy of Naive RAG, Advanced RAG, and Modular RAG paradigms.', '["#RAG", "#Survey"]', '', 'Reading Section 4 on Graph Indexing.');

-- Conferences
INSERT OR IGNORE INTO conferences (id, name, acronym, tier, abstract_deadline, submission_deadline, rebuttal_deadline, camera_ready_deadline, paper_title, status) VALUES
  ('conf_1', 'Annual Meeting of the Association for Computational Linguistics 2027', 'ACL 2027', 'CCF-A / Core A*', '2027-01-15', '2027-01-22', '2027-03-10', '2027-04-15', 'Hierarchical Graph-RAG for Multi-hop Reasoning', 'preparing'),
  ('conf_2', 'Conference on Neural Information Processing Systems 2027', 'NeurIPS 2027', 'CCF-A / Core A*', '2027-05-15', '2027-05-22', '2027-08-01', '2027-09-01', 'Sparse Subgraph Contrastive Learning', 'preparing');

-- Experiment Logs
INSERT OR IGNORE INTO experiment_logs (id, project_tag, name, hypothesis, dataset, hyperparameters_json, metrics_json, status, notes) VALUES
  ('exp_1', 'Graph-RAG', 'Exp-01: Baseline Vector vs Hybrid Graph', 'Community summarization improves multi-hop recall by >= 10%', 'HotpotQA', '{"k": 16, "model": "text-embedding-3-large", "top_p": 0.95}', '{"f1": 84.6, "recall": 89.2, "latency_ms": 115}', 'completed', 'Hybrid graph beats standard dense retrieval by 12.4% F1.'),
  ('exp_2', 'Graph-RAG', 'Exp-02: 3-Hop Subgraph Retrieval Latency', 'Pruning edge weights < 0.2 reduces latency by 40% with < 1% recall loss', 'MuSiQue', '{"k": 32, "edge_threshold": 0.2, "beam_size": 4}', '{"f1": 81.3, "recall": 85.8, "latency_ms": 68}', 'completed', 'Substantial latency drop observed.');

-- Advisor Meetings
INSERT OR IGNORE INTO advisor_meetings (id, meeting_date, agenda_markdown, discussion_notes, action_items_json, weekly_digest_markdown) VALUES
  ('m_1', '2026-10-16', '1. Present HotpotQA ablation results\n2. Discuss PhD proposal timeline\n3. Clarify committee members', 'Supervisor approved the HotpotQA experimental methodology. Recommended focusing on computational efficiency for the rebuttal.', '["Finalize Table 2 ablation metrics", "Draft Chapter 3 outline by Friday"]', '### Weekly Progress Digest (Oct 9 - Oct 16)\n\n**Accomplished this week:**\n- Completed literature review section for Graph-RAG manuscript\n- Finished Exp-01 baseline evaluation with 84.6% F1 score\n- Reviewed problem sets and literature benchmarks for CS820\n\n**Next week priorities:**\n- Run edge-threshold ablation on MuSiQue\n- Submit revised proposal outline to supervisor');
