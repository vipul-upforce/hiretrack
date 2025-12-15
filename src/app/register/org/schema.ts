import * as Yup from 'yup';

export interface OrgFormValues {
  name: string;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'admin';
}

export const INITIAL_VALUES: OrgFormValues = {
  name: '',
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'admin',
};

export const OrgRegisterSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .matches(/^(?!\s+$).*/, 'Organization Name cannot be only spaces')
    .min(2, 'Organization Name must be at least 2 characters')
    .max(20, 'Organization name must be 20 characters or fewer')
    .required('Organization Name is required'),
  fullName: Yup.string()
    .trim()
    .matches(/^(?!\s+$).*/, 'Admin name cannot be only spaces')
    .min(2, 'Admin Name must be at least 2 characters long')
    .max(20, 'Admin name must be 20 characters or fewer')
    .required('Admin Name is required'),
  email: Yup.string()
    .trim()
    .email('Invalid Email format')
    .required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .matches(/[a-z]/, 'Password must include at least one lowercase letter')
    .matches(/[A-Z]/, 'Password must include at least one uppercase letter')
    .matches(/\d/, 'Password must include at least one number')
    .matches(
      /[@$!%*?&]/,
      'Password must include at least one special character (@$!%*?&)',
    )
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords do not match')
    .required('Please confirm your password'),
});
