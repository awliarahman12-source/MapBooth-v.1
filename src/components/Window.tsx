import { useRef, useCallback, type ReactNode } from 'react';
import type { WindowState } from '@/types';

interface WindowProps {
  id: string;
  title: string;
  state: WindowState;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onFocus: () => void;
  onDragEnd: (top: number, left: number) => void;
  onResizeEnd: (width: number, height: number) => void;
  resizeAspectRatio?: number;
  children: ReactNode;
  bodyClassName?: string;
  bodyStyle?: React.CSSProperties;
}

const DRAG_THRESHOLD = 5;

export default function Window({
  title,
  state,
  onClose,
  onMinimize,
  onMaximize,
  onFocus,
  onDragEnd,
  onResizeEnd,
  resizeAspectRatio,
  children,
  bodyClassName,
  bodyStyle,
}: WindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    initLeft: number;
    initTop: number;
    pointerId: number;
    moved: boolean;
  } | null>(null);

  const handleHeaderPointerDown = useCallback((e: React.PointerEvent) => {
    if (state.fullscreen) return;
    if ((e.target as HTMLElement).closest('.traffic-btn')) return;
    onFocus();

    const winEl = windowRef.current;
    const bodyEl = bodyRef.current;
    if (!winEl || !bodyEl) return;

    const pointerId = e.pointerId;
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initLeft: state.left,
      initTop: state.top,
      pointerId,
      moved: false,
    };

    try {
      (e.target as HTMLElement).setPointerCapture(pointerId);
    } catch {
      // ignore
    }
    bodyEl.style.pointerEvents = 'none';

    let cleaned = false;

    const handlePointerMove = (ev: PointerEvent) => {
      if (!dragRef.current || ev.pointerId !== pointerId || !winEl) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;

      if (!dragRef.current.moved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) {
        return;
      }
      if (!dragRef.current.moved) {
        dragRef.current.moved = true;
      }

      const newLeft = dragRef.current.initLeft + dx;
      const newTop = dragRef.current.initTop + dy;

      const maxLeft = window.innerWidth - 80;
      const minLeft = -(winEl.offsetWidth - 80);
      const maxTop = window.innerHeight - 40;
      const minTop = 30;

      const clampedLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));
      const clampedTop = Math.max(minTop, Math.min(maxTop, newTop));

      winEl.style.left = `${clampedLeft}px`;
      winEl.style.top = `${clampedTop}px`;
      winEl.style.transition = 'none';
    };

    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      if (dragRef.current && winEl) {
        winEl.style.transition = '';
        if (dragRef.current.moved) {
          onDragEnd(
            parseInt(winEl.style.top) || state.top,
            parseInt(winEl.style.left) || state.left,
          );
        }
      }
      if (bodyEl) bodyEl.style.pointerEvents = '';
      dragRef.current = null;
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', cleanup);
      document.removeEventListener('pointercancel', cleanup);
      window.removeEventListener('blur', cleanup);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', cleanup);
    document.addEventListener('pointercancel', cleanup);
    window.addEventListener('blur', cleanup);
  }, [state.fullscreen, state.left, state.top, state.width, onFocus, onDragEnd]);

  const handleResizePointerDown = useCallback((e: React.PointerEvent) => {
    if (state.fullscreen) return;
    e.stopPropagation();
    e.preventDefault();
    onFocus();

    const winEl = windowRef.current;
    const bodyEl = bodyRef.current;
    if (!winEl || !bodyEl) return;

    const pointerId = e.pointerId;
    const startW = winEl.offsetWidth;
    const startH = winEl.offsetHeight;
    const startX = e.clientX;
    const startY = e.clientY;

    try {
      (e.target as HTMLElement).setPointerCapture(pointerId);
    } catch {
      // ignore
    }
    bodyEl.style.pointerEvents = 'none';

    let cleaned = false;

    const handlePointerMove = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId || !winEl) return;
      const minimumWidth = 340;
      const minimumHeight = 220;
      let newW = Math.max(minimumWidth, startW + (ev.clientX - startX));
      let newH = Math.max(minimumHeight, startH + (ev.clientY - startY));

      if (resizeAspectRatio) {
        const widthFromHeight = newH * resizeAspectRatio;
        const heightFromWidth = newW / resizeAspectRatio;
        const deltaX = ev.clientX - startX;
        const deltaY = ev.clientY - startY;
        if (Math.abs(deltaX) >= Math.abs(deltaY * resizeAspectRatio)) {
          newH = Math.max(minimumHeight, heightFromWidth);
        } else {
          newW = Math.max(minimumWidth, widthFromHeight);
        }
      }

      const maxWidth = Math.max(minimumWidth, window.innerWidth - winEl.offsetLeft);
      const maxHeight = Math.max(minimumHeight, window.innerHeight - winEl.offsetTop);
      if (resizeAspectRatio) {
        const boundedWidth = Math.min(newW, maxWidth, maxHeight * resizeAspectRatio);
        newW = Math.max(minimumWidth, boundedWidth);
        newH = newW / resizeAspectRatio;
      } else {
        newW = Math.min(newW, maxWidth);
        newH = Math.min(newH, maxHeight);
      }

      winEl.style.width = `${newW}px`;
      winEl.style.height = `${newH}px`;
      winEl.style.transition = 'none';
    };

    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      if (winEl) {
        winEl.style.transition = '';
        onResizeEnd(winEl.offsetWidth, winEl.offsetHeight);
      }
      if (bodyEl) bodyEl.style.pointerEvents = '';
      overlay.remove();
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', cleanup);
      document.removeEventListener('pointercancel', cleanup);
      window.removeEventListener('blur', cleanup);
    };

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;cursor:nwse-resize;background:transparent;touch-action:none;';
    document.body.appendChild(overlay);

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', cleanup);
    document.addEventListener('pointercancel', cleanup);
    window.addEventListener('blur', cleanup);
  }, [state.fullscreen, onFocus, onResizeEnd, resizeAspectRatio]);

  const classes = ['app-window'];
  if (state.closed) classes.push('closed');
  if (state.minimized) classes.push('minimized');
  if (state.fullscreen) classes.push('fullscreen');

  const style: React.CSSProperties = state.fullscreen
    ? { zIndex: state.zIndex }
    : {
        top: state.top,
        left: state.left,
        width: state.width,
        height: state.height,
        zIndex: state.zIndex,
      };

  return (
    <div ref={windowRef} className={classes.join(' ')} style={style} onMouseDown={onFocus}>
      <div
        className="window-header"
        onPointerDown={handleHeaderPointerDown}
        style={{ touchAction: 'none' }}
      >
        <div className="traffic-btn btn-close" onClick={(e) => { e.stopPropagation(); onClose(); }} />
        <div className="traffic-btn btn-min" onClick={(e) => { e.stopPropagation(); onMinimize(); }} />
        <div className="traffic-btn btn-max" onClick={(e) => { e.stopPropagation(); onMaximize(); }} />
        <span className="window-title">{title}</span>
      </div>
      <div ref={bodyRef} className={`window-body ${bodyClassName || ''}`} style={bodyStyle}>
        {children}
      </div>
      {!state.fullscreen && (
        <div
          onPointerDown={handleResizePointerDown}
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: '16px',
            height: '16px',
            cursor: 'nwse-resize',
            zIndex: 10,
            touchAction: 'none',
          }}
        />
      )}
    </div>
  );
}
