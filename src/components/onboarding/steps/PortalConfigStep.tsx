'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Globe,
  ExternalLink,
  Settings,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import logger from '@/lib/logger';
import { useOnboarding } from '../OnboardingProvider';

function PortalConfigStep() {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const { validateStep } = useOnboarding();

  const checkConfiguration = async () => {
    try {
      setIsChecking(true);
      const isValid = await validateStep('portal');
      setIsConfigured(isValid);
    } catch (error) {
      logger.error('Error checking portal configuration:', error);
      setIsConfigured(false);
    } finally {
      setIsChecking(false);
    }
  };
  useEffect(() => {
    checkConfiguration();
  }, []);

  const handleConfigurePortal = () => {
    window.open('/dashboard/settings/portal', '_blank');
  };

  const configurationItems = [
    'Company/Portal name',
    'Custom logo and favicon',
    'Brand colors and theme',
    'Custom header/footer content',
  ];

  const getStatusIcon = () => {
    if (isChecking) {
      return (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
      );
    }
    if (isConfigured) {
      return (
        <CheckCircle2 className="h-5 w-5 text-green-500 dark:text-green-400" />
      );
    }
    return <XCircle className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/50 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30">
          <Globe className="h-6 w-6 text-purple-600 dark:text-purple-400" />
        </div>

        <div>
          <h2 className="mb-1 text-xl font-bold text-foreground">
            Portal Configuration
          </h2>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground">
            Customize your job portal with company branding for candidates.
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
              Portal Branding Status
              {getStatusIcon()}
            </CardTitle>
            <Badge
              variant={isConfigured ? 'default' : 'secondary'}
              className={
                isConfigured
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                  : ''
              }
            >
              {isConfigured ? 'Configured' : 'Not Set'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 font-medium text-foreground">
                What you can customize:
              </h4>
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {configurationItems.map((item) => (
                  <li
                    key={item}
                    className="flex items-center space-x-2 text-sm text-muted-foreground"
                  >
                    <div className="h-1.5 w-1.5 rounded-full bg-purple-500 dark:bg-purple-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="primary"
                onClick={handleConfigurePortal}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Configure Portal
                <ExternalLink className="h-3 w-3" />
              </Button>

              <Button
                variant="outline"
                onClick={checkConfiguration}
                disabled={isChecking}
              >
                {isChecking ? 'Checking...' : 'Refresh Status'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="border-blue-500/30 bg-blue-50/50 dark:border-blue-500/20 dark:bg-blue-900/10">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-blue-200 bg-blue-100 dark:border-blue-800 dark:bg-blue-900/40">
              <Globe className="h-3 w-3 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Portal Branding Benefits
              </h4>
              <p className="mt-1 text-xs text-blue-700 dark:text-blue-200">
                A branded portal creates a professional impression for
                candidates and helps maintain consistent company identity
                throughout the application process. You can always update these
                settings later as your branding evolves.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isConfigured && (
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 rounded-lg border border-green-200 bg-green-50/50 px-4 py-2 text-green-600 dark:border-green-800 dark:bg-green-900/20 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm font-medium">
              Portal configuration completed!
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default PortalConfigStep;
