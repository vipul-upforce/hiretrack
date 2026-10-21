import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { DeleteDialog } from '@/components/ui/specialized-dialogs';
import { CustomFieldsContext } from '@/Custom_Fields/Context';
import { AlertCircle, Edit, Plus, Settings2, Trash } from 'lucide-react';
import { CustomField } from '@/Custom_Fields/Types/CustomField';
import { useContext, useMemo, useState } from 'react';
import JobSpecificCustomFieldForm from './jobSpecificCustomFieldForm';

export default function JobSpecificCustomFields({ jobId }: { jobId: string }) {
  const context = useContext(CustomFieldsContext);
  const { customFields, handleDeleteCustomField } = context;
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingField, setEditingField] = useState<CustomField | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<CustomField | null>(null);

  // Get job-specific candidate fields
  const jobSpecificFields = useMemo(() => {
    if (!customFields) return [];

    const candidateForm = Object.entries(customFields).find(
      ([_, form]) => form.formName.toLowerCase() === 'candidate',
    );

    if (!candidateForm) return [];

    const [_, form] = candidateForm;
    return form.fields.filter((field) => field.jobId === jobId);
  }, [customFields, jobId]);

  const candidateFormId = useMemo(() => {
    if (!customFields) return null;

    const candidateForm = Object.entries(customFields).find(
      ([_, form]) => form.formName.toLowerCase() === 'candidate',
    );

    return candidateForm ? candidateForm[0] : null;
  }, [customFields]);

  const handleAddField = () => {
    setEditingField(null);
    setIsEditMode(false);
    setIsFormOpen(true);
  };

  const handleEditField = (field: CustomField) => {
    setEditingField(field);
    setIsEditMode(true);
    setIsFormOpen(true);
  };

  const handleConfirmDeleteField = () => {
    if (fieldToDelete && candidateFormId) {
      handleDeleteCustomField(fieldToDelete.id, candidateFormId);
      setFieldToDelete(null);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingField(null);
    setIsEditMode(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="flex flex-row items-center gap-2 text-sm text-orange-500 dark:text-gray-400">
            <AlertCircle className="h-4 w-4" />
            These fields will only appear for candidates applying to this
            specific job.
          </p>
        </div>
        <Button
          onClick={handleAddField}
          variant="primary"
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Field
        </Button>
      </div>

      {jobSpecificFields.length === 0 ? (
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
            <Settings2 className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-lg font-medium text-gray-500 dark:text-gray-400">
            No job-specific fields yet
          </p>
          <p className="mt-1 text-sm text-gray-400 dark:text-gray-500">
            Add custom fields that will only appear for this job&apos;s
            candidates
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {jobSpecificFields.map((field) => (
            <Card key={field.id} className="border-l-4 border-l-purple-500">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-purple-100 p-2 dark:bg-purple-900/30">
                      <Settings2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {field.label.split(' |||||(')[0]}
                      </CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {field.type} •{' '}
                        {field.required ? 'Required' : 'Optional'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                    >
                      Job Specific
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditField(field)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFieldToDelete(field)}
                      className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {/* Custom Field Form */}
      {candidateFormId && (
        <JobSpecificCustomFieldForm
          isOpen={isFormOpen}
          onClose={handleFormClose}
          jobId={jobId}
          formId={candidateFormId}
          initialValue={editingField as CustomField}
          isEditMode={isEditMode}
        />
      )}

      <DeleteDialog
        isOpen={!!fieldToDelete}
        onClose={() => setFieldToDelete(null)}
        onConfirm={handleConfirmDeleteField}
        itemName={fieldToDelete ? fieldToDelete.label.split(' |||||(')[0] : ''}
        itemType="Meta Field"
      />
    </div>
  );
}
