import { Form, FormikProps, ErrorMessage } from 'formik';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { CaptchaValues } from './types';

interface CaptchaFormViewProps {
  formik: FormikProps<CaptchaValues>;
  onClose: () => void;
  isUpdating: boolean;
  isPermissionDenied: boolean;
}

export default function CaptchaForm({
  formik,
  onClose,
  isUpdating,
  isPermissionDenied,
}: CaptchaFormViewProps) {
  const {
    values, setFieldValue, isSubmitting, handleSubmit,
  } = formik;

  return (
    <Form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="px-6 py-4 space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="enableCaptcha"
            checked={values.enableCaptcha}
            onCheckedChange={(checked) => setFieldValue('enableCaptcha', Boolean(checked))}
            disabled={isPermissionDenied}
          />
          <Label htmlFor="enableCaptcha">Enable CAPTCHA</Label>
        </div>
        <ErrorMessage
          name="enableCaptcha"
          component="div"
          className="text-red-500 text-sm"
        />

        {values.enableCaptcha && (
          <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col space-y-2">
              <Label htmlFor="siteKey">CAPTCHA Site Key</Label>
              <Input
                id="siteKey"
                name="siteKey"
                value={values.siteKey}
                onChange={(e) => setFieldValue('siteKey', e.target.value)}
                placeholder="Enter reCAPTCHA site key"
                disabled={isPermissionDenied}
              />
              <ErrorMessage
                name="siteKey"
                component="div"
                className="text-red-500 text-sm"
              />
            </div>
            <div className="flex flex-col space-y-2">
              <Label htmlFor="secretKey">CAPTCHA Secret Key</Label>
              <Input
                id="secretKey"
                name="secretKey"
                value={values.secretKey}
                onChange={(e) => setFieldValue('secretKey', e.target.value)}
                placeholder="Enter reCAPTCHA secret key"
                disabled={isPermissionDenied}
              />
              <ErrorMessage
                name="secretKey"
                component="div"
                className="text-red-500 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 border-t border-border/10 px-6 py-4 mt-auto">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting || isUpdating}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || isUpdating || isPermissionDenied}
          variant="primary"
        >
          {isSubmitting || isUpdating ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </Form>
  );
}
