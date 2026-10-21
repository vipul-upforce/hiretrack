import { useState, useEffect, useCallback } from 'react';

export const useDragToScroll = <T extends HTMLElement>() => {
  const [element, setElement] = useState<T | null>(null);
  const ref = useCallback((node: T | null) => {
    if (node !== null) {
      setElement(node);
    }
  }, []);

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isDndDragging, setIsDndDragging] = useState(false);

  useEffect(() => {
    if (!element) return undefined;

    const onMouseDown = (e: MouseEvent) => {
      if (
        isDndDragging ||
        e.button !== 0 ||
        (e.target as HTMLElement).closest(
          'button, a, input, textarea, [data-rbd-draggable-id]',
        )
      ) {
        return;
      }
      setIsDragging(true);
      setStartX(e.pageX - element.offsetLeft);
      setScrollLeft(element.scrollLeft);
      element.style.cursor = 'grabbing';
      element.style.userSelect = 'none';
    };

    const onMouseLeave = () => {
      setIsDragging(false);
      element.style.removeProperty('user-select');
    };

    const onMouseUp = () => {
      setIsDragging(false);
      element.style.cursor = 'default';
      element.style.removeProperty('user-select');
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || isDndDragging) return;
      e.preventDefault();
      const x = e.pageX - element.offsetLeft;
      const walk = (x - startX) * 1;
      element.scrollLeft = scrollLeft - walk;
    };

    // element.style.cursor = "default";
    element.addEventListener('mousedown', onMouseDown);
    element.addEventListener('mouseleave', onMouseLeave);
    element.addEventListener('mouseup', onMouseUp);
    element.addEventListener('mousemove', onMouseMove);

    return () => {
      element.removeEventListener('mousedown', onMouseDown);
      element.removeEventListener('mouseleave', onMouseLeave);
      element.removeEventListener('mouseup', onMouseUp);
      element.removeEventListener('mousemove', onMouseMove);
      if (element) {
        // element.style.cursor = "default";
      }
    };
  }, [element, isDragging, startX, scrollLeft, isDndDragging]);

  return {
    ref,
    element,
    setIsDndDragging,
    isDragging,
    isDndDragging,
  };
};
