import * as Yup from 'yup';

export const aboutFormSchema = Yup.object({
  enableAutoUpdate: Yup.boolean(),
});
