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
  useState,
  useContext,
  memo,
  useEffect,
  useCallback,
} from 'react';
import {
  CustomField,
  CustomFieldFormProps,
} from '@/Custom_Fields/Types/CustomField';
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
} from 'lucide-react';
import CustomFieldDialog from '../Common/CustomFieldDialog';

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

const CustomFieldForm = memo(
  ({ isOpen, handleClose, initialValue, isEditMode }: CustomFieldFormProps) => {
    const {
      handleAddCustomField,
      handleEditCustomField,
      selectedFormId,
      customFields,
    } = useContext(CustomFieldsContext);

    const existingFields = selectedFormId?.fields || [];
    // const [duplicationAlert, setDuplicationAlert] = useState<boolean>(false);
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
    // const [dupLabel, setDupLabel] = useState<string | null>(null);
    const [hasDuplicate, setHasDuplicate] = useState(false);
    const [duplicateType, setDuplicateType] = useState<
      'global' | 'job-specific' | null
    >(null);

    useEffect(() => {
      if (initialValue) {
        setInitialValues({
          ...initialValue,
          label: initialValue.label.split(' |||||(')[0],
        });
      }
    }, [initialValue]);

    const checkForDuplicate = useCallback(
      (label: string, excludeId?: string) => {
        const trimmedLabel = label.trim().toLowerCase();

        // Check for global field duplicates (original check)
        const globalDuplicate = existingFields?.some(
          (field) =>
            (field.label.toLowerCase() === trimmedLabel ||
              field.label.toLowerCase() === `${trimmedLabel} |||||(g)`) &&
            !field.candidateId &&
            !field.jobId &&
            field.id !== excludeId,
        );

        if (globalDuplicate) {
          setDuplicateType('global');
          return true;
        }

        // Check for job-specific field duplicates
        // Get the jobId from the initialValue or context
        const currentJobId = initialValue?.jobId;

        if (currentJobId) {
          // Check if there's already a field with the same label for this job
          const jobSpecificDuplicate = existingFields?.some(
            (field) =>
              (field.label.toLowerCase() === trimmedLabel ||
                field.label.toLowerCase() === `${trimmedLabel} |||||(g)`) &&
              field.jobId === currentJobId &&
              field.id !== excludeId,
          );

          if (jobSpecificDuplicate) {
            setDuplicateType('job-specific');
            return true;
          }
        }

        setDuplicateType(null);
        return false;
      },
      [existingFields, initialValue],
    );

    const onSubmit = useCallback(
      async (
        values: CustomField,
        { resetForm, setFieldError }: FormikHelpers<CustomField>,
      ) => {
        if (isEditMode && values.label === initialValue?.label) {
          // No label change in edit mode, proceed without duplicate check
        } else {
          // Check for duplicates, including job-specific ones
          const isDuplicate = checkForDuplicate(
            values.label,
            isEditMode ? initialValue?.id : undefined,
          );

          if (isDuplicate) {
            setFieldError('label', '');
            setHasDuplicate(true);
            return; // Don't submit if there's a duplicate
          }

          // Handle potential conflicts with other fields

          if (selectedFormId) {
            customFields[selectedFormId.formId].fields.some((field) => {
              if (
                (field.jobId || field.candidateId) &&
                field.label === values.label &&
                (!isEditMode || field.id !== initialValue?.id)
              ) {
                values.label = `${values.label} |||||(g)`;
                return true; // Stops the loop once found
              }
              return false;
            });
          }
        }

        try {
          if (isEditMode) {
            handleEditCustomField(
              values as CustomField,
              selectedFormId?.formId || null,
            );
          } else {
            const fieldData = {
              ...values,
              id: Math.random().toString(36).substr(2, 9),
            };
            handleAddCustomField(
              fieldData as CustomField,
              selectedFormId?.formId || null,
            );
          }
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
        }
      },
      [
        initialValue,
        isEditMode,
        selectedFormId,
        handleEditCustomField,
        handleAddCustomField,
        handleClose,
        checkForDuplicate,
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

        if (!value.trim()) {
          setHasDuplicate(false);
          setDuplicateType(null);
          return;
        }

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
        title="Meta Field"
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
              <div className="flex-1 space-y-8 overflow-y-auto overflow-x-hidden px-1 pb-6">
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
                      <span>⚠️</span>{' '}
                      {duplicateType === 'job-specific'
                        ? "A field with this label already exists for this job's candidates"
                        : 'Label already exists'}
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="fieldType" className="text-lg font-medium">
                    Field Type
                  </Label>
                  <div className="mt-3 grid grid-cols-2 gap-3 px-3 md:grid-cols-3 lg:grid-cols-4">
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
                      className={`cursor-pointer rounded-lg border-2 p-4 transition-all duration-200 hover:shadow-md ${
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
                            className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
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
                              className={`font-medium ${
                                values.privateInt
                                  ? ''
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}
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
                            className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                              values.showOnCard
                                ? ''
                                : 'border-gray-300 dark:border-gray-600'
                            }`}
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

              <div className="sticky bottom-0 border-t border-gray-200 bg-background px-6 py-4 pb-0 dark:border-gray-600">
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={
                      !isEditMode &&
                      (hasDuplicate || Object.keys(errors).length > 0)
                    }
                  >
                    {isEditMode ? 'Update Field' : 'Create Field'}
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

CustomFieldForm.displayName = 'CustomFieldForm';

export default React.memo(CustomFieldForm);
