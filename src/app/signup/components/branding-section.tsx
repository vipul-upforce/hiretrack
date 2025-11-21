"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

interface BrandingSectionProps {
  logoUrl: string;
  portalName: string;
  portalError: boolean;
  primaryColor: string;
  secondaryColor: string;
}

export const BrandingSection = ({
  logoUrl,
  portalName,
  portalError,
  primaryColor,
  secondaryColor,
}: BrandingSectionProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.8 }}
      className="text-center lg:text-left space-y-6 flex flex-col items-center lg:items-start w-full"
    >
      <div className="space-y-4 w-full">
        {/* Logo Section */}
        <div className="flex justify-center lg:justify-start mb-4">
          <div className="relative w-48 h-24 lg:w-72 lg:h-36">
            {logoUrl && (
              <Image
                src={logoUrl}
                alt={portalName || (portalError ? "HireTrack" : "")}
                fill
                className="object-contain"
                priority
              />
            )}
          </div>
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent leading-tight">
          Join Our
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
            }}
          >
            Talent Pool
          </span>
        </h1>

        <p className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto lg:mx-0">
          Create your profile to apply to all future job openings and track your
          application status in one place.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
        {["Fast Apply", "Profile Matching", "Career Growth"].map(
          (feature, index) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="flex items-center gap-2 px-3 py-1 bg-background/50 backdrop-blur-sm rounded-full border border-border/50"
            >
              <Sparkles className="w-4 h-4" style={{ color: primaryColor }} />
              <span className="text-xs sm:text-sm">{feature}</span>
            </motion.div>
          )
        )}
      </div>
    </motion.div>
  );
};
