import React, { useCallback, useContext, useEffect, useState } from 'react';
import { Formik } from 'formik';
import * as Yup from 'yup';
import { Button } from '@/components/ui/button'; // Adjust the import based on your UI components
import { Input } from '@/components/ui/input'; // Adjust the import based on your UI components
import { Label } from '@/components/ui/label';
import { AddFormIDProps } from '@/Custom_Fields/Types';
import CustomFieldDialog from '../Common/CustomFieldDialog';
import { CustomFieldsContext } from '../../Context';

function AddFormID({ isOpen, setIsOpen, formId }: AddFormIDProps) {
  const { handleAddFormId, handleEditFormId, customFields } =
    useContext(CustomFieldsContext);

  const [initialValues, setInitialValues] = useState({
    formName: '',
  });

  useEffect(() => {
    if (formId && customFields[formId]) {
      const form = customFields[formId];
      setInitialValues({
        formName: form.formName,
      });
    } else {
      setInitialValues({
        formName: '',
      });
    }
  }, [formId, customFields]);

  const validationSchema = Yup.object({
    formName: Yup.string()
      .required('Form name is required')
      .min(2, 'Form name must be at least 2 characters')
      .trim('Form name should not have leading or trailing spaces'),
  });

  const handleSubmit = useCallback(
    (
      values: { formName: string },
      { resetForm }: { resetForm: () => void },
    ) => {
      if (formId) {
        handleEditFormId(values.formName, formId);
      } else {
        handleAddFormId(values.formName);
      }
      resetForm();
      setIsOpen(false);
    },
    [formId, handleAddFormId, handleEditFormId, setIsOpen],
  );

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={handleSubmit}
      enableReinitialize
      validateOnMount={false}
    >
      {({
        values,
        errors,
        touched,
        handleChange,
        handleBlur,
        handleSubmit: formikHandleSubmit,
        resetForm,
      }) => (
        <CustomFieldDialog
          regular
          isOpen={isOpen}
          onClose={() => {
            setInitialValues({ formName: '' });
            setTimeout(() => resetForm(), 0.5);
            setIsOpen(false);
          }}
          title={formId ? 'Edit Form ID' : 'Add Form ID'}
        >
          <form
            onSubmit={formikHandleSubmit}
            className="flex flex-col space-y-4"
          >
            <div>
              <Label htmlFor="formName" className="text-base font-medium">
                Form Name
              </Label>
              <Input
                id="formName"
                name="formName"
                type="text"
                placeholder="Enter Form Name"
                onChange={handleChange}
                onBlur={handleBlur}
                value={values.formName}
                className={`border ${
                  touched.formName && errors.formName
                    ? 'border-red-500'
                    : 'border-gray-300'
                } w-1/2`}
              />
              {touched.formName && errors.formName ? (
                <div className="text-red-500">{errors.formName}</div>
              ) : null}
            </div>
            <Button
              type="submit"
              variant="success"
              className="rounded px-4 py-2"
            >
              {formId ? 'Update Form' : 'Add Form'}
            </Button>
          </form>
        </CustomFieldDialog>
      )}
    </Formik>
  );
}

export default React.memo(AddFormID);
