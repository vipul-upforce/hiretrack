import { useField, useFormikContext } from 'formik';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CandidateBasicInfoSection() {
  const { submitCount } = useFormikContext();
  const [nameField, nameMeta] = useField('name');
  const [emailField, emailMeta] = useField('email');
  const [contactField, contactMeta] = useField('contact');
  const [locationField, locationMeta] = useField('location');

  return (
    <div className="space-y-4">
      <div className="pb-2 border-b border-gray-200 dark:border-gray-700 hidden lg:block">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <div className="w-2 h-2 bg-blue-500 rounded-full" />
          Personal Information
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2" data-form-field="name">
          <Label
            htmlFor="name"
            className="text-sm font-semibold text-gray-900 dark:text-gray-100"
          >
            Full Name
            {' '}
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            placeholder="First Name &amp; Last Name"
            {...nameField}
            className={`h-9 px-3 transition-all duration-200 ${
              nameMeta.error && (nameMeta.touched || submitCount > 0)
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20'
            }`}
          />
          {(nameMeta.touched || submitCount > 0) && nameMeta.error && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <span className="w-1 h-1 bg-red-500 rounded-full" />
              {nameMeta.error}
            </p>
          )}
        </div>

        <div className="space-y-2" data-form-field="email">
          <Label
            htmlFor="email"
            className="text-sm font-semibold text-gray-900 dark:text-gray-100"
          >
            Email Address
            {' '}
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Enter email address"
            {...emailField}
            className={`h-9 px-3 transition-all duration-200 ${
              emailMeta.error && (emailMeta.touched || submitCount > 0)
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20'
            }`}
          />
          {(emailMeta.touched || submitCount > 0) && emailMeta.error && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <span className="w-1 h-1 bg-red-500 rounded-full" />
              {emailMeta.error}
            </p>
          )}
        </div>

        <div className="space-y-2" data-form-field="contact">
          <Label
            htmlFor="contact"
            className="text-sm font-semibold text-gray-900 dark:text-gray-100"
          >
            Contact Number
            {' '}
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="contact"
            type="tel"
            placeholder="Enter contact number"
            {...contactField}
            className={`h-9 px-3 transition-all duration-200 ${
              contactMeta.error && (contactMeta.touched || submitCount > 0)
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20'
            }`}
          />
          {(contactMeta.touched || submitCount > 0) && contactMeta.error && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <span className="w-1 h-1 bg-red-500 rounded-full" />
              {contactMeta.error}
            </p>
          )}
        </div>

        <div className="space-y-2" data-form-field="location">
          <Label
            htmlFor="location"
            className="text-sm font-semibold text-gray-900 dark:text-gray-100"
          >
            Current Location
            {' '}
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="location"
            placeholder="Enter location"
            {...locationField}
            className={`h-9 px-3 transition-all duration-200 ${
              locationMeta.error && (locationMeta.touched || submitCount > 0)
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20'
            }`}
          />
          {(locationMeta.touched || submitCount > 0) && locationMeta.error && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <span className="w-1 h-1 bg-red-500 rounded-full" />
              {locationMeta.error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
