import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

interface TimeInputProps {
  value: string; // 'HH:mm' in 24-hour format (e.g. '07:00', '14:30')
  onChange: (val: string) => void;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}

// Generate quick preset times at 15-minute intervals from 06:00 to 22:00
const PRESET_TIMES: { value: string; label: string }[] = (() => {
  const list: { value: string; label: string }[] = [];
  for (let h = 6; h <= 22; h++) {
    for (let m = 0; m < 60; m += 15) {
      const h24 = String(h).padStart(2, '0');
      const mStr = String(m).padStart(2, '0');
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      list.push({
        value: `${h24}:${mStr}`,
        label: `${h12}:${mStr} ${period}`,
      });
    }
  }
  return list;
})();

function parseTimeString(raw: string, currentIsPm: boolean): { h24: number; m: number } | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;

  let isPm = currentIsPm;
  let clean = trimmed;

  if (clean.includes('am')) {
    isPm = false;
    clean = clean.replace('am', '').trim();
  } else if (clean.includes('pm')) {
    isPm = true;
    clean = clean.replace('pm', '').trim();
  }

  let h = 0;
  let m = 0;

  if (clean.includes(':') || clean.includes('.') || clean.includes(' ')) {
    const parts = clean.split(/[:. ]+/);
    h = parseInt(parts[0], 10);
    m = parseInt(parts[1] || '0', 10);
  } else if (/^\d{3,4}$/.test(clean)) {
    h = parseInt(clean.slice(0, clean.length - 2), 10);
    m = parseInt(clean.slice(-2), 10);
  } else if (/^\d{1,2}$/.test(clean)) {
    h = parseInt(clean, 10);
    m = 0;
  } else {
    return null;
  }

  if (isNaN(h) || isNaN(m)) return null;

  // Auto-detect PM if 24-hr hour was typed
  if (h >= 12 && h < 24) {
    isPm = true;
  }

  let h24: number;
  if (h > 12 && h < 24) {
    h24 = h;
  } else {
    const h12 = h % 12;
    h24 = (h12 === 0 ? 0 : h12) + (isPm ? 12 : 0);
  }

  m = Math.max(0, Math.min(59, m));
  h24 = Math.max(0, Math.min(23, h24));

  return { h24, m };
}

export const TimeInput: React.FC<TimeInputProps> = ({
  value,
  onChange,
  className = '',
  required = false,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  const [isOpen, setIsOpen] = useState(false);

  // Parse current 24-hr value into components
  const [h24, m24] = (value || '07:00').split(':').map(Number);
  const safeH = isNaN(h24) ? 7 : h24;
  const safeM = isNaN(m24) ? 0 : m24;

  const isPm = safeH >= 12;
  const h12 = safeH % 12 === 0 ? 12 : safeH % 12;
  const formattedTime12 = `${h12}:${String(safeM).padStart(2, '0')}`;

  const [textInput, setTextInput] = useState(formattedTime12);

  // Sync internal text when external value changes
  useEffect(() => {
    setTextInput(formattedTime12);
  }, [value, formattedTime12]);

  // Click outside listener for suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Scroll active preset into view when dropdown opens
  useEffect(() => {
    if (isOpen && activeItemRef.current && dropdownRef.current) {
      activeItemRef.current.scrollIntoView({ block: 'nearest' });
    }
  }, [isOpen]);

  const handlePeriodChange = (newPeriod: 'AM' | 'PM') => {
    if (disabled) return;
    const currentIsPm = safeH >= 12;
    if ((newPeriod === 'PM' && currentIsPm) || (newPeriod === 'AM' && !currentIsPm)) return;

    let newH24: number;
    if (newPeriod === 'PM') {
      newH24 = (safeH % 12) + 12;
    } else {
      newH24 = safeH % 12;
    }
    const nextVal = `${String(newH24).padStart(2, '0')}:${String(safeM).padStart(2, '0')}`;
    onChange(nextVal);
  };

  const handleBlur = () => {
    const parsed = parseTimeString(textInput, isPm);
    if (parsed) {
      const nextVal = `${String(parsed.h24).padStart(2, '0')}:${String(parsed.m).padStart(2, '0')}`;
      onChange(nextVal);
      const nextH12 = parsed.h24 % 12 === 0 ? 12 : parsed.h24 % 12;
      setTextInput(`${nextH12}:${String(parsed.m).padStart(2, '0')}`);
    } else {
      // Revert to valid display
      setTextInput(formattedTime12);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleBlur();
      setIsOpen(false);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      // Step +15 mins
      const currentTotalMins = safeH * 60 + safeM;
      const nextTotalMins = (currentTotalMins + 15) % (24 * 60);
      const nextH = Math.floor(nextTotalMins / 60);
      const nextM = nextTotalMins % 60;
      onChange(`${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      // Step -15 mins
      const currentTotalMins = safeH * 60 + safeM;
      const nextTotalMins = (currentTotalMins - 15 + 24 * 60) % (24 * 60);
      const nextH = Math.floor(nextTotalMins / 60);
      const nextM = nextTotalMins % 60;
      onChange(`${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div
        className={`flex items-center w-full px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white transition shadow-2xs focus-within:ring-2 focus-within:ring-slate-900 dark:focus-within:ring-white ${
          disabled ? 'opacity-60 cursor-not-allowed' : ''
        } ${className}`}
      >
        {/* Clock trigger for suggestions */}
        <button
          type="button"
          tabIndex={-1}
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 mr-1.5 shrink-0 transition cursor-pointer"
          title="Pick preset time"
        >
          <Clock className="w-3.5 h-3.5" />
        </button>

        {/* 12-Hour editable time string */}
        <input
          type="text"
          required={required}
          disabled={disabled}
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="07:00"
          className="w-full bg-transparent text-slate-900 dark:text-white focus:outline-none font-mono text-xs select-all"
        />

        {/* Clear AM / PM Segmented Control */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-700/60 p-0.5 rounded-md shrink-0 select-none ml-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => handlePeriodChange('AM')}
            className={`px-1.5 py-0.5 text-[10px] font-bold font-mono rounded transition cursor-pointer ${
              !isPm
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            AM
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => handlePeriodChange('PM')}
            className={`px-1.5 py-0.5 text-[10px] font-bold font-mono rounded transition cursor-pointer ${
              isPm
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            PM
          </button>
        </div>
      </div>

      {/* Preset Times Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto custom-scrollbar rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg py-1"
        >
          {PRESET_TIMES.map((preset) => {
            const isSelected = preset.value === value;
            return (
              <button
                key={preset.value}
                ref={isSelected ? activeItemRef : null}
                type="button"
                onClick={() => {
                  onChange(preset.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-1.5 text-left text-xs font-mono transition flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <span>{preset.label}</span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-white" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
