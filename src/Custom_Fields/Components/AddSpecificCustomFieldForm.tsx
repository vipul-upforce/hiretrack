/* eslint-disable max-lines */
import {
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Select,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Formik, FormikHelpers } from 'formik';
import React, {
  useEffect,
  useState,
  useContext,
  memo,
  useCallback,
} from 'react';
import { CustomField } from '@/Custom_Fields/Types/CustomField';
import { toast } from '@/Custom_Fields/hooks/use-toast';
import { CustomFieldsContext } from '@/Custom_Fields/Context';
import { Label } from '@/components/ui/label';
import { ChipInput } from '@/components/ui/chip-input';
import { Button } from '@/components/ui/button';
import { fieldTypes } from '@/Custom_Fields/utils';
import { validationSchema } from '@/Custom_Fields/utils/validations';
import {
  Type,
  FileText,
  Hash,
  ChevronDown,
  List,
  Circle,
  CheckSquare,
  Calendar,
  Clock,
  CalendarClock,
  Lock,
  Upload,
  Check,
  Loader2,
} from 'lucide-react';
import CustomFieldDialog from './Common/CustomFieldDialog';

const fieldTypeIcons: Record<string, React.ElementType> = {
  text: Type,
  textarea: FileText,
  number: Hash,
  select: ChevronDown,
  multiSelect: List,
  radio: Circle,
  checkbox: CheckSquare,
  date: Calendar,
  time: Clock,
  datetime: CalendarClock,
  password: Lock,
  file: Upload,
};

interface JobCandidateCustomFieldFormProps {
  isOpen: boolean;
  handleClose: () => void;
  onSave: (newField: CustomField) => void;
  isEditMode?: boolean;
  initialValues?: CustomField;
  jobId?: string;
  candidateId?: string;
  jobTitle?: string;
  candidateName?: string;
  existingFields?: CustomField[];
}

