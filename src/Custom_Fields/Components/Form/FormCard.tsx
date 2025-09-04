import React, { useContext, useState, useCallback } from "react";
import { CustomFieldsContext } from "../../Context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrashIcon,
  ChevronRight,
  FileText,
  Users,
  Briefcase,
  LayoutGrid,
  Settings2,
  Database,
  FormInput,
  Info
} from "lucide-react";
import AddFormID from "./AddFormID";
import { CustomField } from "../../Types/CustomField";
import { Badge } from "@/components/ui/badge";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DialogContent } from "@/components/ui/dialog";
import { Dialog } from "@/components/ui/dialog";
// import { IconButton } from "@mui/material";
interface CardProps {
  formId: string;
  formName: string;
  fields?: CustomField[];
}

const formIcons: Record<string, React.ElementType> = {
  "job position": Briefcase,
  "candidate": Users,
  "default": FileText
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
  const globalFields = fields?.filter(field => !field.candidateId && !field.jobId) || [];

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
    [formId, handleDeleteFormId]
  );
  const handleDeleteAllInd = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      // handleDeleteFormId(formId);
      deleteFormIDAllIndCustomFields(formId);
    },
    [formId, handleDeleteFormId]
  );

  const hadleClick = useCallback(() => {
    selecteFormIdTarget(formId);
    setStepName("formCustomFieldList");
  }, [formId, selecteFormIdTarget, setStepName]);

  return (
    <>
      <Card
        onClick={hadleClick}
        className="cursor-pointer group !shadow-sm hover:!shadow-xl transition-all duration-200 hover:-translate-y-0.5 !bg-white dark:!bg-gray-900 !border-2 !border-gray-200 dark:!border-gray-700 hover:!border-blue-400 dark:hover:!border-blue-500 !rounded-xl overflow-hidden"
      >
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              <div className="p-3 rounded-xl shadow-sm group-hover:shadow-md transition-all duration-200"
                style={
                  {
                    backgroundColor:
                      "rgba(var(--portal-primary-rgb, 99, 102, 241), 0.1)",
                  }
                }
              >
                <IconComponent className="h-6 w-6"
                  style={
                    { color: "var(--portal-primary, #6366f1)" }
                  }
                />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-xl font-semibold capitalize text-gray-900 dark:text-gray-100 mb-2 flex items-center gap-2">
                  {formName}
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all duration-200" />
                </CardTitle>
                <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mb-3">
                  <div className="flex items-center gap-1.5">
                    <Database className="h-4 w-4" />
                    <span className="font-medium">{globalFields.length}</span>
                    <span>global field{globalFields.length !== 1 ? 's' : ''}</span>
                  </div>
                  {fields && fields.some(f => f.candidateId || f.jobId) && (
                    <>
                      <span className="text-gray-300 dark:text-gray-600">•</span>
                      <div className="flex items-center gap-1.5">
                        <FormInput className="h-4 w-4" />
                        <span className="font-medium">{fields.filter(f => f.candidateId || f.jobId).length}</span>
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
              className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 -mr-2 -mt-2"
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
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-3 mb-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <p>
                    {formName.toLowerCase() === 'job position' ?
                      'These fields will be shown for all existing and new jobs. Any new job or job when edited will have these fields.' :
                      formName.toLowerCase() === 'candidate' ?
                        'These fields will be shown for all existing and new candidates. Any new candidate or candidate when edited will have these fields.' :
                        'These fields will be applied to all relevant items in the system.'}
                  </p>
                </div>
              </div>
            </div>

          </div>

          <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
            {globalFields.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Recent Fields</p>
                <div className="flex flex-wrap gap-2">
                  {globalFields.slice(0, 4).map((field) => (
                    <div
                      key={field.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm border border-gray-200 dark:border-gray-600"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400"></div>
                      <span className="text-gray-700 dark:text-gray-100 font-medium">
                        {field.label.split(" |||||(")[0]}
                      </span>
                      <span className="text-gray-500 dark:text-gray-400 text-xs">
                        {field.type}
                      </span>
                    </div>
                  ))}
                  {globalFields.length > 4 && (
                    <div className="inline-flex items-center px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-sm border border-blue-200 dark:border-blue-700">
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        +{globalFields.length - 4} more
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full mb-3">
                  <LayoutGrid className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-gray-500 dark:text-gray-300 text-sm">No global fields yet</p>
                <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Click to add fields</p>
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
        <DialogContent className="bg-white dark:bg-black border dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Delete All Individual Meta Field</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete all the individual meta fields of
              the form &quot;{formName}&quot;? This action cannot be undone.
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
        <DialogContent className="bg-white dark:bg-black border dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100">Delete All Personalized Form Fields</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-400">
              Are you sure you want to delete the global meta fields from the
              form &quot;{formName}&quot;? This action cannot be undone.
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
