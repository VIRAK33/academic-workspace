import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';

interface ModalSheetContextType {
  requestClose: () => void;
  dragHandleProps: {
    onPointerDown: (e: React.PointerEvent) => void;
    onPointerMove: (e: React.PointerEvent) => void;
    onPointerUp: (e: React.PointerEvent) => void;
    onPointerCancel: (e: React.PointerEvent) => void;
  };
}

const ModalSheetContext = createContext<ModalSheetContextType>({
  requestClose: () => {},
  dragHandleProps: {
    onPointerDown: () => {},
    onPointerMove: () => {},
    onPointerUp: () => {},
    onPointerCancel: () => {},
  },
});

export const useModalSheet = () => useContext(ModalSheetContext);

interface ModalSheetProps {
  isOpen: boolean;
  onClose: () => void;
  maxWidthClass?: string;
  children: React.ReactNode | ((props: ModalSheetContextType) => React.ReactNode);
}

export const ModalSheet: React.FC<ModalSheetProps> = ({
  isOpen,
  onClose,
  maxWidthClass = 'max-w-lg',
  children,
}) => {
  const [rendered, setRendered] = useState(isOpen);
  const [visible, setVisible] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const touchStartY = useRef<number | null>(null);
  const touchCurrentY = useRef<number | null>(null);
  const isClosingRef = useRef(false);

  const requestClose = useCallback(() => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    setVisible(false);
    setTimeout(() => {
      onClose();
      setRendered(false);
      isClosingRef.current = false;
    }, 240);
  }, [onClose]);

  // Synchronize when parent changes isOpen
  useEffect(() => {
    if (isOpen) {
      isClosingRef.current = false;
      setRendered(true);
      setDragY(0);
      setIsDragging(false);
      const raf1 = requestAnimationFrame(() => {
        const raf2 = requestAnimationFrame(() => {
          setVisible(true);
        });
        return () => cancelAnimationFrame(raf2);
      });
      return () => cancelAnimationFrame(raf1);
    } else if (rendered && !isClosingRef.current) {
      setVisible(false);
      const timer = setTimeout(() => {
        setRendered(false);
      }, 240);
      return () => clearTimeout(timer);
    }
  }, [isOpen, rendered]);

  // Escape key support
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        requestClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, requestClose]);

  // Drag down gestures (pointer events cover touch, mouse, and stylus)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    touchStartY.current = e.clientY;
    touchCurrentY.current = e.clientY;
    setIsDragging(true);
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (touchStartY.current === null) return;
    const currentY = e.clientY;
    touchCurrentY.current = currentY;
    const delta = currentY - touchStartY.current;
    if (delta > 0) {
      setDragY(delta);
    } else {
      // Elastic resistance when dragging up
      setDragY(delta * 0.15);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (touchStartY.current !== null && touchCurrentY.current !== null) {
      const delta = touchCurrentY.current - touchStartY.current;
      if (delta > 75) {
        // Dragged down past threshold -> dismiss smoothly
        setDragY(window.innerHeight);
        requestClose();
      } else {
        // Snap back
        setDragY(0);
      }
    }
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
    touchStartY.current = null;
    touchCurrentY.current = null;
    setIsDragging(false);
  };

  const dragHandleProps = {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerUp,
  };

  if (!rendered) return null;

  return (
    <ModalSheetContext.Provider value={{ requestClose, dragHandleProps }}>
      <div
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            requestClose();
          }
        }}
        className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all duration-200 ease-out ${
          visible && dragY < 150
            ? 'bg-slate-900/50 backdrop-blur-xs opacity-100'
            : 'bg-slate-900/0 backdrop-blur-none opacity-0 pointer-events-none'
        }`}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={
            isDragging || dragY > 0
              ? {
                  transform: `translateY(${Math.max(0, dragY)}px)`,
                  transition: isDragging ? 'none' : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)',
                }
              : undefined
          }
          className={`bg-white dark:bg-slate-900 w-full ${maxWidthClass} rounded-t-[26px] sm:rounded-2xl shadow-2xl border-t sm:border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92dvh] sm:max-h-[88vh] transform-gpu ${
            !isDragging ? 'transition-all duration-250 ease-out' : ''
          } ${
            !visible
              ? 'translate-y-full sm:translate-y-6 sm:opacity-0'
              : 'translate-y-0 sm:opacity-100'
          }`}
        >
          {/* Mobile Sheet Drag Indicator Handle */}
          <div
            {...dragHandleProps}
            className="pt-3 pb-1.5 flex justify-center sm:hidden shrink-0 cursor-grab active:cursor-grabbing select-none touch-none"
          >
            <div className="w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
          </div>

          {typeof children === 'function' ? children({ requestClose, dragHandleProps }) : children}
        </div>
      </div>
    </ModalSheetContext.Provider>
  );
};
