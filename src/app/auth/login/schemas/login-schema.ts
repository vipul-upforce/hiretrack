import * as Yup from 'yup';

export const loginSchema = Yup.object({
  email: Yup.string()
    .required('Email is required')
    .email('Invalid email address'),
  password: Yup.string().required('Password is required'),
  rememberMe: Yup.boolean().default(false),
  companyName: Yup.string().optional(),
});

export type LoginSchemaType = Yup.InferType<typeof loginSchema>;
