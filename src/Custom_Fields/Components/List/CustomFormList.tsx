import React, { useContext, useState } from 'react';
import { FileText, AlertTriangle } from 'lucide-react';
import { CustomFieldsContext } from '../../Context';
import AddFormID from '../Form/AddFormID';
import FormIDCard from '../Form/FormCard';

function CustomFieldFormList() {
  const { customFields } = useContext(CustomFieldsContext);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div>
      {/* <div className="flex justify-end"> */}
      {/* <Button
          onClick={() => {
            setIsOpen(true);
          }}
        >
          Add Form
        </Button> */}
      {/* </div> */}

      {/* <Separator className="my-4" /> */}
      <AddFormID isOpen={isOpen} setIsOpen={setIsOpen} />

      <div className="sticky top-0 flex flex-col gap-4 py-4 pt-0">
        {Object.entries(customFields).map(([formId, form]) => {
          const fields = form.fields.filter(
            (field) => !field.candidateId && !field.jobId,
          );
          return (
            <FormIDCard
              key={formId}
              formId={formId}
              formName={form.formName}
              fields={fields}
            />
          );
        })}
        {Object.keys(customFields).length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-black">
              <FileText className="h-8 w-8 text-gray-400" />
            </div>
            <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
              No forms available
            </p>
            <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
              Create forms to start adding custom fields
            </p>
          </div>
        )}

        {/* Common Important Notes - shown only if there are forms */}
        {Object.keys(customFields).length > 0 && (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/50 dark:bg-amber-900/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="mb-2 font-medium">Important Notes</p>
                <ul className="space-y-1.5 text-amber-700 dark:text-amber-300">
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-amber-600 dark:bg-amber-400" />
                    <span>
                      Removing a field will still preserve saved data if any job
                      or candidate has data for that field
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1 w-1 flex-shrink-0 rounded-full bg-amber-600 dark:bg-amber-400" />
                    <span>
                      For newly created fields, you&apos;ll need to manually add
                      them to existing jobs and candidates
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(CustomFieldFormList);
