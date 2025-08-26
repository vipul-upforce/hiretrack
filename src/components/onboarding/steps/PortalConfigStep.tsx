"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, ExternalLink, Settings, CheckCircle2, XCircle } from 'lucide-react';
import { useOnboarding } from '../OnboardingProvider';

const PortalConfigStep: React.FC = () => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const { validateStep } = useOnboarding();

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      setIsChecking(true);
      const isValid = await validateStep('portal');
      setIsConfigured(isValid);
      console.log('Portal configuration check result:', isValid);
    } catch (error) {
      console.error('Error checking portal configuration:', error);
      setIsConfigured(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleConfigurePortal = () => {
    window.open('/dashboard/settings/portal', '_blank');
  };

  const configurationItems = [
    "Company/Portal name",
    "Custom logo and favicon", 
    "Brand colors and theme",
    "Custom header/footer content"
  ];

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 rounded-full flex items-center justify-center mx-auto border border-border/50">
          <Globe className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        </div>
        
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">
            Portal Configuration
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Customize your job portal with company branding for candidates.
          </p>
        </div>
      </div>

      {/* Status Card */}
      <Card className={`border-2 ${isConfigured ? 'border-green-500/30 bg-green-50/50 dark:border-green-500/20 dark:bg-green-900/10' : 'border-border'}`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              Portal Branding Status
              {isChecking ? (
                <div className="w-4 h-4 border-2 border-muted-foreground border-t-primary rounded-full animate-spin" />
              ) : isConfigured ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-muted-foreground" />
              )}
            </CardTitle>
            <Badge variant={isConfigured ? "default" : "secondary"} className={isConfigured ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}>
              {isConfigured ? "Configured" : "Not Set"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-foreground mb-2">What you can customize:</h4>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {configurationItems.map((item, index) => (
                  <li key={index} className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <div className="w-1.5 h-1.5 bg-purple-500 dark:bg-purple-400 rounded-full" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
                onClick={handleConfigurePortal}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Configure Portal
                <ExternalLink className="w-3 h-3" />
              </Button>
              
              <Button 
                variant="outline"
                onClick={checkConfiguration}
                disabled={isChecking}
              >
                {isChecking ? "Checking..." : "Refresh Status"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Information Card */}
      <Card className="border-blue-500/30 bg-blue-50/50 dark:border-blue-500/20 dark:bg-blue-900/10">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="w-5 h-5 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mt-0.5 border border-blue-200 dark:border-blue-800">
              <Globe className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100 text-sm">Portal Branding Benefits</h4>
              <p className="text-blue-700 dark:text-blue-200 text-xs mt-1">
                A branded portal creates a professional impression for candidates and helps maintain 
                consistent company identity throughout the application process. You can always update 
                these settings later as your branding evolves.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isConfigured && (
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-900/20 px-4 py-2 rounded-lg border border-green-200 dark:border-green-800">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Portal configuration completed!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortalConfigStep;