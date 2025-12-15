'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ErrorMessage, useFormikContext } from 'formik';
import { Button } from '@/components/ui/button';
import { SecretInput } from './secret-input';
import { FileStorageValues } from '../schema';

interface CloudinaryFieldsProps {
  onTest: (values: FileStorageValues) => void;
  isTesting: boolean;
}

export function CloudinaryFields({ onTest, isTesting }: CloudinaryFieldsProps) {
  const { values, setFieldValue } = useFormikContext<FileStorageValues>();

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="cloudinaryCloudName">Cloud Name</Label>
        <Input
          id="cloudinaryCloudName"
          name="cloudinaryCloudName"
          value={values.cloudinaryCloudName}
          onChange={(e) => setFieldValue('cloudinaryCloudName', e.target.value.trim())}
        />
        <ErrorMessage
          name="cloudinaryCloudName"
          component="div"
          className="text-red-500 text-sm"
        />
      </div>

      <SecretInput name="cloudinaryApiKey" label="Cloudinary API Key" />
      <SecretInput name="cloudinaryApiSecret" label="Cloudinary API Secret" />

      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onTest(values)}
          disabled={isTesting}
        >
          {isTesting ? 'Testing...' : 'Test Credentials'}
        </Button>
      </div>
    </div>
  );
}
