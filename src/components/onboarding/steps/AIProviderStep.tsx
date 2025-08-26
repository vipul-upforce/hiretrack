"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, ExternalLink, Settings, CheckCircle2, XCircle, Zap } from 'lucide-react';
import { useOnboarding } from '../OnboardingProvider';

const AIProviderStep: React.FC = () => {
  const [isConfigured, setIsConfigured] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const { validateStep } = useOnboarding();

  useEffect(() => {
    checkConfiguration();
  }, []);

  const checkConfiguration = async () => {
    try {
      setIsChecking(true);
      const isValid = await validateStep('aiProviders');
      setIsConfigured(isValid);
    } catch (error) {
      console.error('Error checking AI provider configuration:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleConfigureAI = () => {
    window.open('/dashboard/settings', '_blank');
  };

  const aiProviders = [
    { name: "Google Gemini", description: "Fast and cost-effective AI processing" },
    { name: "OpenAI GPT", description: "Industry-leading language models" },
    { name: "Anthropic Claude", description: "Advanced reasoning and analysis" },
    { name: "Perplexity", description: "Research-focused AI with web access" }
  ];

  const features = [
    "Automatic resume parsing and data extraction",
    "Intelligent candidate scoring and ranking", 
    "Skills and experience matching",
    "Candidate evaluation insights"
  ];

  return (
    <div className="space-y-4">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto border border-border/50">
          <Bot className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        </div>
        
        <div>
          <h2 className="text-xl font-bold text-foreground mb-1">
            AI Provider Configuration
          </h2>
          <p className="text-sm text-muted-foreground max-w-xl mx-auto">
            Enable AI-powered resume processing and candidate scoring.
          </p>
        </div>
      </div>

      {/* Status Card */}
      <Card className={`border-2 ${isConfigured ? 'border-green-500/30 bg-green-50/50 dark:border-green-500/20 dark:bg-green-900/10' : 'border-border'}`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              AI Provider Status
              {isChecking ? (
                <div className="w-4 h-4 border-2 border-muted-foreground border-t-primary rounded-full animate-spin" />
              ) : isConfigured ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 dark:text-green-400" />
              ) : (
                <XCircle className="w-5 h-5 text-muted-foreground" />
              )}
            </CardTitle>
            <Badge variant={isConfigured ? "default" : "secondary"} className={isConfigured ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : ""}>
              {isConfigured ? "Active" : "Not Configured"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Available Providers */}
            <div>
              <h4 className="font-medium text-foreground mb-3">Available AI Providers:</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {aiProviders.map((provider, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 border border-border rounded-lg bg-card">
                    <Bot className="w-4 h-4 text-blue-500 dark:text-blue-400 mt-0.5" />
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
                onClick={handleConfigureAI}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Configure AI Providers
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

      {/* AI Features Card */}
      <Card className="border-purple-500/30 bg-purple-50/50 dark:border-purple-500/20 dark:bg-purple-900/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
            <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            AI-Powered Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm text-purple-700 dark:text-purple-200">
                <div className="w-1.5 h-1.5 bg-purple-500 dark:bg-purple-400 rounded-full" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {isConfigured && (
        <div className="text-center">
          <div className="inline-flex items-center space-x-2 text-green-600 dark:text-green-400 bg-green-50/50 dark:bg-green-900/20 px-4 py-2 rounded-lg border border-green-200 dark:border-green-800">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">AI provider configured and ready!</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIProviderStep;