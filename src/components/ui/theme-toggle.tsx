'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

export function ThemeToggle({
  className,
  variant = 'ghost',
  size = 'default',
  showLabel = false,
}: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  const toggleTheme = async (event: React.MouseEvent<HTMLButtonElement>) => {
    const newTheme = theme === 'light' ? 'dark' : 'light';

    if (
      !document.startViewTransition
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setTheme(newTheme);
      return;
    }

    const x = event.clientX;
    const y = event.clientY;

    const right = window.innerWidth - x;
    const bottom = window.innerHeight - y;
    const maxRadius = Math.hypot(Math.max(x, right), Math.max(y, bottom));

    const transition = document.startViewTransition(async () => {
      setTheme(newTheme);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${maxRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 500,
          easing: 'ease-in-out',
          pseudoElement: '::view-transition-new(root)',
        },
      );
    });
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn('group relative overflow-hidden', className)}
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      <div className="relative flex h-4 w-4 items-center justify-center">
        <Sun
          className={cn(
            'absolute h-[1.2rem] w-[1.2rem] transition-all duration-500 ease-spring',
            theme === 'dark'
              ? '-rotate-90 scale-0 opacity-0'
              : 'rotate-0 scale-100 opacity-100',
          )}
        />
        <Moon
          className={cn(
            'absolute h-[1.2rem] w-[1.2rem] transition-all duration-500 ease-spring',
            theme === 'dark'
              ? 'rotate-0 scale-100 opacity-100'
              : 'rotate-90 scale-0 opacity-0',
          )}
        />
      </div>

      {showLabel && (
        <span className="ml-2 font-medium transition-all">
          {theme === 'light' ? 'Light' : 'Dark'}
        </span>
      )}

      <span className="absolute inset-0 -z-10 bg-primary/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </Button>
  );
}
