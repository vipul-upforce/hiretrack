"use client";

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ErrorMessage, Form, Formik } from "formik";
import * as Yup from "yup";
import {
  useGetTimeZoneQuery,
  useUpdateTimeZoneMutation,
} from "@/lib/features/settings/settingsApi";
import React from "react";
import moment from "moment-timezone";
import { Combobox } from "@/components/ui/combobox";

interface TimeZone {
  name: string;
  offset: string;
}

// Generate timezone array with names and offsets
const TIMEZONES: TimeZone[] = moment.tz
  .names()
  .map((name) => {
    const offsetMinutes = moment.tz.zone(name)?.utcOffset(0) || 0;
    const hours = Math.floor(Math.abs(offsetMinutes) / 60);
    const minutes = (Math.abs(offsetMinutes) % 60).toFixed(0);
    const sign = offsetMinutes <= 0 ? "+" : "-";
    const offset = `GMT${sign}${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}`;
    return { name, offset };
  })
  .sort((a, b) => {
    // Sort by offset first, then by name
    const offsetA = parseFloat(a.offset.replace("GMT", "").replace(":", "."));
    const offsetB = parseFloat(b.offset.replace("GMT", "").replace(":", "."));
    return offsetA - offsetB || a.name.localeCompare(b.name);
  });

export interface TimeZoneValues {
  timeZone: string;
}

const validationSchema = Yup.object({
  timeZone: Yup.string()
    .required("Timezone is required")
    .oneOf(
      TIMEZONES.map((tz) => tz.name),
      "Invalid timezone"
    ),
});

export default function TimeZoneSelect({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const { data, isLoading, refetch } = useGetTimeZoneQuery(undefined);
  const [updateTimeZone, { isLoading: isUpdating }] =
    useUpdateTimeZoneMutation();

  React.useEffect(() => {
    refetch();
  }, [refetch]);

  const initialValues: TimeZoneValues = {
    timeZone:
      data?.timezone?.name &&
      TIMEZONES.some((tz) => tz.name === data.timezone.name)
        ? data.timezone.name
        : TIMEZONES[0].name,
  };

  const handleSubmit = async (values: TimeZoneValues) => {
    try {
      if (values.timeZone) {
        const selectedTimeZone = TIMEZONES.find(
          (tz) => tz.name === values.timeZone
        );

        if (!selectedTimeZone) {
          throw new Error("Selected timezone not found");
        }

        const dataToSubmit = {
          name: values.timeZone.trim(),
          offset: selectedTimeZone.offset,
        };

        await updateTimeZone(dataToSubmit).unwrap();
        toast({
          title: "Success",
          description: "Timezone updated successfully",
        });
        refetch();
        onClose();
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to update timezone settings",
        variant: "destructive",
      });
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <Formik<TimeZoneValues>
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({
        values,
        setFieldValue,
        handleSubmit,
        isSubmitting,
        errors,
        touched,
      }) => (
        <Form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timeZone">Timezone</Label>
            <div>
              <Combobox
                options={TIMEZONES.map((tz) => ({
                  value: tz.name,
                  label: `${tz.name} (${tz.offset})`,
                }))}
                placeholder="Select a timezone..."
                value={values.timeZone}
                onValueChange={(value) => setFieldValue("timeZone", value)}
                width="100%"
              />
            </div>
            <ErrorMessage
              name="timeZone"
              component="div"
              className="text-red-500 text-sm"
            />
          </div>

          <div className="w-full flex justify-end">
            <Button
              type="submit"
              disabled={isSubmitting || isUpdating}
              variant="primary"
            >
              {isSubmitting || isUpdating ? "Saving..." : "Save"}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