export const AddSpecificCustomFieldForm = memo(
  ({
    isOpen,
    handleClose,
    isEditMode = false,
    initialValues: initialValue = {
      id: '',
      label: '',
      type: 'text',
      options: [],
      persistance: 'permanent',
      defaultValue: '',
      required: false,
      private: false,
      privateInt: false,
      showOnCard: false,
    },
    onSave,
    jobId,
    candidateId,
    jobTitle,
    candidateName,
  }: JobCandidateCustomFieldFormProps) => {
    const { selectedFormId, customFields } = useContext(CustomFieldsContext);

    const existingFieldsFromContext = selectedFormId?.fields || [];
    const [initialValues, setInitialValues] = useState<CustomField>({
      id: '',
      label: '',
      type: 'text',
      options: [],
      persistance: 'permanent',
      defaultValue: '',
      required: false,
      private: false,
      privateInt: false,
      showOnCard: false,
    });
    const [hasDuplicate, setHasDuplicate] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
      if (initialValue && initialValue.id) {
        setInitialValues({
          ...initialValue,
          label: initialValue.label.split(' ||||||(')[0],
        });
      }
    }, [initialValue?.id, initialValue?.label]);

    useEffect(() => {
      if (!isOpen) {
        setHasDuplicate(false);
      }
    }, [isOpen]);

    const checkForDuplicate = useCallback(
      (label: string, excludeId?: string) => {
        const trimmedLabel = label.trim().toLowerCase();
        return existingFieldsFromContext?.some(
          (field) =>
            (field.label.toLowerCase() === trimmedLabel ||
              field.label.toLowerCase() === `${trimmedLabel} |||||(i)`) &&
            (jobId
              ? field.jobId === jobId
              : field.candidateId === candidateId) &&
            field.id !== excludeId,
        );
      },
      [existingFieldsFromContext, jobId, candidateId],
    );

    const onSubmit = useCallback(
      async (
        values: CustomField,
        { resetForm, setFieldError }: FormikHelpers<CustomField>,
      ) => {
        setIsSubmitting(true);
        if (isEditMode && values.label !== initialValue?.label) {
          const isDuplicate = checkForDuplicate(
            values.label,
            isEditMode ? initialValue?.id : undefined,
          );
          if (isDuplicate) {
            setFieldError('label', '');
            setHasDuplicate(true);
            setIsSubmitting(false);
            return;
          }

          if (selectedFormId) {
            customFields[selectedFormId.formId].fields.some((field) => {
              if (
                (field.jobId || field.candidateId) &&
                field.label === values.label &&
                (!isEditMode || field.id !== initialValue?.id)
              ) {
                values.label = `${values.label} |||||(i)`;
                return true;
              }
              return false;
            });
          }
        }

        try {
          // Simulate a short delay for better UX
          await new Promise((resolve) => {
            setTimeout(resolve, 500);
          });

          const fieldData = {
            ...values,
            id: isEditMode
              ? initialValue?.id
              : Math.random().toString(36).substr(2, 9),
            jobId,
            candidateId,
          };
          onSave(fieldData);
          handleClose();
          resetForm();
        } catch (error: unknown) {
          if (error instanceof Error) {
            toast({
              title: `Error: ${error.message}`,
              description: 'Failed to save field',
              variant: 'destructive',
            });
          }
        } finally {
          setIsSubmitting(false);
        }
      },
      [
        initialValue,
        isEditMode,
        selectedFormId,
        handleClose,
        onSave,
        jobId,
        candidateId,
        checkForDuplicate,
        customFields,
      ],
    );

    const onValuesChange = useCallback(
      (
        value: string,
        values: CustomField,
        setFieldValue: (
          field: string,
          value: string | string[] | undefined, // eslint-disable-line no-shadow
        ) => void,
      ) => {
        if (value !== values.type) {
          if (['select', 'multiSelect', 'radio', 'checkbox'].includes(value)) {
            setFieldValue('options', values.options);
            if (['select', 'radio'].includes(value)) {
              setFieldValue('defaultValue', '');
            } else {
              setFieldValue('defaultValue', []);
            }
          } else {
            setFieldValue('defaultValue', '');
          }
        }
        setFieldValue('type', value);
      },
      [],
    );

    const handleNumberInputChange = (
      e: React.ChangeEvent<HTMLInputElement>,
      setFieldValue: (
        field: string,
        value: string | string[] | undefined,
      ) => void,
    ) => {
      const { value } = e.target;
      if (value === '' || /^[0-9]+$/.test(value)) {
        setFieldValue('defaultValue', value);
      }
    };

    const handleLabelChange = useCallback(
      (
        e: React.ChangeEvent<HTMLInputElement>,
        setFieldValue: (
          field: string,
          value: string | string[] | undefined,
        ) => void,
        setFieldError: (field: string, message: string | undefined) => void,
      ) => {
        const { value } = e.target;
        setFieldValue('label', value);
        const isDuplicate = checkForDuplicate(
          value,
          isEditMode ? initialValue?.id : undefined,
        );
        setHasDuplicate(isDuplicate);
        if (isDuplicate) {
          setFieldError('label', '');
        }
      },
      [checkForDuplicate, isEditMode, initialValue],
    );

    return (
      <CustomFieldDialog
        isOpen={isOpen}
        onClose={handleClose}
        title="Personalized Field"
        regular={false}
      >
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={onSubmit}
          enableReinitialize
        >
          {({
            values,
            errors,
            touched,
            handleSubmit,
            getFieldProps,
            setFieldValue,
            setFieldError,
          }) => (
            <form onSubmit={handleSubmit} className="flex h-full flex-col">
              {/* Context Header */}
              <div className="mx-4 mt-2 rounded-lg border-b border-gray-100 bg-blue-50 px-4 pb-2 pt-4 dark:border-gray-700 dark:bg-blue-900/20">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {jobId ? (
                      <>
                        <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-800/50">
                          <svg
                            className="h-4 w-4 text-blue-600 dark:text-blue-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6.294a23.931 23.931 0 01-4 2.33M16 6H8m0 0V4a2 2 0 012-2h4a2 2 0 012 2v2M8 6v12"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            Creating field for Job Position
                          </p>
                          <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                            {jobTitle || 'Job Position'}
                          </p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="rounded-lg bg-green-100 p-2 dark:bg-green-800/50">
                          <svg
                            className="h-4 w-4 text-green-600 dark:text-green-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-800 dark:text-green-200">
                            Creating field for Candidate
                          </p>
                          <p className="text-lg font-semibold text-green-900 dark:text-green-100">
                            {candidateName || 'Candidate'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-8 overflow-y-auto overflow-x-hidden px-4 pb-0 pt-4">
                <div>
                  <Label
                    htmlFor="label"
                    className="flex items-center gap-1 pb-3 text-lg font-medium"
                  >
                    Field Label
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="label"
                    {...getFieldProps('label')}
                    onChange={(e) =>
                      handleLabelChange(e, setFieldValue, setFieldError)
                    }
                    className="px-4 py-3 text-lg"
                    placeholder="Enter field label..."
                  />
                  {errors.label && touched.label && (
                    <div className="flex items-center gap-1 pt-2 text-sm text-red-500">
                      <span>⚠️</span> {errors.label}
                    </div>
                  )}
                  {hasDuplicate && touched.label && (
                    <div className="flex items-center gap-1 pt-2 text-sm text-red-500">
                      <span>⚠️</span> Label already exists
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="fieldType" className="text-lg font-medium">
                    Field Type
                  </Label>
                  <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                    {fieldTypes.map((type) => {
                      const IconComponent = fieldTypeIcons[type.value];
                      const isSelected = values.type === type.value;
                      return (
                        <div
                          tabIndex={0}
                          role="button"
                          key={type.value}
                          className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md ${
                            isSelected
                              ? 'shadow-md'
                              : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                          }`}
                          style={
                            isSelected
                              ? {
                                  borderColor: 'var(--portal-primary, #6366f1)',
                                  backgroundColor:
                                    'rgba(var(--portal-primary-rgb, 99, 102, 241), 0.1)',
                                }
                              : {}
                          }
                          onClick={() =>
                            onValuesChange(type.value, values, setFieldValue)
                          }
                        >
                          {isSelected && (
                            <div
                              className="absolute -right-2 -top-2 rounded-full p-1 text-white"
                              style={{
                                backgroundColor:
                                  'var(--portal-primary, #6366f1)',
                              }}
                            >
                              <Check className="h-3 w-3" />
                            </div>
                          )}
                          <div className="flex flex-col items-center gap-2 text-center">
                            <IconComponent
                              className={`h-6 w-6 ${
                                isSelected
                                  ? ''
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}
                              style={
                                isSelected
                                  ? { color: 'var(--portal-primary, #6366f1)' }
                                  : {}
                              }
                            />
                            <span
                              className={`text-sm font-medium ${
                                isSelected
                                  ? ''
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}
                              style={
                                isSelected
                                  ? { color: 'var(--portal-primary, #6366f1)' }
                                  : {}
                              }
                            >
                              {type.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {['select', 'multiSelect', 'radio', 'checkbox'].includes(
                  values.type,
                ) && (
                  <div>
                    <Label
                      htmlFor="options"
                      className="block pb-3 text-lg font-medium"
                    >
                      Options{' '}
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        (Hit Enter to Add)
                      </span>
                    </Label>
                    <ChipInput
                      value={values.options}
                      onChange={(newOptions) =>
                        setFieldValue(
                          'options',
                          newOptions
                            .map((option) => option.trim())
                            .filter((option) => option !== ''),
                        )
                      }
                      placeholder="Type an option and press Enter..."
                      suggestions={[]}
                      showAddButton
                      // className="text-lg"
                    />
                    {errors.options && touched.options && (
                      <div className="flex items-center gap-1 pt-2 text-sm text-red-500">
                        <span>⚠️</span> {errors.options}
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label className="mb-4 block text-lg font-medium">
                    Field Options
                  </Label>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div
                      tabIndex={0}
                      role="button"
                      className={`cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md${
                        values.required
                          ? 'shadow-md'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                      }`}
                      style={
                        values.required
                          ? {
                              borderColor: 'var(--portal-primary, #6366f1)',
                              backgroundColor:
                                'rgba(var(--portal-primary-rgb, 99, 102, 241), 0.1)',
                            }
                          : {}
                      }
                      onClick={() =>
                        setFieldValue('required', !values.required)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                              values.required
                                ? ''
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                            style={
                              values.required
                                ? {
                                    backgroundColor:
                                      'var(--portal-primary, #6366f1)',
                                    borderColor:
                                      'var(--portal-primary, #6366f1)',
                                  }
                                : {}
                            }
                          >
                            {values.required && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div>
                            <div
                              className={`font-medium ${
                                values.required
                                  ? ''
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}
                              style={
                                values.required
                                  ? { color: 'var(--portal-primary, #6366f1)' }
                                  : {}
                              }
                            >
                              Required Field
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Users must fill this field
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      tabIndex={0}
                      role="button"
                      className={`cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md ${
                        values.private
                          ? 'shadow-md'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                      }`}
                      style={
                        values.private
                          ? {
                              borderColor: 'var(--portal-primary, #6366f1)',
                              backgroundColor:
                                'rgba(var(--portal-primary-rgb, 99, 102, 241), 0.1)',
                            }
                          : {}
                      }
                      onClick={() => setFieldValue('private', !values.private)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-5 w-5 items-center rounded border-2 justify-center${
                              values.private
                                ? ''
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                            style={
                              values.private
                                ? {
                                    backgroundColor:
                                      'var(--portal-primary, #6366f1)',
                                    borderColor:
                                      'var(--portal-primary, #6366f1)',
                                  }
                                : {}
                            }
                          >
                            {values.private && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div>
                            <div
                              className={`font-medium ${
                                values.private
                                  ? ''
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}
                              style={
                                values.private
                                  ? { color: 'var(--portal-primary, #6366f1)' }
                                  : {}
                              }
                            >
                              Hide from Candidates
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Candidates cannot see this field
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      tabIndex={0}
                      role="button"
                      className={`cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md ${
                        values.privateInt
                          ? 'shadow-md'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                      }`}
                      style={
                        values.privateInt
                          ? {
                              borderColor: 'var(--portal-primary, #6366f1)',
                              backgroundColor:
                                'rgba(var(--portal-primary-rgb, 99, 102, 241), 0.1)',
                            }
                          : {}
                      }
                      onClick={() =>
                        setFieldValue('privateInt', !values.privateInt)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                              values.privateInt
                                ? ''
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
                            style={
                              values.privateInt
                                ? {
                                    backgroundColor:
                                      'var(--portal-primary, #6366f1)',
                                    borderColor:
                                      'var(--portal-primary, #6366f1)',
                                  }
                                : {}
                            }
                          >
                            {values.privateInt && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div>
                            <div
                              className={`{ values.privateInt ? "" : "text-gray-700 dark:text-gray-300" } font-medium`}
                              style={
                                values.privateInt
                                  ? { color: 'var(--portal-primary, #6366f1)' }
                                  : {}
                              }
                            >
                              Hide from Interviewer
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Interviewers cannot see this field
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      tabIndex={0}
                      role="button"
                      className={`cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md ${
                        values.showOnCard
                          ? 'shadow-md'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                      }`}
                      style={
                        values.showOnCard
                          ? {
                              borderColor: 'var(--portal-primary, #6366f1)',
                              backgroundColor:
                                'rgba(var(--portal-primary-rgb, 99, 102, 241), 0.1)',
                            }
                          : {}
                      }
                      onClick={() =>
                        setFieldValue('showOnCard', !values.showOnCard)
                      }
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`{ values.showOnCard ? "" : "border-gray-300 dark:border-gray-600" } flex h-5 w-5 items-center justify-center rounded border-2`}
                            style={
                              values.showOnCard
                                ? {
                                    backgroundColor:
                                      'var(--portal-primary, #6366f1)',
                                    borderColor:
                                      'var(--portal-primary, #6366f1)',
                                  }
                                : {}
                            }
                          >
                            {values.showOnCard && (
                              <Check className="h-3 w-3 text-white" />
                            )}
                          </div>
                          <div>
                            <div
                              className={`font-medium ${
                                values.showOnCard
                                  ? ''
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}
                              style={
                                values.showOnCard
                                  ? { color: 'var(--portal-primary, #6366f1)' }
                                  : {}
                              }
                            >
                              Show On Card
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              Display this field on candidate cards
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {[
                  'date',
                  'datetime',
                  'time',
                  'file',
                  'textarea',
                  'password',
                ].includes(values.type) ? null : (
                  <div>
                    {['select', 'radio', 'checkbox', 'multiSelect'].includes(
                      values.type,
                    ) ? (
                      <div>
                        <Label
                          htmlFor="defaultValue"
                          className="block pb-3 text-lg font-medium"
                        >
                          Default Value
                        </Label>
                        {values.type === 'multiSelect' ||
                        values.type === 'checkbox' ? (
                          <ChipInput
                            value={values.defaultValue as string[]}
                            onChange={(newOptions) =>
                              setFieldValue(
                                'defaultValue',
                                newOptions
                                  .map((option) => option.trim())
                                  .filter((option) => option !== ''),
                              )
                            }
                            onSuggestionClick={(suggestion) => {
                              setFieldValue('defaultValue', [
                                ...(values.defaultValue as string[]),
                                suggestion,
                              ]);
                            }}
                            suggestions={
                              values.options
                                ?.filter(
                                  (option) =>
                                    !values.defaultValue?.includes(option),
                                )
                                .map((option) => option.trim())
                                .filter((option) => option !== '') || []
                            }
                            showAddButton
                          />
                        ) : (
                          <Select
                            {...getFieldProps('defaultValue')}
                            onValueChange={(value) => {
                              if (value === '-1') {
                                setFieldValue('defaultValue', '');
                              } else {
                                setFieldValue('defaultValue', value.trim());
                              }
                            }}
                            value={String(values.defaultValue || '')}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select default value" />
                            </SelectTrigger>
                            <Button
                              style={{
                                marginLeft: '-10px',
                                color: '#797979',
                              }}
                              variant="link"
                              onClick={(e) => {
                                e.preventDefault();
                                setFieldValue('defaultValue', '');
                              }}
                            >
                              Clear
                            </Button>
                            <SelectContent>
                              {values.options?.map((option) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    ) : (
                      <div>
                        <Label
                          htmlFor="defaultValue"
                          className="block pb-3 text-lg font-medium"
                        >
                          Default Value
                        </Label>
                        {values.type === 'number' ? (
                          <Input
                            id="defaultValue"
                            value={values.defaultValue || ''}
                            onChange={(e) =>
                              handleNumberInputChange(e, setFieldValue)
                            }
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            className="px-4 py-3 text-lg"
                            placeholder="Enter default number..."
                          />
                        ) : (
                          <Input
                            id="defaultValue"
                            {...getFieldProps('defaultValue')}
                            className="px-4 py-3 text-lg"
                            placeholder="Enter default value..."
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="sticky bottom-0 mt-4 border-t border-gray-200 bg-background px-4 pb-4 pt-4 dark:border-gray-600">
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={
                      isSubmitting ||
                      (!isEditMode &&
                        (hasDuplicate || Object.keys(errors).length > 0))
                    }
                  >
                    {isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isSubmitting && 'Saving...'}
                    {!isSubmitting && isEditMode && 'Update Field'}
                    {!isSubmitting && !isEditMode && 'Create Field'}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </Formik>
      </CustomFieldDialog>
    );
  },
);

AddSpecificCustomFieldForm.displayName = 'AddSpecificCustomFieldForm';
