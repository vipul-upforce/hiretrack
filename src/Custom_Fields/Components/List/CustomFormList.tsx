import React, { useContext, useState } from "react";
import { CustomFieldsContext } from "../../Context";
import AddFormID from "../Form/AddFormID";
import FormIDCard from "../Form/FormCard";
import { FileText, AlertTriangle } from "lucide-react";

function CustomFieldFormList() {
  const { customFields } = useContext(CustomFieldsContext);
  const [isOpen, setIsOpen] = useState(false);

  console.log("CustomFieldFormList data:", {
    customFields,
    customFieldsKeys: Object.keys(customFields || {}),
    customFieldsCount: Object.keys(customFields || {}).length,
    formEntries: Object.entries(customFields || {}),
  });

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

      <div className="flex flex-col py-4 gap-4 sticky top-0">
        {Object.entries(customFields).map(([formId, form]) => {
          const fields = form.fields.filter(
            (field) => !field.candidateId && !field.jobId
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
            <div className="w-16 h-16 bg-gray-100 dark:bg-black rounded-full flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
              No forms available
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
              Create forms to start adding custom fields
            </p>
          </div>
        )}

        {/* Common Important Notes - shown only if there are forms */}
        {Object.keys(customFields).length > 0 && (
          <div className="mt-6 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-amber-800 dark:text-amber-200">
                <p className="font-medium mb-2">Important Notes</p>
                <ul className="text-amber-700 dark:text-amber-300 space-y-1.5">
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-amber-600 dark:bg-amber-400 mt-2 flex-shrink-0"></span>
                    <span>
                      Removing a field will still preserve saved data if any job
                      or candidate has data for that field
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1 h-1 rounded-full bg-amber-600 dark:bg-amber-400 mt-2 flex-shrink-0"></span>
                    <span>
                      For newly created fields, you'll need to manually add them
                      to existing jobs and candidates
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
