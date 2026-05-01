import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';
import { CredentialsFormData } from '../types';
import {
  DEFAULT_TEAMS_REMINDER_TEMPLATES,
  normalizeTeamsReminderTemplates,
  renderTeamsReminderTemplate,
  type TeamsReminderTemplateEventType,
} from '@/lib/microsoft-teams/reminderTemplates';

interface ReminderTemplatesCardProps {
  formData: CredentialsFormData;
  setFormData: (data: CredentialsFormData) => void;
  onSave: () => void;
  isUpdating: boolean;
}

export function ReminderTemplatesCard({
  formData,
  setFormData,
  onSave,
  isUpdating,
}: ReminderTemplatesCardProps) {
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const [selectedTemplateType, setSelectedTemplateType] =
    useState<TeamsReminderTemplateEventType>('followup.reminder');
  const normalizedTemplates = normalizeTeamsReminderTemplates(
    formData.messageTemplates,
  );

  const formatTemplateContentForEditor = (content: string) => {
    const trimmed = String(content || '').trim();
    if (!trimmed) {
      return '';
    }
    if (trimmed.includes('\n')) {
      return trimmed;
    }
    return trimmed
      .replaceAll('<br />', '<br />\n')
      .replaceAll('</b>', '</b>\n')
      .replaceAll('</a>', '</a>\n')
      .replaceAll('><', '>\n<')
      .replaceAll(/\n{3,}/g, '\n\n')
      .trim();
  };

  const handleTemplateContentChange = (
    eventType: TeamsReminderTemplateEventType,
    content: string,
  ) => {
    const nextTemplates = {
      ...normalizedTemplates,
      [eventType]: {
        ...normalizedTemplates[eventType],
        content,
      },
    };
    setFormData({
      ...formData,
      messageTemplates: nextTemplates,
    });
  };

  const handleResetTemplate = (eventType: TeamsReminderTemplateEventType) => {
    const nextTemplates = {
      ...normalizedTemplates,
      [eventType]: DEFAULT_TEAMS_REMINDER_TEMPLATES[eventType],
    };
    setFormData({
      ...formData,
      messageTemplates: nextTemplates,
    });
  };

  const handleAutoFormatTemplate = (eventType: TeamsReminderTemplateEventType) => {
    const formatted = formatTemplateContentForEditor(
      normalizedTemplates[eventType].content,
    );
    handleTemplateContentChange(eventType, formatted);
  };

  const getVariablesUsage = (eventType: TeamsReminderTemplateEventType) => {
    const template = normalizedTemplates[eventType];
    const variablePattern = /\{\{(\w+)\}\}/g;
    const content = template.content || '';
    const used = new Set<string>();
    let match = variablePattern.exec(content);
    while (match) {
      used.add(match[1]);
      match = variablePattern.exec(content);
    }

    const all = template.variables || [];
    return {
      used: all.filter((variable) => used.has(variable)),
      unused: all.filter((variable) => !used.has(variable)),
    };
  };

  const insertVariable = (
    eventType: TeamsReminderTemplateEventType,
    variable: string,
  ) => {
    const placeholder = `{{${variable}}}`;
    const currentFormattedContent = formatTemplateContentForEditor(
      normalizedTemplates[eventType].content,
    );

    if (!editorRef.current) {
      handleTemplateContentChange(
        eventType,
        `${currentFormattedContent}${currentFormattedContent ? '\n' : ''}${placeholder}`,
      );
      return;
    }

    const start = editorRef.current.selectionStart ?? currentFormattedContent.length;
    const end = editorRef.current.selectionEnd ?? start;
    const nextValue =
      currentFormattedContent.slice(0, start) +
      placeholder +
      currentFormattedContent.slice(end);
    handleTemplateContentChange(eventType, nextValue);

    requestAnimationFrame(() => {
      const cursorPosition = start + placeholder.length;
      editorRef.current?.focus();
      editorRef.current?.setSelectionRange(cursorPosition, cursorPosition);
    });
  };
  const selectedTemplate = normalizedTemplates[selectedTemplateType];
  const selectedUsage = getVariablesUsage(selectedTemplateType);
  const selectedPreviewHtml = renderTeamsReminderTemplate({
    rawTemplates: normalizedTemplates,
    eventType: selectedTemplateType,
    variables:
      selectedTemplateType === 'followup.reminder'
        ? {
          candidateName: 'John Doe',
          followUpTimeLabel: 'May 1, 2026, 2:30 PM',
          noteHtml: '<br /><b>Note:</b> Please review portfolio before call.',
          lateNoticeHtml: '',
          openAppHtml:
            '<br /><br /><a href="https://example.com/dashboard/jobs/demo?candidateId=123">Open Candidate Details</a>',
        }
        : {
          candidateName: 'Jane Smith',
          followUpTimeLabel: 'May 2, 2026, 10:00 AM',
          noteHtml: '<br /><b>Note:</b> Assignment reminder for interviewer.',
          lateNoticeHtml:
            '<br /><b>Delayed delivery:</b> This reminder was due earlier and is being delivered now (2 minute(s) late).',
          openAppHtml:
            '<br /><br /><a href="https://example.com/dashboard/jobs/demo?candidateId=456">Open Candidate Details</a>',
        },
  });
  const selectedTemplateLabel =
    selectedTemplateType === 'followup.reminder'
      ? 'Follow-up Reminder Template'
      : 'Assignment Reminder Template';

  return (
    <Card className="border-none shadow-none">
      {/* <CardHeader>
        <CardTitle className="text-lg">Reminder Message Templates</CardTitle>
        <CardDescription>
          Manage Microsoft Teams reminder messages separately from credentials.
        </CardDescription>
      </CardHeader> */}
      <CardContent className="space-y-6">
        {/* <div className="space-y-2"> */}
        {/* <Label>Template Type</Label> */}
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant={
              selectedTemplateType === 'followup.reminder'
                ? 'primary'
                : 'outline'
            }
            size="sm"
            disabled={isUpdating}
            onClick={() => setSelectedTemplateType('followup.reminder')}
          >
            Follow-up Reminder
          </Button>
          <Button
            type="button"
            variant={
              selectedTemplateType === 'assignment.reminder'
                ? 'primary'
                : 'outline'
            }
            size="sm"
            disabled={isUpdating}
            onClick={() => setSelectedTemplateType('assignment.reminder')}
          >
            Assignment Reminder
          </Button>
        </div>
        {/* </div> */}

        <div className="space-y-2">
          <Label htmlFor="teamsTemplateContent">{selectedTemplateLabel}</Label>
          <p className="text-xs text-muted-foreground">
            Supported placeholders: {'{{candidateName}}'}, {'{{followUpTimeLabel}}'},
            {' {{noteHtml}}'}, {'{{lateNoticeHtml}}'}, {' {{openAppHtml}}'}.
          </p>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="space-y-2 rounded-md border bg-muted/20 p-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Variable Management
                </p>
                <div className="space-y-2">
                  <div>
                    <p className="mb-1 text-xs font-medium text-green-700 dark:text-green-400">
                      Used Variables ({selectedUsage.used.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedUsage.used.map((variable) => (
                        <Button
                          key={`selected-used-${variable}`}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 font-mono text-xs"
                          onClick={() => insertVariable(selectedTemplateType, variable)}
                          disabled={isUpdating}
                        >
                          {`{{${variable}}}`}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      Unused Variables ({selectedUsage.unused.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {selectedUsage.unused.map((variable) => (
                        <Button
                          key={`selected-unused-${variable}`}
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 border px-2 font-mono text-xs"
                          onClick={() => insertVariable(selectedTemplateType, variable)}
                          disabled={isUpdating}
                        >
                          {`{{${variable}}}`}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <Textarea
                id="teamsTemplateContent"
                ref={editorRef}
                className="min-h-[220px] whitespace-pre font-mono text-xs"
                value={formatTemplateContentForEditor(
                  selectedTemplate.content,
                )}
                onChange={(event) =>
                  handleTemplateContentChange(selectedTemplateType, event.target.value)
                }
                rows={10}
                disabled={isUpdating}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUpdating}
                  onClick={() => handleAutoFormatTemplate(selectedTemplateType)}
                >
                  Auto Format
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUpdating}
                  onClick={() => handleResetTemplate(selectedTemplateType)}
                >
                  Reset Template
                </Button>
              </div>
            </div>
            <div className="space-y-2 rounded-md border bg-muted/20 p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Template Preview
              </p>
              <div
                className="text-sm leading-6"
                dangerouslySetInnerHTML={{ __html: selectedPreviewHtml }}
              />
            </div>
          </div>
        </div>

        <Button onClick={onSave} variant="primary" disabled={isUpdating} className="w-full">
          {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Reminder Templates
        </Button>
      </CardContent>
    </Card>
  );
}
