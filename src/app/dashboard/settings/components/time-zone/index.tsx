'use client';

import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ErrorMessage, Form, Formik } from 'formik';
import {
  useGetTimeZoneQuery,
  useUpdateTimeZoneMutation,
} from '@/lib/features/settings/settingsApi';
import React, { useMemo } from 'react';
import { Combobox } from '@/components/ui/combobox';
import { TIMEZONES } from './timezone-utils';
import { timeZoneValidationSchema } from './timezone-schema';
import TimezoneLoadingSkeleton from './loading-skeleton';

export interface TimeZoneValues {
  timeZone: string;
}

export default function TimeZoneSelect({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const {
    data, isFetching, isLoading, refetch,
  } = useGetTimeZoneQuery(undefined);
  const [updateTimeZone, { isLoading: isUpdating }] = useUpdateTimeZoneMutation();

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
    } catch (err) {
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
        values, setFieldValue, handleSubmit, isSubmitting,
      }) => {
        const isDirty = values.timeZone !== initialTimeZone;
        const isDisabled = !isDirty || isSubmitting || isUpdating;

        return (
          <Form onSubmit={handleSubmit} className="flex flex-col h-full">
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
                className="text-red-500 text-sm mt-1"
              />
            </div>

            <div className="flex justify-end gap-2 border-t border-border/10 px-6 py-4 mt-auto">
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
