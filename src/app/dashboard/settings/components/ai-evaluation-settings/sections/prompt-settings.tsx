import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { SectionProps } from '../types';
import { DEFAULT_PROMPT } from '../constants';

export function PromptSettingsSection({ config, updateConfig }: SectionProps) {
  <div className="space-y-4 border-t pt-4">
    {/* Custom Prompt Toggle */}
    <div className="flex items-center justify-between space-x-2">
      <div className="space-y-0.5">
        <Label htmlFor="useCustom">Use custom evaluation prompt</Label>
        <p className="text-sm text-muted-foreground">
          Override the default prompt with your own criteria
        </p>
      </div>
      <Switch
        id="useCustom"
        checked={config.useCustomPrompt}
        onCheckedChange={(val) => updateConfig('useCustomPrompt', val)}
      />
    </div>

    {/* Custom Prompt Editor */}
    {config.useCustomPrompt && (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="customPrompt">Custom Evaluation Prompt</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => updateConfig('customPrompt', DEFAULT_PROMPT)}
            className="text-xs"
          >
            Load Sample Prompt
          </Button>
        </div>
        <Textarea
          id="customPrompt"
          value={config.customPrompt}
          onChange={(e) => updateConfig('customPrompt', e.target.value)}
          placeholder={DEFAULT_PROMPT}
          rows={12}
          className="font-mono text-sm"
        />
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <strong>Available placeholders:</strong> {'{{'} JOB_TITLE {'}}'},{' '}
            {'{{'} JOB_DESCRIPTION
            {'}}'},{'{{'} EXPERIENCE
            {'}}'},{'{{'} CTC_RANGE {'}}'}, {'{{'} REQUIRED_SKILLS {'}}'},{' '}
            {'{{'} JOB_SALARY {'}}'},{'{{'} CANDIDATE_CURRENT_CTC
            {'}}'},{'{{'} CANDIDATE_EXPECTED_CTC {'}}'}
            <br />
            <strong>Required JSON format:</strong> The prompt must ensure the AI
            returns a JSON with: overall, skills, experience, contact,
            affordability, strengths, areas_for_improvement, recommendation,
            notes
          </AlertDescription>
        </Alert>
      </div>
    )}
  </div>;
}
