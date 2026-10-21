import * as Yup from 'yup';

export const captchaValidationSchema = Yup.object({
  enableCaptcha: Yup.boolean().required(),
  captchaType: Yup.string()
    .oneOf(['v2', 'v3'], 'Captcha type must be v2 or v3')
    .when('enableCaptcha', {
      is: true,
      then: (schema) => schema.required('Captcha type is required'),
      otherwise: (schema) => schema.notRequired(),
    }),
  captchaVariant: Yup.string()
    .oneOf(['checkbox', 'invisible'], 'Captcha variant must be checkbox or invisible')
    .when(['enableCaptcha', 'captchaType'], {
      is: (enableCaptcha: boolean, captchaType: string) =>
        enableCaptcha && captchaType === 'v2',
      then: (schema) => schema.required('Captcha variant is required for v2'),
      otherwise: (schema) => schema.notRequired(),
    }),
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
