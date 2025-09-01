"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Palette, ExternalLink, CheckCircle2 } from "lucide-react";
import { useOnboarding } from "../OnboardingProvider";

const CustomFieldsStep: React.FC = () => {
  const [isConfigured, setIsConfigured] = useState(false);
  const { validateStep } = useOnboarding();

  useEffect(() => {
    validateStep("customFields").then(setIsConfigured);
  }, [validateStep]);

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-gradient-to-br from-pink-100 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30 rounded-full flex items-center justify-center mx-auto border border-border/50">
          <Palette className="w-6 h-6 text-pink-600 dark:text-pink-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">
            Custom Fields
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Create custom form fields for jobs and candidate applications.
          </p>
        </div>
      </div>

      <Card
        className={`border-2 ${isConfigured ? "border-green-500/30 bg-green-50/50 dark:border-green-500/20 dark:bg-green-900/10" : "border-border"}`}
      >
        <CardContent className="p-6">
          <Button
            onClick={() =>
              window.open("/dashboard/settings?config=cf", "_blank")
            }
            className="flex items-center gap-2"
          >
            Configure Custom Fields
            <ExternalLink className="w-4 h-4" />
          </Button>

          {isConfigured && (
            <div className="mt-4 flex items-center gap-2 text-green-600 dark:text-green-400">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">
                Custom fields created!
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomFieldsStep;
