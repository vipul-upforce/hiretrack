import * as Yup from 'yup';

export const twoFAValidationSchema = Yup.object({
  enable2FA: Yup.boolean().required(),
});
