'use client';

import { Label } from '@/components/ui/label';
import type React from 'react';

import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ChipInput } from '@/components/ui/chip-input';
import { Card, CardContent } from '@/components/ui/card';
import type { SearchFilter } from '../candidate-search';

interface BasicSearchSectionProps {
  values: SearchFilter;
  errors: Record<string, any>;
  touched: Record<string, any>;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  handleBlur: (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>
  ) => void;
  setFieldValue: (field: string, value: any) => void;
  hasError: (fieldName: string) => boolean;
  getErrorMessage: (fieldName: string) => string;
}

export function BasicSearchSection({
  values,
  errors,
  touched,
  handleChange,
  handleBlur,
  setFieldValue,
  hasError,
  getErrorMessage,
}: BasicSearchSectionProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Candidate Name */}
          <div className="space-y-1">
            <Label htmlFor="name" className="text-sm font-medium">
              Candidate Name
            </Label>
            <Input
              id="name"
              name="name"
              placeholder="Search by name"
              value={values.name || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              className={hasError('name') ? 'border-destructive' : ''}
            />
            {hasError('name') && (
              <p className="text-xs text-destructive">
                {getErrorMessage('name')}
              </p>
            )}
          </div>

          {/* Location */}
          <div className="space-y-1">
            <Label htmlFor="location" className="text-sm font-medium">
              Location
            </Label>
            <Input
              id="location"
              name="location"
              placeholder="City, State"
              value={values.location || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              className={hasError('location') ? 'border-destructive' : ''}
            />
            {hasError('location') && (
              <p className="text-xs text-destructive">
                {getErrorMessage('location')}
              </p>
            )}
          </div>

          {/* Skills */}
          <div className="space-y-1">
            <Label className="text-sm font-medium">Skills</Label>
            <ChipInput
              placeholder="Type and press Enter to add skills"
              fullWidth
              value={values.skills}
              onChange={(skills: any) => setFieldValue('skills', skills)}
              onSuggestionClick={(suggestion: any) => {
                setFieldValue('skills', [...(values.skills || []), suggestion]);
              }}
            />
          </div>

          {/* Logic Operator */}
          <div className="space-y-1">
            <Label htmlFor="logicOperator" className="text-sm font-medium">
              Logic Operator
            </Label>
            <Select
              name="logicOperator"
              value={values.logicOperator || '$and'}
              onValueChange={(value) => setFieldValue('logicOperator', value)}
            >
              <SelectTrigger
                className={
                  hasError('logicOperator') ? 'border-destructive' : ''
                }
              >
                <SelectValue placeholder="Select logic operator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="$and">AND (Match all filters)</SelectItem>
                <SelectItem value="$or">OR (Match any filter)</SelectItem>
              </SelectContent>
            </Select>
            {hasError('logicOperator') && (
              <p className="text-xs text-destructive">
                {getErrorMessage('logicOperator')}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
