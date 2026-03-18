'use client';

import { useFormikContext } from 'formik';
import { useEffect, useState } from 'react';
import type {
  CustomField,
  FormObject,
} from '@/Custom_Fields/Types/CustomField';
import useCookie from '@/hooks/useCookie';
import { useLazyGetCustomFieldsQuery } from '@/lib/features/org/orgApi';
import type { SearchFilter } from './candidate-search';
import { BasicSearchSection } from './search-filters/basic-search-section';
import { SalaryExperienceSection } from './search-filters/salary-experience-section';
import { AdvancedFiltersSection } from './search-filters/advance-filters-section';

export function SearchFilters({
  handleSearch,
}: {
  handleSearch: (values: SearchFilter) => void;
}) {
  const [metaFields, setMetaFields] = useState<CustomField[] | []>([]);
  const [cols, setCols] = useState<
    Record<string, string | number | boolean | string[]>[]
  >([]);
  const [isMetaFieldsModalOpen, setIsMetaFieldsModalOpen] = useState(false);
  const [isSalaryExpanded, setIsSalaryExpanded] = useState(false);
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false);

  const { values, errors, touched, setFieldValue, handleChange, handleBlur } =
    useFormikContext<SearchFilter>();
  const user = useCookie();
  const [getCustomField] = useLazyGetCustomFieldsQuery();

  const hasError = (fieldName: string) =>
    !!(
      errors[fieldName as keyof typeof errors] &&
      touched[fieldName as keyof typeof touched]
    );

  const getErrorMessage = (fieldName: string) => {
    const error = errors[fieldName as keyof typeof errors];
    if (!hasError(fieldName)) {
      return '';
    }
    if (typeof error === 'string') {
      return error;
    }
    return '';
  };

  useEffect(() => {
    if (
      !values.customFields ||
      Object.keys(values.customFields || {}).length === 0
    ) {
      setCols([]);
    }
  }, [values.customFields]);

  useEffect(() => {
    (async () => {
      if (user?.organizationId) {
        const data = await getCustomField(user?.organizationId);
        const metaFieldsData =
          (Object.values(data?.data || {}) as FormObject[]).find(
            (form) => form.formName === 'Candidate',
          )?.fields || [];
        setMetaFields(metaFieldsData as CustomField[] | []);
      }
    })();
  }, [user]);

  const updateSelectedMetaFields = (fieldId: string, colId: string) => {
    if (!fieldId) return;
    const selectedField = metaFields.find((f: CustomField) => f.id === fieldId);
    if (!selectedField) return;
    const existsElsewhere = cols.some(
      (col) => col.fieldId === fieldId && col.id !== colId,
    );
    if (existsElsewhere) {
      return;
    }
    const newCols = cols.map((col) =>
      col.id === colId
        ? {
            ...col,
            fieldId,
            label: selectedField.label,
            type: selectedField.type,
            options: selectedField.options as string[],
            name: selectedField.label,
            value: selectedField ? '' : (col.value ?? ''),
          }
        : col,
    );
    setCols(newCols);
    setFieldValue(
      'customFields',
      Object.fromEntries(
        newCols.map(({ label, value: _value }) => [label, _value]),
      ),
    );
  };

  const updateColValue = (id: string, value: string) => {
    const newCols = cols.map((col) =>
      col.id === id ? { ...col, value } : col,
    );
    setCols(newCols);
    setFieldValue(
      'customFields',
      Object.fromEntries(
        newCols.map(({ label, value: _value }) => [label, _value]),
      ),
    );
  };

  const removeMetaField = (id: string) => {
    setCols((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="space-y-5">
      {/* Basic Search Section */}
      <BasicSearchSection
        values={values}
        handleChange={handleChange}
        handleBlur={handleBlur}
        setFieldValue={setFieldValue}
        hasError={hasError}
        getErrorMessage={getErrorMessage}
      />

      {/* Salary & Experience Section */}
      <SalaryExperienceSection
        values={values}
        handleChange={handleChange}
        handleBlur={handleBlur}
        isSalaryExpanded={isSalaryExpanded}
        setIsSalaryExpanded={setIsSalaryExpanded}
        hasError={hasError}
        getErrorMessage={getErrorMessage}
      />

      {/* Advanced Filters Section */}
      <AdvancedFiltersSection
        isAdvancedExpanded={isAdvancedExpanded}
        setIsAdvancedExpanded={setIsAdvancedExpanded}
        createdAfter={values.createdAfter || ''}
        createdBefore={values.createdBefore || ''}
        setFieldValue={setFieldValue}
        hasError={hasError}
        getErrorMessage={getErrorMessage}
        isMetaFieldsModalOpen={isMetaFieldsModalOpen}
        setIsMetaFieldsModalOpen={setIsMetaFieldsModalOpen}
        metaFields={metaFields}
        cols={cols}
        setCols={setCols}
        values={values}
        handleSearch={handleSearch}
        updateSelectedMetaFields={updateSelectedMetaFields}
        updateColValue={updateColValue}
        removeMetaField={removeMetaField}
      />
    </div>
  );
}
