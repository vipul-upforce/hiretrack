export interface CaptchaValues {
  enableCaptcha: boolean;
  siteKey: string;
  secretKey: string;
}

export interface CaptchaFormProps {
  onClose: () => void;
}
