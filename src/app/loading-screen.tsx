'use client';

import React from 'react';
import { motion } from 'framer-motion';

function LoadingScreen() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background p-4">
      {/* Background Layer */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(to right,rgb(173, 172, 172) 1px, transparent 1px),
            linear-gradient(to bottom,rgb(173, 172, 172)  1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          backgroundPosition: '0 0, 0 0',
          maskImage: `
            repeating-linear-gradient(
              to right,
              black 0px,
              black 3px,
              transparent 3px,
              transparent 8px
            ),
            repeating-linear-gradient(
              to bottom,
              black 0px,
              black 3px,
              transparent 3px,
              transparent 8px
            ),
            radial-gradient(ellipse 80% 80% at 0% 0%, #000 50%, transparent 90%)
          `,
          WebkitMaskImage: `
            repeating-linear-gradient(
              to right,
              black 0px,
              black 3px,
              transparent 3px,
              transparent 8px
            ),
            repeating-linear-gradient(
              to bottom,
              black 0px,
              black 3px,
              transparent 3px,
              transparent 8px
            ),
            radial-gradient(ellipse 80% 80% at 0% 0%, #000 50%, transparent 90%)
          `,
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in',
        }}
      />

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
