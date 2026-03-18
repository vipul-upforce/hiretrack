'use client';

import { Label } from '@/components/ui/label';
import type React from 'react';

import { Input } from '@/components/ui/input';
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Card,
} from '@/components/ui/card';
import { ChevronDown, ChevronRight, Filter } from 'lucide-react';
import type { SearchFilter } from '../candidate-search';

interface SalaryExperienceSectionProps {
  values: SearchFilter;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  handleBlur: (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  isSalaryExpanded: boolean;
  setIsSalaryExpanded: (expanded: boolean) => void;
  hasError: (fieldName: string) => boolean;
  getErrorMessage: (fieldName: string) => string;
}

export function SalaryExperienceSection({
  values,
  handleChange,
  handleBlur,
  isSalaryExpanded,
  setIsSalaryExpanded,
  hasError,
  getErrorMessage,
}: SalaryExperienceSectionProps) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle
          className="mx-0 flex cursor-pointer items-center justify-between gap-2 px-0 text-base transition-colors hover:text-primary"
          onClick={() => setIsSalaryExpanded(!isSalaryExpanded)}
        >
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Salary & Experience
          </div>
          {isSalaryExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          Optional ranges for compensation and experience.
        </CardDescription>
      </CardHeader>
      {isSalaryExpanded && (
        <CardContent className="pb-6 pt-0">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Expected CTC Range */}
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <Label className="text-sm font-medium">Expected CTC</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Min</Label>
                  <Input
                    name="minExpectedCTC"
                    placeholder="Min"
                    type="number"
                    step="0.01"
                    value={values.minExpectedCTC || ''}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={
                      hasError('minExpectedCTC')
                        ? 'h-9 border-destructive'
                        : 'h-9'
                    }
                  />
                  {hasError('minExpectedCTC') && (
                    <p className="text-xs text-destructive">
                      {getErrorMessage('minExpectedCTC')}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Max</Label>
                  <Input
                    name="maxExpectedCTC"
                    placeholder="Max"
                    type="number"
                    step="0.01"
                    value={values.maxExpectedCTC || ''}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={
                      hasError('maxExpectedCTC')
                        ? 'h-9 border-destructive'
                        : 'h-9'
                    }
                  />
                  {hasError('maxExpectedCTC') && (
                    <p className="text-xs text-destructive">
                      {getErrorMessage('maxExpectedCTC')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Current CTC Range */}
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <Label className="text-sm font-medium">Current CTC</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Min</Label>
                  <Input
                    name="minCurrentCTC"
                    placeholder="Min"
                    type="number"
                    step="0.01"
                    value={values.minCurrentCTC || ''}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={
                      hasError('minCurrentCTC')
                        ? 'h-9 border-destructive'
                        : 'h-9'
                    }
                  />
                  {hasError('minCurrentCTC') && (
                    <p className="text-xs text-destructive">
                      {getErrorMessage('minCurrentCTC')}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Max</Label>
                  <Input
                    name="maxCurrentCTC"
                    placeholder="Max"
                    type="number"
                    step="0.01"
                    value={values.maxCurrentCTC || ''}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={
                      hasError('maxCurrentCTC')
                        ? 'h-9 border-destructive'
                        : 'h-9'
                    }
                  />
                  {hasError('maxCurrentCTC') && (
                    <p className="text-xs text-destructive">
                      {getErrorMessage('maxCurrentCTC')}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Experience Range */}
            <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
              <Label className="text-sm font-medium">
                Experience (Years)
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Min</Label>
                  <Input
                    name="minExperience"
                    placeholder="Min"
                    type="number"
                    step="0.01"
                    value={values.minExperience || ''}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={
                      hasError('minExperience')
                        ? 'h-9 border-destructive'
                        : 'h-9'
                    }
                  />
                  {hasError('minExperience') && (
                    <p className="text-xs text-destructive">
                      {getErrorMessage('minExperience')}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Max</Label>
                  <Input
                    name="maxExperience"
                    placeholder="Max"
                    type="number"
                    step="0.01"
                    value={values.maxExperience || ''}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    className={
                      hasError('maxExperience')
                        ? 'h-9 border-destructive'
                        : 'h-9'
                    }
                  />
                  {hasError('maxExperience') && (
                    <p className="text-xs text-destructive">
                      {getErrorMessage('maxExperience')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
