'use client';

import React from 'react';
import { Formik, Form } from 'formik';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  HardDrive,
  Cloud,
  Database,
} from 'lucide-react';
import { SectionOption, SectionSwitcher } from '../communication/section-switcher';
import { FileStorageValues, validationSchema } from './schema';
import { CloudinaryFields } from './partials/cloudinary-fields';
import { S3Fields } from './partials/s3-fields';
import { SetupInstructions } from './setup-instructions';
import { LocalStorageInfo } from './partials/local-storage-info';

const storageSections: SectionOption[] = [
  {
    id: 'local',
    title: 'Local Storage',
    description: 'Store files directly on your server disk',
    icon: HardDrive,
    badge: 'Local',
  },
  {
    id: 'cloudinary',
    title: 'Cloudinary',
    description: 'Cloud media storage and delivery',
    icon: Cloud,
    badge: 'Cloud',
  },
  {
    id: 's3',
    title: 'AWS S3',
    description: 'Scalable object storage on AWS',
    icon: Database,
    badge: 'AWS',
  },
];

interface FileStorageFormProps {
  initialValues: FileStorageValues;
  onSubmit: (values: FileStorageValues) => Promise<void>;
  onTestConnection: (values: FileStorageValues) => void;
  onStorageTypeChange: () => void;
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
  onStorageTypeChange,
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
        <Form className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="flex-1 min-h-0 space-y-4 overflow-y-auto px-6 py-4">
            <SectionSwitcher
              options={storageSections}
              activeId={values.storageType}
              showBadge={false}
              onChange={(value) => {
                setFieldValue('storageType', value);
                onStorageTypeChange();
              }}
            />

            {values.storageType !== 'local' && (
              <SetupInstructions storageType={values.storageType} />
            )}

            {values.storageType === 'local' && <LocalStorageInfo />}

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

          <div className="sticky bottom-0 z-20 mt-auto flex justify-end gap-2 border-t border-border/10 bg-background px-6 py-4">
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
