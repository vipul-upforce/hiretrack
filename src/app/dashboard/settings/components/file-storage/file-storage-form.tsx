'use client';

import React from 'react';
import { Formik, Form, ErrorMessage } from 'formik';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FileStorageValues, validationSchema, storageOptions } from './schema';
import { CloudinaryFields } from './partials/cloudinary-fields';
import { S3Fields } from './partials/s3-fields';

interface FileStorageFormProps {
  initialValues: FileStorageValues;
  onSubmit: (values: FileStorageValues) => Promise<void>;
  onTestConnection: (values: FileStorageValues) => void;
  onClose: () => void;
  isSubmitting: boolean;
  isUpdating: boolean;
  isTesting: boolean;
  isConnectionSuccessful: boolean;
}

export default function FileStorageForm({
  initialValues,
  onSubmit,
  onTestConnection,
  onClose,
  isSubmitting,
  isUpdating,
  isTesting,
  isConnectionSuccessful,
}: FileStorageFormProps) {
  return (
    <Formik<FileStorageValues>
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={onSubmit}
      enableReinitialize
    >
      {({ values, setFieldValue }) => (
        <Form className="flex flex-col h-full">
          <div className="px-6 py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fileStorage">Select Storage Option</Label>
              <Select
                value={values.storageType}
                onValueChange={(value) => setFieldValue('storageType', value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select storage option" />
                </SelectTrigger>
                <SelectContent>
                  {storageOptions.map(({ key, label }) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ErrorMessage
                name="storageType"
                component="div"
                className="text-red-500 text-sm"
              />
            </div>

            {values.storageType === 'cloudinary' && (
              <CloudinaryFields
                onTest={onTestConnection}
                isTesting={isTesting}
              />
            )}

            {values.storageType === 's3' && (
              <S3Fields onTest={onTestConnection} isTesting={isTesting} />
            )}
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={
                        values.storageType !== 'local'
                        && (isSubmitting || isUpdating || !isConnectionSuccessful)
                      }
                      title={
                        !isConnectionSuccessful
                          ? 'Test the connection before saving.'
                          : ''
                      }
                    >
                      {isSubmitting || isUpdating ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Test Connection To Make It Enable</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </Form>
      )}
    </Formik>
  );
}
