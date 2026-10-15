import React, { useState } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { X, Upload } from 'lucide-react';
import { Paper } from '../../../types';

interface PaperModalProps {
  ws: ReturnType<typeof useWorkspace>;
  isOpen: boolean;
  onClose: () => void;
}

export const PaperModal: React.FC<PaperModalProps> = ({ ws, isOpen, onClose }) => {
  const { savePaper, showToast } = ws;

  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [venue, setVenue] = useState('NeurIPS 2025');
  const [year, setYear] = useState('2025');
  const [arxivId, setArxivId] = useState('');
  const [codeUrl, setCodeUrl] = useState('');
  const [status, setStatus] = useState<Paper['status']>('to_read');
  const [rating, setRating] = useState(4);
  const [tldr, setTldr] = useState('');
  const [tagsStr, setTagsStr] = useState('#Graph-RAG');
  const [bibtex, setBibtex] = useState('');
  const [notesMarkdown, setNotesMarkdown] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsStr
      .split(/[\s,]+/)
      .map(t => t.startsWith('#') ? t : `#${t}`)
      .filter(t => t.length > 1);

    const newPaper: Paper = {
      id: 'p_' + Date.now().toString(36),
      title: title.trim(),
      authors: authors.trim() || undefined,
      venue: venue.trim() || undefined,
      year: parseInt(year, 10) || 2026,
      arxivId: arxivId.trim() || undefined,
      codeUrl: codeUrl.trim() || undefined,
      status,
      rating,
      tldr: tldr.trim() || undefined,
      tags,
      bibtex: bibtex.trim() || undefined,
      notesMarkdown: notesMarkdown.trim() || undefined,
    };

    savePaper(newPaper);
    setTitle('');
    onClose();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      showToast(`Uploaded ${file.name} to R2 storage mock!`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white dark:bg-slate-900 w-full sm:max-w-xl rounded-t-xl sm:rounded-lg shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">Catalog Research Paper</h3>
          <button type="button" onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto custom-scrollbar flex-1">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Paper Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Graph-RAG: Query-Focused Summarization..."
              className="w-full px-2.5 py-1.5 text-xs sm:text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Authors</label>
              <input
                type="text"
                value={authors}
                onChange={(e) => setAuthors(e.target.value)}
                placeholder="Darren Edge et al."
                className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Venue & Year</label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="NeurIPS 2025"
                className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">ArXiv ID</label>
              <input
                type="text"
                value={arxivId}
                onChange={(e) => setArxivId(e.target.value)}
                placeholder="2404.16130"
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Code Repository URL</label>
              <input
                type="url"
                value={codeUrl}
                onChange={(e) => setCodeUrl(e.target.value)}
                placeholder="https://github.com/..."
                className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">1-Sentence TL;DR</label>
            <input
              type="text"
              value={tldr}
              onChange={(e) => setTldr(e.target.value)}
              placeholder="What is the key novelty or benchmark takeaway?"
              className="w-full px-2.5 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Tags (space or comma separated)</label>
            <input
              type="text"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="#Graph-RAG #Summarization #Baseline"
              className="w-full px-2.5 py-1.5 text-xs font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          {/* PDF Upload (R2 Storage) */}
          <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Attach PDF (Cloudflare R2)</div>
                <div className="text-[11px] text-slate-400">Stores PDF in your zero-egress R2 bucket</div>
              </div>
              <label className="px-2.5 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-medium cursor-pointer transition flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                <Upload className="w-3 h-3" />
                <span>Choose PDF</span>
                <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">BibTeX Citation</label>
            <textarea
              rows={3}
              value={bibtex}
              onChange={(e) => setBibtex(e.target.value)}
              placeholder="@article{...}"
              className="w-full px-2.5 py-1.5 text-[11px] font-mono rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 rounded text-xs font-medium bg-slate-900 dark:bg-white hover:bg-slate-800 text-white dark:text-slate-900"
            >
              Save Paper
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
