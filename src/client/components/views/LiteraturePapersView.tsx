import React, { useState } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { Paper } from '../../../types';
import { Plus, BookOpen, Star, Copy, ExternalLink, Trash2, FileText } from 'lucide-react';

interface LiteraturePapersViewProps {
  ws: ReturnType<typeof useWorkspace>;
  onOpenPaperModal: () => void;
}

export const LiteraturePapersView: React.FC<LiteraturePapersViewProps> = ({ ws, onOpenPaperModal }) => {
  const { papers, savePaper, deletePaper, searchQuery, showToast } = ws;
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string>('ALL');

  const q = searchQuery.toLowerCase().trim();

  const allTags = Array.from(new Set(papers.flatMap(p => p.tags)));

  const filteredPapers = papers.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (selectedTag !== 'ALL' && !p.tags.includes(selectedTag)) return false;
    if (q && !p.title.toLowerCase().includes(q) && !(p.authors || '').toLowerCase().includes(q) && !(p.tldr || '').toLowerCase().includes(q)) return false;
    return true;
  });

  const handleCopyBibtex = (paper: Paper) => {
    const bib = paper.bibtex || `@article{${paper.id},\n  title={${paper.title}},\n  author={${paper.authors || 'Unknown'}},\n  journal={${paper.venue || 'ArXiv'}},\n  year={${paper.year || 2026}}\n}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(bib);
      showToast('BibTeX copied to clipboard!');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Literature & Paper Matrix</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Manage research literature, BibTeX citations, reading notes, and PDFs</p>
        </div>
        <button
          type="button"
          onClick={onOpenPaperModal}
          className="px-3 py-1.5 rounded-md bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold transition shadow-xs flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Paper</span>
        </button>
      </div>

      {/* Filter Chips */}
      <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-200/90 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mr-1">Status:</span>
          {['all', 'to_read', 'reading', 'read'].map(st => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition capitalize ${
                statusFilter === st
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>

        {allTags.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium mr-1">Tag:</span>
            <button
              type="button"
              onClick={() => setSelectedTag('ALL')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                selectedTag === 'ALL'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              All
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => setSelectedTag(tag)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${
                  selectedTag === tag
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Papers Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredPapers.length === 0 ? (
          <div className="lg:col-span-2 py-16 text-center text-xs text-slate-400 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
            No papers match current filters. Click "Add Paper" to catalog your first manuscript!
          </div>
        ) : (
          filteredPapers.map(paper => {
            const statusColors: Record<string, string> = {
              to_read: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
              reading: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300 border-sky-200 dark:border-sky-800',
              read: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
              replicated: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
            };

            return (
              <div
                key={paper.id}
                className="p-4 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 space-y-3 flex flex-col justify-between shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border uppercase tracking-wider ${statusColors[paper.status] || ''}`}>
                      {paper.status.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          className={`w-3 h-3 ${i < paper.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 dark:text-slate-700'}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                      {paper.title}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {paper.authors ? `${paper.authors} · ` : ''}{paper.venue || 'ArXiv'} {paper.year || ''}
                    </p>
                  </div>

                  {paper.tldr && (
                    <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      <strong className="font-semibold text-slate-900 dark:text-slate-200">TL;DR: </strong>
                      {paper.tldr}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {paper.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopyBibtex(paper)}
                      className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition flex items-center gap-1"
                      title="Copy BibTeX"
                    >
                      <Copy className="w-3 h-3" />
                      <span>BibTeX</span>
                    </button>

                    {paper.arxivId && (
                      <a
                        href={`https://arxiv.org/abs/${paper.arxivId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>arXiv</span>
                      </a>
                    )}

                    {paper.codeUrl && (
                      <a
                        href={paper.codeUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition flex items-center gap-1"
                      >
                        <span>Code</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Toggle status */}
                    <select
                      value={paper.status}
                      onChange={(e) => savePaper({ ...paper, status: e.target.value as any })}
                      className="text-xs bg-transparent text-slate-600 dark:text-slate-400 font-medium cursor-pointer focus:outline-none"
                    >
                      <option value="to_read">To Read</option>
                      <option value="reading">Reading</option>
                      <option value="read">Read</option>
                      <option value="replicated">Replicated</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => deletePaper(paper.id)}
                      className="text-slate-300 hover:text-rose-600 p-1 rounded transition"
                      title="Delete Paper"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
