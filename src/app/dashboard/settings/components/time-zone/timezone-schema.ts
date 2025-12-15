import * as Yup from 'yup';
import { TIMEZONES } from './timezone-utils';

export const timeZoneValidationSchema = Yup.object({
  timeZone: Yup.string()
    .required('Timezone is required')
    .oneOf(
      TIMEZONES.map((tz) => tz.name),
      'Invalid timezone',
    ),
});
