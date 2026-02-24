import React, { useContext, useState, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TrashIcon,
  ChevronRight,
  FileText,
  Users,
  Briefcase,
  LayoutGrid,
  Database,
  FormInput,
  Info,
} from 'lucide-react';
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogContent,
  Dialog,
} from '@/components/ui/dialog';
import { CustomField } from '../../Types/CustomField';
import AddFormID from './AddFormID';
import { CustomFieldsContext } from '../../Context';
// import { IconButton } from "@mui/material";
interface CardProps {
  formId: string;
  formName: string;
  fields?: CustomField[];
}

const formIcons: Record<string, React.ElementType> = {
  'job position': Briefcase,
  candidate: Users,
  default: FileText,
};

function FormIDCard({ formId, formName, fields }: CardProps) {
  const {
    handleDeleteFormId,
    setStepName,
    selecteFormIdTarget,
    deleteFormIDAllCustomFields: deleteFormIDGlobalCustomFields,
    deleteFormIDAllIndCustomFields,
  } = useContext(CustomFieldsContext);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteAllIndDialog, setShowDeleteAllIndDialog] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const IconComponent = formIcons[formName.toLowerCase()] || formIcons.default;
  const globalFields =
    fields?.filter((field) => !field.candidateId && !field.jobId) || [];

  // const handleEdit = useCallback(
  //   (event: React.MouseEvent<HTMLButtonElement>) => {
  //     event.stopPropagation();
  //     setIsOpen(true);
  //   },
  //   [setIsOpen]
  // );

  const handleDelete = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      // handleDeleteFormId(formId);
      deleteFormIDGlobalCustomFields(formId);
    },
    [formId, handleDeleteFormId],
  );
  const handleDeleteAllInd = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      // handleDeleteFormId(formId);
      deleteFormIDAllIndCustomFields(formId);
    },
    [formId, handleDeleteFormId],
  );

  const hadleClick = useCallback(() => {
    selecteFormIdTarget(formId);
    setStepName('formCustomFieldList');
  }, [formId, selecteFormIdTarget, setStepName]);

  return (
    <>
      <Card
        onClick={hadleClick}
        className="group cursor-pointer overflow-hidden !rounded-xl !border-2 !border-gray-200 !bg-white !shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:!border-blue-400 hover:!shadow-xl dark:!border-gray-700 dark:!bg-gray-900 dark:hover:!border-blue-500"
      >
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex flex-1 items-start gap-4">
              <div
                className="rounded-xl p-3 shadow-sm transition-all duration-200 group-hover:shadow-md"
                style={{
                  backgroundColor:
                    'rgba(var(--portal-primary-rgb, 99, 102, 241), 0.1)',
                }}
              >
                <IconComponent
                  className="h-6 w-6"
                  style={{ color: 'var(--portal-primary, #6366f1)' }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <CardTitle className="mb-2 flex items-center gap-2 text-xl font-semibold capitalize text-gray-900 dark:text-gray-100">
                  {formName}
                  <ChevronRight className="h-5 w-5 text-gray-400 transition-all duration-200 group-hover:translate-x-1 group-hover:text-blue-500" />
                </CardTitle>
                <div className="mb-3 flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Database className="h-4 w-4" />
                    <span className="font-medium">{globalFields.length}</span>
                    <span>
                      global field
                      {globalFields.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {fields && fields.some((f) => f.candidateId || f.jobId) && (
                    <>
                      <span className="text-gray-300 dark:text-gray-600">
                        •
                      </span>
                      <div className="flex items-center gap-1.5">
                        <FormInput className="h-4 w-4" />
                        <span className="font-medium">
                          {
                            fields.filter((f) => f.candidateId || f.jobId)
                              .length
                          }
                        </span>
                        <span>individual</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="-mr-2 -mt-2 opacity-0 transition-opacity duration-200 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-900/20 dark:hover:text-red-400"
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteDialog(true);
              }}
            >
              <TrashIcon className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Information Section */}
          <div className="mb-4">
            <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800/50 dark:bg-blue-900/20">
              <div className="flex items-start gap-2">
                <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p>
                    {(() => {
                      const lowerFormName = formName.toLowerCase();
                      if (lowerFormName === 'job position') {
                        return 'These fields will be shown for all existing and new jobs. Any new job or job when edited will have these fields.';
                      }
                      if (lowerFormName === 'candidate') {
                        return 'These fields will be shown for all existing and new candidates. Any new candidate or candidate when edited will have these fields.';
                      }
                      return 'These fields will be applied to all relevant items in the system.';
                    })()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
            {globalFields.length > 0 ? (
              <div className="space-y-2">
                <p className="mb-2 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Recent Fields
                </p>
                <div className="flex flex-wrap gap-2">
                  {globalFields.slice(0, 4).map((field) => (
                    <div
                      key={field.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-100 px-3 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-700"
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
                      <span className="font-medium text-gray-700 dark:text-gray-100">
                        {field.label.split(' |||||(')[0]}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {field.type}
                      </span>
                    </div>
                  ))}
                  {globalFields.length > 4 && (
                    <div className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm dark:border-blue-700 dark:bg-blue-900/30">
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        +{globalFields.length - 4} more
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                  <LayoutGrid className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-300">
                  No global fields yet
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Click to add fields
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <AddFormID isOpen={isOpen} setIsOpen={setIsOpen} formId={formId} />
      <Dialog
        open={showDeleteAllIndDialog}
        onOpenChange={setShowDeleteAllIndDialog}
      >
        <DialogContent className="border bg-white dark:border-gray-800 dark:bg-black">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">
              Delete All Individual Meta Field
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete all the individual meta fields of
              the form &quot;
              {formName}
              &quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteAllIndDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={(event) => {
                handleDeleteAllInd(event);
                setShowDeleteAllIndDialog(false);
              }}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="border bg-white dark:border-gray-800 dark:bg-black">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">
              Delete All Personalized Form Fields
            </DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete the global meta fields from the
              form &quot;
              {formName}
              &quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={(event) => {
                handleDelete(event);
                setShowDeleteDialog(false);
              }}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default React.memo(FormIDCard);
