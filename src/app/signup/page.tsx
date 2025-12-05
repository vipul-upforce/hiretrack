'use client';

import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useSignupLogic } from './hooks/useSignupLogic';
import { BackgroundEffects } from './components/background-effects';
import { BrandingSection } from './components/branding-section';
import { SignupForm } from './components/signup-form';

function LoadingState() {
  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0">
        <div className="w-full h-full bg-background" />
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
        <p className="text-sm text-muted-foreground animate-pulse">
          Please wait...
        </p>
      </motion.div>
    </div>
  );
}

function SignupContent() {
  const { portalSettings, getLogoUrl } = useSignupLogic();

  if (portalSettings.isLoading) {
    return <LoadingState />;
  }

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden flex items-center justify-center p-4">
      <BackgroundEffects primaryColor={portalSettings.primaryColor} />

      {/* Gradient Orbs */}
      <div
        className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full blur-3xl animate-pulse hidden lg:block"
        style={{
          background: `linear-gradient(135deg, ${portalSettings.primaryColor}20, ${portalSettings.secondaryColor}20)`,
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl animate-pulse delay-1000 hidden lg:block"
        style={{
          background: `linear-gradient(225deg, ${portalSettings.secondaryColor}15, ${portalSettings.primaryColor}15)`,
        }}
      />

      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border border-border shadow-sm hover:bg-background/90"
        />
      </div>

      {/* Main Grid Content */}
      <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
        {/* Left Side */}
        <BrandingSection
          logoUrl={getLogoUrl()}
          portalName={portalSettings.portalName}
          portalError={portalSettings.hasError}
          primaryColor={portalSettings.primaryColor}
          secondaryColor={portalSettings.secondaryColor}
        />

        {/* Right Side */}
        <SignupForm />
      </div>
    </div>
  );
}

export default function Signup() {
  return (
    <Suspense fallback={<LoadingState />}>
      <SignupContent />
    </Suspense>
  );
}
