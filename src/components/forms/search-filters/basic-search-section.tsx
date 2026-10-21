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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { SearchFilter } from '../candidate-search';

interface BasicSearchSectionProps {
  values: SearchFilter;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  handleBlur: (
    e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>,
  ) => void;
  setFieldValue: (
    field: string,
    value: string | number | boolean | string[],
  ) => void;
  hasError: (fieldName: string) => boolean;
  getErrorMessage: (fieldName: string) => string;
}

export function BasicSearchSection({
  values,
  handleChange,
  handleBlur,
  setFieldValue,
  hasError,
  getErrorMessage,
}: BasicSearchSectionProps) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-base">Search Basics</CardTitle>
        <CardDescription className="text-xs">
          Find candidates by identity, location, and skills. Combine filters
          with AND/OR.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-12">
          {/* Candidate Name */}
          <div className="space-y-1 lg:col-span-4">
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
              className={
                hasError('name') ? 'h-10 border-destructive' : 'h-10'
              }
            />
            {hasError('name') && (
              <p className="text-xs text-destructive">
                {getErrorMessage('name')}
              </p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-1 lg:col-span-4">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              placeholder="Search by email"
              value={values.email || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              className={
                hasError('email') ? 'h-10 border-destructive' : 'h-10'
              }
            />
            {hasError('email') && (
              <p className="text-xs text-destructive">
                {getErrorMessage('email')}
              </p>
            )}
          </div>

          {/* Contact Number */}
          <div className="space-y-1 lg:col-span-2">
            <Label htmlFor="contact" className="text-sm font-medium">
              Contact Number
            </Label>
            <Input
              id="contact"
              name="contact"
              placeholder="e.g. 9909182854"
              value={values.contact || ''}
              onChange={handleChange}
              onBlur={handleBlur}
              className={
                hasError('contact') ? 'h-10 border-destructive' : 'h-10'
              }
            />
            {hasError('contact') && (
              <p className="text-xs text-destructive">
                {getErrorMessage('contact')}
              </p>
            )}
          </div>

          {/* Location */}
          <div className="space-y-1 lg:col-span-2">
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
              className={
                hasError('location') ? 'h-10 border-destructive' : 'h-10'
              }
            />
            {hasError('location') && (
              <p className="text-xs text-destructive">
                {getErrorMessage('location')}
              </p>
            )}
          </div>

          {/* Skills */}
          <div className="space-y-1 lg:col-span-8">
            <Label className="text-sm font-medium">Skills</Label>
            <ChipInput
              placeholder="Type and press Enter to add skills"
              fullWidth
              value={values.skills}
              onChange={(skills: string | number | boolean | string[]) =>
                setFieldValue('skills', skills)
              }
              onSuggestionClick={(
                suggestion: string | number | boolean | string[],
              ) => {
                setFieldValue('skills', [
                  ...(values.skills || []),
                  suggestion as string,
                ]);
              }}
            />
          </div>

          {/* Logic Operator */}
          <div className="space-y-1 lg:col-span-4">
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
                  hasError('logicOperator')
                    ? 'h-10 border-destructive'
                    : 'h-10'
                }
              >
                <SelectValue placeholder="Select logic operator" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="$and">AND (Match all filters)</SelectItem>
                <SelectItem value="$or">OR (Match any filter)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Controls how all filters are combined.
            </p>
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
