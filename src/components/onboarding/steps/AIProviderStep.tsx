'use client';

import React, { useState, useEffect } from 'react';
import AICommunicationSettings from '@/app/dashboard/settings/components/communication/ai-settings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import logger from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Bot, Settings, CheckCircle2, XCircle, Zap } from 'lucide-react';
import { useOnboarding } from '../OnboardingProvider';

function AIProviderStep() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { validateStep, invalidateStepCache } = useOnboarding();

  const checkConfiguration = async (forceRefresh = false) => {
    try {
      setIsChecking(true);
      // Invalidate cache before validating to ensure fresh data
      if (forceRefresh) {
        invalidateStepCache('aiProviders');
      }
      const isValid = await validateStep('aiProviders', forceRefresh);
      setIsConfigured(isValid);
    } catch (error) {
      logger.error('Error checking AI provider configuration:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkConfiguration();
  }, []);

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
  };

  const handleCloseDialog = async () => {
    setIsDialogOpen(false);
    // Re-validate the step after closing the dialog with force refresh
    // to ensure we get the latest configuration status
    await checkConfiguration(true);
  };

  const handleDialogOpenChange = async (open: boolean) => {
    if (!open) {
      await handleCloseDialog();
    } else {
      setIsDialogOpen(true);
    }
  };

  const aiProviders = [
    {
      name: 'Google Gemini',
      description: 'Premium evaluation provider with strong document understanding',
    },
    { name: 'OpenAI GPT', description: 'High-quality evaluation and scoring models' },
    {
      name: 'Anthropic Claude',
      description: 'Advanced reasoning for candidate analysis',
    },
    { name: 'Perplexity', description: 'Context-rich model support for evaluation workflows' },
  ];

  const features = [
    'Main AI provider setup for candidate evaluation and scoring',
    'Free-tier bulk AI pool option for cost-optimized high-volume CV processing',
    'Bulk CV pipeline support for automated resume parsing',
    'Enhanced evaluation toggles: confidence scores, red flags, skills matrix',
    'Custom prompts and temperature tuning for organization-level evaluation',
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/50 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30">
          <Bot className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>

        <div>
          <h2 className="mb-1 text-xl font-bold text-foreground">
            AI Provider Configuration
          </h2>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground">
            Configure your primary evaluation AI provider and choose a bulk CV strategy, including the free-tier AI pool for high-volume intake.
          </p>
        </div>
      </div>

      {/* Status Card */}
      <Card
        className={`border-2 ${isConfigured ? 'border-green-500/30 bg-green-50/50 dark:border-green-500/20 dark:bg-green-900/10' : 'border-border'}`}
      >
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg text-foreground">
              AI Provider Status
              {isChecking && (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
              )}
              {!isChecking && isConfigured && (
                <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400" />
              )}
              {!isChecking && !isConfigured && (
                <XCircle className="h-5 w-5 text-muted-foreground" />
              )}
            </CardTitle>
            <Badge
              variant={isConfigured ? 'default' : 'secondary'}
              className={
                isConfigured
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : ''
              }
            >
              {isConfigured ? 'Active' : 'Not Configured'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Available Providers */}
            <div>
              <h4 className="mb-3 font-medium text-foreground">
                Available AI Providers:
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {aiProviders.map((provider) => (
                  <div
                    key={provider.name}
                    className="flex items-start space-x-3 rounded-lg border border-border bg-card p-3"
                  >
                    <Bot className="mt-0.5 h-4 w-4 text-blue-500 dark:text-blue-400" />
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {provider.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {provider.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="primary"
                onClick={handleOpenDialog}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Configure AI Settings
              </Button>

              <Button
                variant="outline"
                onClick={() => checkConfiguration(true)}
                disabled={isChecking}
              >
                {isChecking ? 'Checking...' : 'Refresh Status'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Features Card */}
      <Card className="border-purple-500/30 bg-purple-50/50 dark:border-purple-500/20 dark:bg-purple-900/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            AI-Powered Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature}
                className="flex items-center space-x-2 text-sm text-purple-700 dark:text-purple-200"
              >
                <div className="h-1.5 w-1.5 rounded-full bg-purple-500 dark:bg-purple-400" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isConfigured && (
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 rounded-lg border border-green-200 bg-green-50/50 px-4 py-2 text-green-600 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">
              AI provider configured and ready!
            </span>
          </div>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          size="2xl"
          className="flex max-h-[90vh] flex-col overflow-hidden p-0"
        >
          <DialogHeader className="px-6 py-4 pr-12">
            <DialogTitle>AI Provider Configuration</DialogTitle>
            <DialogDescription>
              Configure main AI providers, open the Bulk CV AI pool tab, and tune evaluation settings in one place.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden overflow-y-auto px-6 py-0">
            <AICommunicationSettings onClose={handleCloseDialog} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AIProviderStep;
