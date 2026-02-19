export interface CaptchaValues {
  enableCaptcha: boolean;
  captchaType: 'v2' | 'v3';
  captchaVariant: 'checkbox' | 'invisible';
  siteKey: string;
  secretKey: string;
}

export interface CaptchaFormProps {
  onClose: () => void;
}
