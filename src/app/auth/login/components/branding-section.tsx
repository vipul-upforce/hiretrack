'use client';

import React from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { BrandingConfig } from '../types';

interface BrandingSectionProps {
  branding: BrandingConfig;
}

export function BrandingSection({ branding }: BrandingSectionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8 }}
      className="mb-6 space-y-6 text-center max-sm:-mt-4 lg:mb-0 lg:text-left"
    >
      <div className="space-y-6 max-sm:space-y-0">
        <div className="flex justify-center max-sm:pt-8 lg:justify-start">
          <div className="relative h-36 w-72 max-sm:w-64">
            {branding.logoUrl && (
              <Image
                src={branding.logoUrl}
                alt={branding.portalName}
                fill
                className="object-contain"
                priority
              />
            )}
          </div>
        </div>

        <h1 className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-4xl font-bold text-transparent lg:text-6xl">
          Smart Hiring
          <br />
          <span
            className="text-transparent"
            style={{
              backgroundImage: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              display: 'inline-block',
            }}
          >
            Made Simple
          </span>
        </h1>

        <p className="mx-auto max-w-md text-lg text-muted-foreground max-sm:pt-4 lg:mx-0">
          Revolutionize your recruitment process with AI-powered candidate
          matching and intelligent screening.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-4 lg:justify-start">
        {['AI Matching', 'Smart Screening', 'Analytics'].map(
          (feature, index) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="flex items-center gap-2 rounded-full border border-border/50 bg-background/50 px-3 py-1 backdrop-blur-sm"
            >
              <Sparkles
                className="h-4 w-4"
                style={{ color: branding.primaryColor }}
              />
              <span className="text-sm">{feature}</span>
            </motion.div>
          ),
        )}
      </div>
    </motion.div>
  );
}
