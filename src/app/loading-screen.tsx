'use client';

import React from 'react';
import { cx } from '@/lib/cx';
import { motion } from 'framer-motion';
import { AnimatedGridPattern } from './auth/login/components/animated-background';

function LoadingScreen() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background p-4">
      {/* Animated Background for loading state */}
      <div className="absolute inset-0">
        <AnimatedGridPattern
          numSquares={30}
          maxOpacity={0.05}
          duration={3}
          // repeatDelay={1}
          className={cx(
            '[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]',
            'inset-x-0 inset-y-[-30%] h-[200%] skew-y-12',
          )}
        />
      </div>

      <motion.div
        initial={false}
        animate={{ opacity: 1, scale: 0.9 }}
        transition={{ duration: 0.5 }}
        className="relative z-[19999] flex flex-col items-center gap-6"
      >
        <div className="relative">
          <div className="from-primary/20 to-primary/5 h-20 w-20 animate-pulse rounded-full bg-gradient-to-tr" />
          <div className="absolute inset-2">
            <div className="border-3 border-primary/30 h-full w-full animate-spin rounded-full border-t-primary" />
          </div>
        </div>
        <div className="space-y-2 text-center">
          <p className="animate-pulse text-sm text-muted-foreground">
            Please wait...
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default LoadingScreen;
