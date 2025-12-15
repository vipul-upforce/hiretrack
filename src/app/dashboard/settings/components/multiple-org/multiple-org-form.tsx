'use client';

import React from 'react';
import { Formik, Form, ErrorMessage } from 'formik';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MultipleOrgsValues, multipleOrgSchema } from './schema';

interface MultipleOrgFormProps {
  initialValues: MultipleOrgsValues;
  onSubmit: (values: MultipleOrgsValues) => Promise<void>;
  onClose: () => void;
  isSubmitting: boolean;
  isReadOnly: boolean;
}

export default function MultipleOrgForm({
  initialValues,
  onSubmit,
  onClose,
  isSubmitting,
  isReadOnly,
}: MultipleOrgFormProps) {
  return (
    <Formik<MultipleOrgsValues>
      initialValues={initialValues}
      validationSchema={multipleOrgSchema}
      onSubmit={onSubmit}
      enableReinitialize
    >
      {({ values, setFieldValue }) => (
        <Form className="flex flex-col h-full">
          <div className="px-6 py-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="multipleOrg"
                checked={values.multipleOrg}
                disabled={isReadOnly || isSubmitting}
                onCheckedChange={(checked) => setFieldValue('multipleOrg', Boolean(checked))}
              />
              <Label
                htmlFor="multipleOrg"
                className={isReadOnly ? 'text-muted-foreground' : ''}
              >
                Allow multiple organizations
              </Label>
            </div>
            <ErrorMessage
              name="multipleOrg"
              component="div"
              className="text-red-500 text-sm mt-1"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-border/10 px-6 py-4 mt-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || isReadOnly}
              variant="primary"
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}
