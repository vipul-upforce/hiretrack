'use client';

import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ErrorMessage, Form, Formik } from 'formik';
import {
  useGetTimeZoneQuery,
  useUpdateTimeZoneMutation,
} from '@/lib/features/settings';
import React, { useMemo } from 'react';
import { Combobox } from '@/components/ui/combobox';
import { TIMEZONES } from './timezone-utils';
import { timeZoneValidationSchema } from './timezone-schema';
import TimezoneLoadingSkeleton from './loading-skeleton';

export interface TimeZoneValues {
  timeZone: string;
}

export interface TimeZoneSettingsProps {
  onClose: () => void;
}
export default function TimeZoneSelect({ onClose }: TimeZoneSettingsProps) {
  const { toast } = useToast();
  const { data, isFetching, isLoading, refetch } =
    useGetTimeZoneQuery(undefined);
  const [updateTimeZone, { isLoading: isUpdating }] =
    useUpdateTimeZoneMutation();

  const initialTimeZone = useMemo(() => {
    const saved = data?.timezone?.name;
    return TIMEZONES.some((tz) => tz.name === saved)
      ? saved
      : TIMEZONES[0].name;
  }, [data]);

  const initialValues: TimeZoneValues = { timeZone: initialTimeZone };

  const handleSubmit = async (values: TimeZoneValues) => {
    try {
      const selectedTZ = TIMEZONES.find((tz) => tz.name === values.timeZone);
      if (!selectedTZ) throw new Error('Timezone not found');

      await updateTimeZone({
        name: selectedTZ.name,
        offset: selectedTZ.offset,
      }).unwrap();

      toast({ title: 'Success', description: 'Timezone updated successfully' });

      refetch();
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update timezone',
        variant: 'destructive',
      });
    }
  };

  if (isFetching || isLoading) return <TimezoneLoadingSkeleton />;

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={timeZoneValidationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({
        values,
        setFieldValue,
        handleSubmit: formikSubmit,
        isSubmitting,
      }) => {
        const isDirty = values.timeZone !== initialTimeZone;
        const isDisabled = !isDirty || isSubmitting || isUpdating;

        return (
          <Form onSubmit={formikSubmit} className="flex h-full flex-col">
            <div className="px-6 py-4">
              <Label htmlFor="timeZone">Timezone</Label>

              <Combobox
                options={TIMEZONES.map((tz) => ({
                  value: tz.name,
                  label: `${tz.name} (${tz.offset})`,
                }))}
                placeholder="Select a timezone..."
                value={values.timeZone}
                onValueChange={(value) => setFieldValue('timeZone', value)}
                width="100%"
              />

              <ErrorMessage
                name="timeZone"
                component="div"
                className="mt-1 text-sm text-red-500"
              />
            </div>

            <div className="mt-auto flex justify-end gap-2 border-t border-border/10 px-6 py-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting || isUpdating}
              >
                Cancel
              </Button>

              <Button type="submit" disabled={isDisabled} variant="primary">
                {isSubmitting || isUpdating ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </Form>
        );
      }}
    </Formik>
  );
}
