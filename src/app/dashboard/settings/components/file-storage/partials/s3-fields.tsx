'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ErrorMessage, useFormikContext } from 'formik';
import { Button } from '@/components/ui/button';
import { SecretInput } from './secret-input';
import { FileStorageValues } from '../schema';

interface S3FieldsProps {
  onTest: (values: FileStorageValues) => void;
  isTesting: boolean;
}

export function S3Fields({ onTest, isTesting }: S3FieldsProps) {
  const { values, setFieldValue } = useFormikContext<FileStorageValues>();

  return (
    <div className="space-y-3">
      <div>
        <Label htmlFor="awsRegion">AWS Region</Label>
        <Input
          id="awsRegion"
          name="awsRegion"
          value={values.awsRegion}
          onChange={(e) => setFieldValue('awsRegion', e.target.value.trim())}
        />
        <ErrorMessage
          name="awsRegion"
          component="div"
          className="text-red-500 text-sm"
        />
      </div>

      <SecretInput name="awsAccessKeyId" label="AWS Access Key ID" />
      <SecretInput name="awsSecretAccessKey" label="AWS Secret Access Key" />

      <div>
        <Label htmlFor="awsBucketName">AWS Bucket Name</Label>
        <Input
          id="awsBucketName"
          name="awsBucketName"
          value={values.awsBucketName}
          onChange={(e) => setFieldValue('awsBucketName', e.target.value.trim())}
        />
        <ErrorMessage
          name="awsBucketName"
          component="div"
          className="text-red-500 text-sm"
        />
      </div>

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
