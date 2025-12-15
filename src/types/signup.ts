export interface SignupFormValues {
  email: string;
  password: string;
  name: string;
  confirmPassword: string;
  role: '' | 'hr' | 'interviewer' | 'admin';
  organizationId: object | string | number;
}
