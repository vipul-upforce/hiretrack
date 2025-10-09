"use client";
import React from "react";
import { AnimatedGridPattern } from "./auth/login/LoginFormContent";
import { cx } from "@/lib/cx";
import { motion } from "framer-motion";

const LoadingScreen = () => {
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
        initial={false}
        animate={{ opacity: 1, scale: 0.9 }}
        transition={{ duration: 0.5 }}
        className="relative z-[19999] flex flex-col items-center gap-6"
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
};

export default LoadingScreen;
