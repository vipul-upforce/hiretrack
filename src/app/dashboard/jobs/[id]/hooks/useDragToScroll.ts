import { useRef, useEffect, useState } from "react";

export const useDragToScroll = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [isDndDragging, setIsDndDragging] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const onMouseDown = (e: MouseEvent) => {
      if (
        isDndDragging ||
        e.button !== 0 ||
        (e.target as HTMLElement).closest(
          "button, a, input, textarea, [data-rbd-draggable-id]"
        )
      ) {
        return;
      }
      setIsDragging(true);
      setStartX(e.pageX - element.offsetLeft);
      setScrollLeft(element.scrollLeft);
      element.style.removeProperty("user-select");
      // element.style.userSelect = "grabbing";
    };

    const onMouseLeave = () => {
      setIsDragging(false);
      element.style.removeProperty("user-select");
    };

    const onMouseUp = () => {
      setIsDragging(false);
      element.style.removeProperty("user-select");
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || isDndDragging) return;
      e.preventDefault();
      const x = e.pageX - element.offsetLeft;
      const walk = (x - startX) * 1;
      element.scrollLeft = scrollLeft - walk;
    };

    element.addEventListener("mousedown", onMouseDown);
    element.addEventListener("mouseleave", onMouseLeave);
    element.addEventListener("mouseup", onMouseUp);
    element.addEventListener("mousemove", onMouseMove);

    // if (element.style.cursor !== "grabbing") {
    //   element.style.cursor = "default";
    // }

    return () => {
      element.removeEventListener("mousedown", onMouseDown);
      element.removeEventListener("mouseleave", onMouseLeave);
      element.removeEventListener("mouseup", onMouseUp);
      element.removeEventListener("mousemove", onMouseMove);
    };
  }, [isDragging, startX, scrollLeft, isDndDragging]);

  return { ref, setIsDndDragging };
};
