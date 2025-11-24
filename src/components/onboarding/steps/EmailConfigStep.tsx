"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, ExternalLink, Settings, CheckCircle2, XCircle } from 'lucide-react';
import { useOnboarding } from '../OnboardingProvider';

const EmailConfigStep: React.FC = () => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const { validateStep } = useOnboarding();

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      setIsChecking(true);
      const isValid = await validateStep('email');
      setIsConfigured(isValid);
    } catch (error) {
      console.error('Error checking email configuration:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleConfigureEmail = () => {
    window.open('/dashboard/settings?config=mail', '_blank');
  };

  const emailProviders = [
    { name: "SMTP", description: "Connect your existing email server" },
    { name: "Resend", description: "Modern email API with excellent deliverability" },
    { name: "Brevo", description: "All-in-one email marketing platform" }
  ];

  const emailTypes = [
    "Application confirmations",
    "Interview invitations", 
    "Status update notifications",
    "Team assignment alerts"
  ];

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-full flex items-center justify-center mx-auto border border-border/50">
          <Mail className="w-6 h-6 text-green-600 dark:text-green-400" />
        </div>
        
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">
            Email Configuration
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Configure automated notifications for candidates and team members.
          </p>
        </div>
      </div>

      {/* Status Card */}
      <Card className={`border-2 ${isConfigured ? 'border-green-500/30 bg-green-50/50 dark:border-green-500/20 dark:bg-green-900/10' : 'border-border'}`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              Email Provider Status
              {isChecking ? (
                <div className="w-4 h-4 border-2 border-muted-foreground border-t-primary rounded-full animate-spin" />
              ) : isConfigured ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-muted-foreground" />
              )}
            </CardTitle>
            <Badge variant={isConfigured ? "default" : "secondary"} className={isConfigured ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}>
              {isConfigured ? "Connected" : "Not Set"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Available Providers */}
            <div>
              <h4 className="font-medium text-foreground mb-3">Supported Email Providers:</h4>
              <div className="grid grid-cols-1 gap-3">
                {emailProviders.map((provider, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 border border-border rounded-lg bg-card">
                    <Mail className="w-4 h-4 text-green-500 dark:text-green-400 mt-0.5" />
                    <div>
                      <div className="font-medium text-sm text-foreground">{provider.name}</div>
                      <div className="text-xs text-muted-foreground">{provider.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button 
              variant='primary'
                onClick={handleConfigureEmail}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Configure Email
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

      {/* Email Types Card */}
      <Card className="border-blue-500/30 bg-blue-50/50 dark:border-blue-500/20 dark:bg-blue-900/10">
        <CardContent className="p-4">
          <div className="space-y-3">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 text-sm">Automated Email Types:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {emailTypes.map((type, index) => (
                <div key={index} className="flex items-center space-x-2 text-sm text-blue-700 dark:text-blue-200">
                  <div className="w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full" />
                  <span>{type}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {isConfigured && (
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-900/20 px-4 py-2 rounded-lg border border-green-200 dark:border-green-800">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Email provider connected!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmailConfigStep;