import * as Yup from 'yup';

export const storageOptions = [
  { key: 'local', label: 'Local Storage' },
  { key: 'cloudinary', label: 'Cloudinary' },
  { key: 's3', label: 'AWS S3' },
];

export interface FileStorageValues {
  storageType: string;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
  awsRegion: string;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsBucketName: string;
}

export const validationSchema = Yup.object({
  storageType: Yup.string()
    .oneOf(
      storageOptions.map((option) => option.key),
      'Invalid storage type',
    )
    .required('Storage type is required'),

  cloudinaryCloudName: Yup.string()
    .trim()
    .when('storageType', {
      is: 'cloudinary',
      then: (schema) => schema.required('Cloud name is required'),
      otherwise: (schema) => schema.notRequired(),
    }),

  cloudinaryApiKey: Yup.string()
    .trim()
    .when('storageType', {
      is: 'cloudinary',
      then: (schema) => schema.required('API Key is required'),
      otherwise: (schema) => schema.notRequired(),
    }),

  cloudinaryApiSecret: Yup.string()
    .trim()
    .when('storageType', {
      is: 'cloudinary',
      then: (schema) => schema.required('API Secret is required'),
      otherwise: (schema) => schema.notRequired(),
    }),

  awsRegion: Yup.string()
    .trim()
    .when('storageType', {
      is: 's3',
      then: (schema) => schema.required('AWS Region is required'),
      otherwise: (schema) => schema.notRequired(),
    }),

  awsAccessKeyId: Yup.string()
    .trim()
    .when('storageType', {
      is: 's3',
      then: (schema) => schema.required('AWS Access Key ID is required'),
      otherwise: (schema) => schema.notRequired(),
    }),

  awsSecretAccessKey: Yup.string()
    .trim()
    .when('storageType', {
      is: 's3',
      then: (schema) => schema.required('AWS Secret Access Key is required'),
      otherwise: (schema) => schema.notRequired(),
    }),

  awsBucketName: Yup.string()
    .trim()
    .when('storageType', {
      is: 's3',
      then: (schema) => schema.required('AWS Bucket Name is required'),
      otherwise: (schema) => schema.notRequired(),
    }),
});
