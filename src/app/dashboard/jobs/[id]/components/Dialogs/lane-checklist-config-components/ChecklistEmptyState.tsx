import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { ClipboardCheck, Plus } from 'lucide-react';

interface ChecklistEmptyStateProps {
  activeTab: 'incoming' | 'outgoing';
  // filteredTemplates: IChecklistTemplate[];
  // onLoadFromTemplate: (templateId: string) => void;
  onCreateNew: () => void;
}

export function ChecklistEmptyState({
  activeTab,
  // filteredTemplates,
  // onLoadFromTemplate,
  onCreateNew,
}: ChecklistEmptyStateProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center">
          <ClipboardCheck className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">
            No {activeTab} checklist configured
          </h3>
          <p className="mb-4 text-muted-foreground">
            Create a checklist that will be shown when candidates are moved{' '}
            {activeTab === 'incoming' ? 'into' : 'out of'} this lane.
          </p>

          <div className="space-y-4">
            {/* Template Selection - Only show when templates exist */}
            {/* {filteredTemplates.length > 0 && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Start from template
                  </Label>
                  <Select onValueChange={onLoadFromTemplate}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredTemplates.map((template) => (
                        <SelectItem
                          key={template._id.toString()}
                          value={template._id.toString()}
                        >
                          <div className="flex items-center space-x-2">
                            <BookOpen className="h-4 w-4" />
                            <span>{template.name}</span>
                            {template.description && (
                              <span className="text-xs text-muted-foreground">
                                - {template.description}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center">
                  <div className="flex-1 border-t border-muted" />
                  <span className="px-2 text-xs text-muted-foreground">or</span>
                  <div className="flex-1 border-t border-muted" />
                </div>
              </>
            )} */}

            <Button onClick={onCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              {/* {filteredTemplates.length > 0
                ? 'Create New Checklist'
                : 'Create Checklist'} */}
              Create New Checklist
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
