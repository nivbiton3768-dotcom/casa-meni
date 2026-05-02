'use client';

import { useEffect, useRef, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SheetProps {
  open: boolean;
  onClose: () => void;
  side?: 'left' | 'right';
  children: ReactNode;
  className?: string;
}

export function Sheet({
  open,
  onClose,
  side = 'left',
  children,
  className,
}: SheetProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/50 transition-opacity"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div
        className={cn(
          'fixed top-0 bottom-0 flex w-72 flex-col bg-white shadow-xl transition-transform',
          side === 'left' ? 'left-0' : 'right-0',
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}
