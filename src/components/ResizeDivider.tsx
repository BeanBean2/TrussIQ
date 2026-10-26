import { useRef } from 'react';

interface ResizeDividerProps {
  label: string;
  orientation: 'vertical' | 'horizontal' | 'auto';
  onResize: (delta: number) => void;
}

export function ResizeDivider({ label, orientation, onResize }: ResizeDividerProps) {
  const last = useRef(0);
  const isHorizontal = () => orientation === 'horizontal' || (orientation === 'auto' && window.matchMedia('(max-width: 767px)').matches);
  return (
    <div
      role="separator"
      aria-label={`${label}. Use arrow keys to resize.`}
      aria-orientation={orientation === 'auto' ? undefined : orientation}
      tabIndex={0}
      className={`resize-divider ${orientation === 'auto' ? 'resize-divider-auto' : orientation === 'horizontal' ? 'resize-divider-horizontal' : 'resize-divider-vertical'}`}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        last.current = isHorizontal() ? event.clientY : event.clientX;
      }}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
        const position = isHorizontal() ? event.clientY : event.clientX;
        const delta = position - last.current;
        last.current = position;
        onResize(delta);
      }}
      onKeyDown={(event) => {
        const key = isHorizontal() ? (event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0) : (event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0);
        if (key) {
          event.preventDefault();
          onResize(key * (event.shiftKey ? 32 : 12));
        }
      }}
    />
  );
}
