import { Form, FormikProps, ErrorMessage } from 'formik';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CaptchaValues } from './types';
import { SetupInstructions } from './setup-instructions';

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
  const { values, setFieldValue, isSubmitting, handleSubmit } = formik;
  const isConfigured = Boolean(
    values.enableCaptcha &&
    values.siteKey &&
    values.secretKey &&
    values.captchaType &&
    (values.captchaType === 'v3' || values.captchaVariant),
  );

  return (
    <Form
      onSubmit={handleSubmit}
      className="flex h-full min-h-0 flex-col overflow-hidden"
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
        <SetupInstructions
          captchaType={values.captchaType}
          captchaVariant={values.captchaVariant}
          isConfigured={isConfigured}
        />

        <div className="space-y-4">
          <div className="flex flex-col space-y-2">
            <Label htmlFor="captchaType">CAPTCHA Type</Label>
            <Select
              value={values.captchaType}
              onValueChange={(value) =>
                setFieldValue('captchaType', value as 'v2' | 'v3')
              }
              disabled={isPermissionDenied}
            >
              <SelectTrigger id="captchaType">
                <SelectValue placeholder="Select CAPTCHA type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="v2">reCAPTCHA v2</SelectItem>
                <SelectItem value="v3">reCAPTCHA v3</SelectItem>
              </SelectContent>
            </Select>
            <ErrorMessage
              name="captchaType"
              component="div"
              className="text-sm text-red-500"
            />
          </div>

          {values.captchaType === 'v2' && (
            <div className="flex flex-col space-y-2">
              <Label htmlFor="captchaVariant">CAPTCHA Variant (v2 only)</Label>
              <Select
                value={values.captchaVariant}
                onValueChange={(value) =>
                  setFieldValue(
                    'captchaVariant',
                    value as 'checkbox' | 'invisible',
                  )
                }
                disabled={isPermissionDenied}
              >
                <SelectTrigger id="captchaVariant">
                  <SelectValue placeholder="Select CAPTCHA variant" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checkbox">
                    Checkbox (&quot;I am not a robot&quot;)
                  </SelectItem>
                  <SelectItem value="invisible">Invisible (Badge)</SelectItem>
                </SelectContent>
              </Select>
              <ErrorMessage
                name="captchaVariant"
                component="div"
                className="text-sm text-red-500"
              />
            </div>
          )}

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
              className="text-sm text-red-500"
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
              className="text-sm text-red-500"
            />
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enableCaptcha"
                checked={values.enableCaptcha}
                onCheckedChange={(checked) =>
                  setFieldValue('enableCaptcha', Boolean(checked))
                }
                disabled={isPermissionDenied}
              />
              <Label htmlFor="enableCaptcha">Enable CAPTCHA</Label>
            </div>
            <ErrorMessage
              name="enableCaptcha"
              component="div"
              className="text-sm text-red-500"
            />
          </div>
        </div>
      </div>

      <div className="mt-auto flex justify-end gap-2 border-t border-border/10 px-6 py-4">
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
