import * as Yup from 'yup';

export const captchaValidationSchema = Yup.object({
  enableCaptcha: Yup.boolean().required(),
  siteKey: Yup.string().when('enableCaptcha', {
    is: true,
    then: (schema) => schema.required('Site key is required'),
    otherwise: (schema) => schema.notRequired(),
  }),
  secretKey: Yup.string().when('enableCaptcha', {
    is: true,
    then: (schema) => schema.required('Secret key is required'),
    otherwise: (schema) => schema.notRequired(),
  }),
});
