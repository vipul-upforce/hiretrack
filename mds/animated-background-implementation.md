# Animated Background Implementation for Login Page

This document contains the complete implementation of the beautiful animated background from the login page, including all components, styling, and configuration options.

## Table of Contents

- [Overview](#overview)
- [Components](#components)
- [Implementation](#implementation)
- [Dependencies](#dependencies)
- [Customization](#customization)
- [Features](#features)

## Overview

The animated background consists of multiple layers working together:

1. **AnimatedGridPattern**: SVG-based grid with fading squares
2. **FlickeringGrid**: Canvas-based grid with flickering animation
3. **Gradient Orbs**: Large blurred gradient circles
4. **Mask Effects**: CSS masks for radial gradient effects

## Components

### 1. AnimatedGridPattern Component

```tsx
interface AnimatedGridPatternProps {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  strokeDasharray?: any;
  numSquares?: number;
  className?: string;
  maxOpacity?: number;
  duration?: number;
  repeatDelay?: number;
}

function AnimatedGridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  numSquares = 50,
  className,
  maxOpacity = 0.5,
  duration = 4,
  repeatDelay = 0.5,
  ...props
}: AnimatedGridPatternProps) {
  const id = React.useId();
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [squares, setSquares] = useState(() => generateSquares(numSquares));

  function getPos() {
    return [
      Math.floor((Math.random() * dimensions.width) / width),
      Math.floor((Math.random() * dimensions.height) / height),
    ];
  }

  function generateSquares(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      pos: getPos(),
    }));
  }

  const updateSquarePosition = (id: number) => {
    setSquares((currentSquares) =>
      currentSquares.map((sq) =>
        sq.id === id
          ? {
              ...sq,
              pos: getPos(),
            }
          : sq
      )
    );
  };

  useEffect(() => {
    if (dimensions.width && dimensions.height) {
      setSquares(generateSquares(numSquares));
    }
  }, [dimensions, numSquares]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, [containerRef]);

  return (
    <svg
      ref={containerRef}
      aria-hidden="true"
      className={cx(
        "pointer-events-none absolute inset-0 h-full w-full fill-gray-400/30 stroke-gray-400/30",
        className
      )}
      {...props}
    >
      <defs>
        <pattern
          id={id}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
      <svg x={x} y={y} className="overflow-visible">
        {squares.map(({ pos: [x, y], id }, index) => (
          <motion.rect
            initial={{ opacity: 0 }}
            animate={{ opacity: maxOpacity }}
            transition={{
              duration,
              repeat: 1,
              delay: index * 0.1,
              repeatType: "reverse",
            }}
            onAnimationComplete={() => updateSquarePosition(id)}
            key={`${x}-${y}-${index}`}
            width={width - 1}
            height={height - 1}
            x={x * width + 1}
            y={y * height + 1}
            fill="currentColor"
            strokeWidth="0"
          />
        ))}
      </svg>
    </svg>
  );
}
```

### 2. FlickeringGrid Component

```tsx
interface FlickeringGridProps {
  squareSize?: number;
  gridGap?: number;
  flickerChance?: number;
  color?: string;
  width?: number;
  height?: number;
  className?: string;
  maxOpacity?: number;
}

const FlickeringGrid: React.FC<FlickeringGridProps> = ({
  squareSize = 4,
  gridGap = 6,
  flickerChance = 0.3,
  color = "rgb(0, 0, 0)",
  width,
  height,
  className,
  maxOpacity = 0.3,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  const memoizedColor = React.useMemo(() => {
    const toRGBA = (color: string) => {
      if (typeof window === "undefined") {
        return `rgba(0, 0, 0,`;
      }
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d");
      if (!ctx) return "rgba(255, 0, 0,";
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = Array.from(ctx.getImageData(0, 0, 1, 1).data);
      return `rgba(${r}, ${g}, ${b},`;
    };
    return toRGBA(color);
  }, [color]);

  const setupCanvas = useCallback(
    (canvas: HTMLCanvasElement, width: number, height: number) => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      const cols = Math.floor(width / (squareSize + gridGap));
      const rows = Math.floor(height / (squareSize + gridGap));

      const squares = new Float32Array(cols * rows);
      for (let i = 0; i < squares.length; i++) {
        squares[i] = Math.random() * maxOpacity;
      }

      return { cols, rows, squares, dpr };
    },
    [squareSize, gridGap, maxOpacity]
  );

  const updateSquares = useCallback(
    (squares: Float32Array, deltaTime: number) => {
      for (let i = 0; i < squares.length; i++) {
        if (Math.random() < flickerChance * deltaTime) {
          squares[i] = Math.random() * maxOpacity;
        }
      }
    },
    [flickerChance, maxOpacity]
  );

  const drawGrid = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      width: number,
      height: number,
      cols: number,
      rows: number,
      squares: Float32Array,
      dpr: number
    ) => {
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = "transparent";
      ctx.fillRect(0, 0, width, height);

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const opacity = squares[i * rows + j];
          ctx.fillStyle = `${memoizedColor}${opacity})`;
          ctx.fillRect(
            i * (squareSize + gridGap) * dpr,
            j * (squareSize + gridGap) * dpr,
            squareSize * dpr,
            squareSize * dpr
          );
        }
      }
    },
    [memoizedColor, squareSize, gridGap]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let gridParams: ReturnType<typeof setupCanvas>;

    const updateCanvasSize = () => {
      const newWidth = width || container.clientWidth;
      const newHeight = height || container.clientHeight;
      setCanvasSize({ width: newWidth, height: newHeight });
      gridParams = setupCanvas(canvas, newWidth, newHeight);
    };

    updateCanvasSize();

    let lastTime = 0;
    const animate = (time: number) => {
      if (!isInView) return;

      const deltaTime = (time - lastTime) / 1000;
      lastTime = time;

      updateSquares(gridParams.squares, deltaTime);
      drawGrid(
        ctx,
        canvas.width,
        canvas.height,
        gridParams.cols,
        gridParams.rows,
        gridParams.squares,
        gridParams.dpr
      );
      animationFrameId = requestAnimationFrame(animate);
    };

    const resizeObserver = new ResizeObserver(() => {
      updateCanvasSize();
    });

    resizeObserver.observe(container);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0 }
    );

    intersectionObserver.observe(canvas);

    if (isInView) {
      animationFrameId = requestAnimationFrame(animate);
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
    };
  }, [setupCanvas, updateSquares, drawGrid, width, height, isInView]);

  return (
    <div ref={containerRef} className={`w-full h-full ${className}`}>
      <canvas
        ref={canvasRef}
        className="pointer-events-none"
        style={{
          width: canvasSize.width,
          height: canvasSize.height,
        }}
      />
    </div>
  );
};
```

## Implementation

### Main Background Implementation

```tsx
// In your main component
return (
  <div className="min-h-screen w-full bg-background relative overflow-hidden flex items-center justify-center p-4">
    {/* Animated Background */}
    <div className="absolute inset-0">
      <AnimatedGridPattern
        numSquares={30}
        maxOpacity={0.1}
        duration={3}
        repeatDelay={1}
        className={cx(
          "[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]",
          "inset-x-0 inset-y-[-30%] h-[200%] skew-y-12"
        )}
      />
      <FlickeringGrid
        className="absolute inset-0 size-full opacity-50"
        squareSize={4}
        gridGap={6}
        color={primaryColor}
        maxOpacity={0.3}
        flickerChance={0.1}
      />
    </div>

    {/* Gradient Orbs */}
    <div
      className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full blur-3xl animate-pulse"
      style={{
        background: `linear-gradient(135deg, ${primaryColor}20, ${secondaryColor}20)`,
      }}
    />
    <div
      className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse delay-1000"
      style={{
        background: `linear-gradient(225deg, ${secondaryColor}15, ${primaryColor}15)`,
      }}
    />

    {/* Your content goes here */}
    <div className="relative z-10">{/* Your form or content */}</div>
  </div>
);
```

### Loading State Implementation

```tsx
// Loading state with animated background
if (isLoadingPortal) {
  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated Background for loading state */}
      <div className="absolute inset-0">
        <AnimatedGridPattern
          numSquares={30}
          maxOpacity={0.05}
          duration={3}
          repeatDelay={1}
          className={cx(
            "[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]",
            "inset-x-0 inset-y-[-30%] h-[200%] skew-y-12"
          )}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex flex-col items-center gap-6"
      >
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-primary/20 to-primary/5 animate-pulse" />
          <div className="absolute inset-2">
            <div className="w-full h-full rounded-full border-3 border-primary/30 border-t-primary animate-spin" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground animate-pulse">
            Please wait...
          </p>
        </div>
      </motion.div>
    </div>
  );
}
```

## Dependencies

### Required Packages

```json
{
  "dependencies": {
    "framer-motion": "^10.0.0",
    "react": "^18.0.0",
    "lucide-react": "^0.263.0"
  }
}
```

### Required Imports

```tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { cx } from "@/lib/cx"; // Utility for class merging
```

## Customization

### AnimatedGridPattern Options

| Parameter     | Type   | Default | Description                    |
| ------------- | ------ | ------- | ------------------------------ |
| `width`       | number | 40      | Width of each grid cell        |
| `height`      | number | 40      | Height of each grid cell       |
| `numSquares`  | number | 50      | Number of animated squares     |
| `maxOpacity`  | number | 0.5     | Maximum opacity of squares     |
| `duration`    | number | 4       | Animation duration in seconds  |
| `repeatDelay` | number | 0.5     | Delay between animation cycles |

### FlickeringGrid Options

| Parameter       | Type   | Default        | Description                |
| --------------- | ------ | -------------- | -------------------------- |
| `squareSize`    | number | 4              | Size of each grid square   |
| `gridGap`       | number | 6              | Gap between grid squares   |
| `flickerChance` | number | 0.3            | Probability of flickering  |
| `color`         | string | "rgb(0, 0, 0)" | Color of grid squares      |
| `maxOpacity`    | number | 0.3            | Maximum opacity of squares |

### Gradient Orbs Customization

```tsx
// Customize gradient orbs
const primaryColor = "#6366f1";
const secondaryColor = "#8b5cf6";

// Position and size
<div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full blur-3xl animate-pulse">
  {/* Custom gradient */}
</div>;
```

## Features

### 🎨 **Multi-Layered Animation**

- SVG-based grid pattern with fading squares
- Canvas-based flickering grid
- Gradient orbs with pulse animation
- CSS mask effects for radial gradients

### ⚡ **Performance Optimized**

- Uses `requestAnimationFrame` for smooth animations
- Intersection observers for viewport detection
- Resize observers for responsive behavior
- Canvas-based rendering for complex effects

### 🎯 **Responsive Design**

- Adapts to container size changes
- Maintains aspect ratios
- Works on different screen sizes
- Optimized for mobile and desktop

### 🎛️ **Highly Customizable**

- Configurable colors, sizes, and timing
- Adjustable animation parameters
- Theme-aware color integration
- Modular component structure

### 🔧 **Developer Friendly**

- TypeScript support with full type definitions
- Clean component interfaces
- Well-documented props
- Easy to integrate and extend

## Usage Examples

### Basic Implementation

```tsx
import { AnimatedGridPattern, FlickeringGrid } from "./components";

function LoginPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedGridPattern />
      <FlickeringGrid />
      {/* Your content */}
    </div>
  );
}
```

### Advanced Customization

```tsx
function CustomBackground() {
  const primaryColor = "#6366f1";
  const secondaryColor = "#8b5cf6";

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedGridPattern
        numSquares={50}
        maxOpacity={0.2}
        duration={5}
        className="opacity-30"
      />
      <FlickeringGrid
        squareSize={6}
        gridGap={8}
        flickerChance={0.2}
        color={primaryColor}
        maxOpacity={0.4}
      />
      {/* Custom gradient orbs */}
      <div
        className="absolute top-1/3 left-1/3 w-96 h-96 rounded-full blur-3xl animate-pulse"
        style={{
          background: `linear-gradient(135deg, ${primaryColor}30, ${secondaryColor}30)`,
        }}
      />
    </div>
  );
}
```

## Browser Support

- ✅ Chrome/Chromium (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Performance Notes

- The canvas-based `FlickeringGrid` is optimized for 60fps animations
- SVG animations use GPU acceleration when available
- Intersection observers prevent unnecessary rendering when off-screen
- Resize observers ensure smooth scaling on window resize

## Troubleshooting

### Common Issues

1. **Animation not smooth**: Ensure `requestAnimationFrame` is supported
2. **Canvas not rendering**: Check if canvas context is available
3. **Performance issues**: Reduce `numSquares` or `flickerChance`
4. **Color not applying**: Verify color format (hex, rgb, etc.)

### Debug Tips

- Use browser dev tools to monitor frame rates
- Check console for canvas context errors
- Verify all dependencies are installed
- Test on different devices and browsers

---

This implementation provides a sophisticated, multi-layered animated background that creates an engaging and professional visual experience for your login page or any other application.
