import { useField, useFormikContext } from 'formik';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { normalizeCTCToLPA, formatCTCAsLPA } from '@/lib/ctc-normalizer';

export function CandidateProfessionalDetailsSection() {
  const { setFieldValue, submitCount, errors } = useFormikContext();
  const [expectedCTCField, expectedCTCMeta] = useField('expectedCTC');
  const [currentCTCField, currentCTCMeta] = useField('currentCTC');
  const [noticePeriodField, noticePeriodMeta] = useField('noticePeriod');

  const [convertedExpectedCTC, setConvertedExpectedCTC] = useState<number | null>(null);
  const [convertedCurrentCTC, setConvertedCurrentCTC] = useState<number | null>(null);
  const [showExpectedCTCWarning, setShowExpectedCTCWarning] = useState(false);
  const [showCurrentCTCWarning, setShowCurrentCTCWarning] = useState(false);

  useEffect(() => {
    if (submitCount > 0) {
      if (convertedExpectedCTC !== null) {
        setFieldValue('expectedCTC', convertedExpectedCTC);
      }
      if (convertedCurrentCTC !== null) {
        setFieldValue('currentCTC', convertedCurrentCTC);
      }
    }
  }, [submitCount, convertedExpectedCTC, convertedCurrentCTC, setFieldValue]);

  return (
    <div className="space-y-4">
      <div className="pb-2 border-b border-gray-200 dark:border-gray-700 hidden lg:block">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <div className="w-2 h-2 bg-purple-500 rounded-full" />
          Professional Details
        </h3>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2" data-form-field="expectedCTC">
          <div className="flex flex-col">
            <Label
              htmlFor="expectedCTC"
              className="text-sm font-semibold text-gray-900 dark:text-gray-100"
            >
              Expected CTC (LPA)
              {' '}
              <span className="text-red-500">*</span>
            </Label>
          </div>
          <Input
            id="expectedCTC"
            placeholder="Enter expected CTC in LPA"
            type="text"
            {...expectedCTCField}
            onChange={(e) => {
              const inputValue = e.target.value;
              if (inputValue === '' || /^[\d,.\s]*$/.test(inputValue)) {
                setFieldValue('expectedCTC', inputValue);
                if (inputValue) {
                  const normalizedValue = normalizeCTCToLPA(inputValue);
                  setConvertedExpectedCTC(normalizedValue);
                  setShowExpectedCTCWarning(true);
                } else {
                  setShowExpectedCTCWarning(false);
                }
              }
            }}
            onBlur={(e) => {
              if (e.target.value) {
                const normalizedValue = normalizeCTCToLPA(e.target.value);
                setConvertedExpectedCTC(normalizedValue);
                setShowExpectedCTCWarning(true);
              } else {
                setShowExpectedCTCWarning(false);
              }
              expectedCTCField.onBlur(e);
            }}
            className={`h-9 px-3 transition-all duration-200 ${
              expectedCTCMeta.error && (expectedCTCMeta.touched || submitCount > 0)
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20'
            }`}
          />
          {(expectedCTCMeta.touched || submitCount > 0) && expectedCTCMeta.error && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <span className="w-1 h-1 bg-red-500 rounded-full" />
              {expectedCTCMeta.error}
            </p>
          )}
          {showExpectedCTCWarning && convertedExpectedCTC !== null && (
            <p className="text-sm text-orange-500 flex items-center gap-1 mt-1">
              <span className="w-1 h-1 bg-orange-500 rounded-full" />
              Will be saved as
              {' '}
              {formatCTCAsLPA(convertedExpectedCTC)}
            </p>
          )}
        </div>

        <div className="space-y-2" data-form-field="currentCTC">
          <div className="flex flex-col">
            <Label
              htmlFor="currentCTC"
              className="text-sm font-semibold text-gray-900 dark:text-gray-100"
            >
              Current CTC (LPA)
              {' '}
              <span className="text-red-500">*</span>
            </Label>
          </div>
          <Input
            id="currentCTC"
            placeholder="Enter current CTC in LPA"
            type="text"
            {...currentCTCField}
            onChange={(e) => {
              const inputValue = e.target.value;
              if (inputValue === '' || /^[\d,.\s]*$/.test(inputValue)) {
                setFieldValue('currentCTC', inputValue);
                if (inputValue) {
                  const normalizedValue = normalizeCTCToLPA(inputValue);
                  setConvertedCurrentCTC(normalizedValue);
                  setShowCurrentCTCWarning(true);
                } else {
                  setShowCurrentCTCWarning(false);
                }
              }
            }}
            onBlur={(e) => {
              if (e.target.value) {
                const normalizedValue = normalizeCTCToLPA(e.target.value);
                setConvertedCurrentCTC(normalizedValue);
                setShowCurrentCTCWarning(true);
              } else {
                setShowCurrentCTCWarning(false);
              }
              currentCTCField.onBlur(e);
            }}
            className={`h-9 px-3 transition-all duration-200 ${
              currentCTCMeta.error && (currentCTCMeta.touched || submitCount > 0)
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20'
            }`}
          />
          {(currentCTCMeta.touched || submitCount > 0) && currentCTCMeta.error && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <span className="w-1 h-1 bg-red-500 rounded-full" />
              {currentCTCMeta.error}
            </p>
          )}
          {showCurrentCTCWarning && convertedCurrentCTC !== null && (
            <p className="text-sm text-orange-500 flex items-center gap-1 mt-1">
              <span className="w-1 h-1 bg-orange-500 rounded-full" />
              Will be saved as
              {' '}
              {formatCTCAsLPA(convertedCurrentCTC)}
            </p>
          )}
        </div>

        <div
          className="space-y-2 col-span-1 lg:col-span-2"
          data-form-field="noticePeriod"
        >
          <Label
            htmlFor="noticePeriod"
            className="text-sm font-semibold text-gray-900 dark:text-gray-100"
          >
            Notice Period (days)
            {' '}
            <span className="text-red-500">*</span>
          </Label>
          <Input
            id="noticePeriod"
            placeholder="Enter notice period in days"
            type="number"
            {...noticePeriodField}
            className={`h-9 px-3 transition-all duration-200 w-full lg:max-w-xs ${
              noticePeriodMeta.error && (noticePeriodMeta.touched || submitCount > 0)
                ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500/20'
            }`}
          />
          {(noticePeriodMeta.touched || submitCount > 0) && noticePeriodMeta.error && (
            <p className="text-sm text-red-500 flex items-center gap-1">
              <span className="w-1 h-1 bg-red-500 rounded-full" />
              {noticePeriodMeta.error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
