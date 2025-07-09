import React, { useContext, useState } from "react";
import { CustomFieldsContext } from "../../Context";
import AddFormID from "../Form/AddFormID";
import FormIDCard from "../Form/FormCard";

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

      <div className="flex flex-col py-4 gap-4">
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
          <div>No forms available</div>
        )}
      </div>
    </div>
  );
}

export default React.memo(CustomFieldFormList);
