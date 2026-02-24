import React from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SectionProps } from '../types';

export function EnhancedFeaturesSection({
  config,
  updateConfig,
}: SectionProps) {
  const features = [
    {
      id: 'enableConfidence',
      key: 'enableConfidenceScores' as const,
      label: 'Confidence Scores & Evidence Links',
      desc: 'AI provides confidence levels and specific resume sections for each score',
    },
    {
      id: 'enableRedFlags',
      key: 'enableRedFlagsDetection' as const,
      label: 'Red Flags Detection',
      desc: 'Automatically detect potential concerns (gaps, job hopping, salary mismatch)',
    },
    {
      id: 'enableSkills',
      key: 'enableSkillsMatrix' as const,
      label: 'Skills Verification Matrix',
      desc: 'Detailed breakdown of required vs. present skills with evidence',
    },
    // {
    //   id: 'enableRanking',
    //   key: 'enableComparativeRanking' as const,
    //   label: 'Comparative Ranking (Admin Only)',
    //   desc: 'Show candidate rank and percentile within job applicant pool',
    // },
  ];

  return (
    <div className="space-y-4 border-t pt-4">
      <div>
        <h3 className="text-sm font-semibold">Enhanced Evaluation Features</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Enable additional AI-powered insights for better candidate assessment
        </p>
      </div>

      {features.map((feature) => (
        <div
          key={feature.id}
          className="flex items-center justify-between space-x-2"
        >
          <div className="space-y-0.5">
            <Label htmlFor={feature.id}>{feature.label}</Label>
            <p className="text-sm text-muted-foreground">{feature.desc}</p>
          </div>
          <Switch
            id={feature.id}
            checked={!!config[feature.key]}
            onCheckedChange={(val) => updateConfig(feature.key, val)}
          />
        </div>
      ))}
    </div>
  );
}
