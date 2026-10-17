import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../hooks/useWorkspace';
import { Copy, Download, Upload } from 'lucide-react';
import { api } from '../../api';
import { ModalSheet } from '../common/ModalSheet';

interface BackupModalProps {
  ws: ReturnType<typeof useWorkspace>;
  isOpen: boolean;
  onClose: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({ ws, isOpen, onClose }) => {
  const { showToast, refreshData } = ws;
  const [jsonText, setJsonText] = useState('Loading database state...');

  useEffect(() => {
    if (isOpen) {
      api.exportBackup().then(data => {
        setJsonText(JSON.stringify(data, null, 2));
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(jsonText);
      showToast('Database JSON copied to clipboard!');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `academic-phd-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded backup file!');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        await api.restoreBackup(parsed);
        await refreshData();
        showToast('Database restored successfully from file!');
        onClose();
      } catch (err) {
        showToast('Error: Invalid JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <ModalSheet isOpen={isOpen} onClose={onClose} maxWidthClass="sm:max-w-2xl">
      {({ requestClose, dragHandleProps }) => (
        <>
          {/* Draggable Header */}
          <div
            {...dragHandleProps}
            className="px-5 py-3 sm:px-6 sm:py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Cloudflare D1 Database Backup & Restore
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Export a full JSON dump or restore from a previous backup file
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0 space-y-3">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Export a full JSON dump of your courses, assignments, tasks, and schedule, or restore from a previous backup.
            </p>
            <textarea
              rows={12}
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="w-full p-3.5 rounded-lg bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed border border-slate-800 focus:outline-none focus:border-slate-700"
            />
          </div>

          {/* Footer */}
          <div className="px-5 pt-3 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] sm:pb-3.5 sm:px-6 border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs flex flex-wrap items-center justify-between gap-2 shrink-0 z-10">
            <label className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-medium cursor-pointer transition flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5" />
              <span>Restore from File (.json)</span>
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-medium transition flex items-center gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="px-3.5 py-1.5 rounded-lg bg-slate-900 dark:bg-white hover:bg-slate-800 dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold transition shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Backup</span>
              </button>
            </div>
          </div>
        </>
      )}
    </ModalSheet>
  );
};
