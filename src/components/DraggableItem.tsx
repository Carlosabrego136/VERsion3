import { useRef, useState, useCallback, ReactNode } from 'react';

interface DraggableItemProps {
  children: ReactNode;
  x: number;
  y: number;
  onMove: (x: number, y: number) => void;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  className?: string;
  style?: React.CSSProperties;
}

export default function DraggableItem({ children, x, y, onMove, containerRef, className = '', style }: DraggableItemProps) {
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const itemRef = useRef<HTMLDivElement>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = itemRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const container = containerRef?.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const newX = e.clientX - rect.left - dragOffset.x;
    const newY = e.clientY - rect.top - dragOffset.y;
    onMove(Math.max(0, newX), Math.max(0, newY));
  }, [dragging, dragOffset, containerRef, onMove]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  return (
    <div
      ref={itemRef}
      className={`absolute cursor-grab select-none ${dragging ? 'cursor-grabbing z-50' : ''} ${className}`}
      style={{ left: x, top: y, ...style }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {children}
    </div>
  );
}
