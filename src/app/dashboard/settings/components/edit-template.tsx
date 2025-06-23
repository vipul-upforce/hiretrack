"use client"
import { useState, useEffect } from "react"
import { Eye, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Editor } from "@monaco-editor/react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Form, Formik } from "formik"
import { useGetMailTemplatesQuery , useUpdateMailTemplatesMutation } from "@/lib/features/settings/settingsApi"
import {  Data, defaultTemplates, editorOptions}  from "@/lib/constants"
import { IEmailTemplatesConfig } from "./types"

export default function EmailTemplateEditor({ onClose }: { onClose: () => void }) {
  const { toast } = useToast()
  const [selectedTemplate, setSelectedTemplate] = useState("job-application-(hr)")
  const [previewData] = useState(Data)

  const { data, isLoading, refetch } = useGetMailTemplatesQuery(undefined)
  const [updateEmailTemplates, { isLoading: isUpdating }] =  useUpdateMailTemplatesMutation()

  useEffect(() => {
    refetch()
  }, [])

  // Initialize templates with defaults if not present
  const initializeTemplates = (existingData: any) => {
    const templates = existingData?.templates || {}
    const initializedTemplates = { ...defaultTemplates }

    // Override with existing templates if they exist
    Object.keys(defaultTemplates).forEach((key) => {
      if (templates[key]) {
        initializedTemplates[key] = templates[key]
      }
    })

    return initializedTemplates
  }

  const initialValues: IEmailTemplatesConfig = {
    templates: initializeTemplates(data),
  }

  const handleSubmit = async (values: IEmailTemplatesConfig) => {
    try {
      await updateEmailTemplates(values).unwrap()
      toast({
        title: "Success",
        description: "Email templates updated successfully",
      })
      refetch()
      onClose()
    } catch {
      toast({
        title: "Error",
        description: "Failed to update email templates",
        variant: "destructive",
      })
    }
  }

  const processTemplate = (template: string, data: typeof previewData) => {
    let processed = template
    Object.entries(data).forEach(([key, value]) => {
      // const regex = new RegExp(`{{${key}}}`, "g")
      // processed = processed.replace(regex, value)
    })
    return processed
  }

  if (isLoading) return <div>Loading...</div>

  return (
    <Formik
      initialValues={initialValues}
      onSubmit={handleSubmit}
      enableReinitialize
    >
      {({ values, handleSubmit, setFieldValue, isSubmitting }) => (
        <Form onSubmit={handleSubmit}>
          <div className="flex flex-col max-h-[95vh]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(95vh-120px)]">
              <div className="space-y-4 overflow-y-auto p-2">
                <div className="space-y-2">
                  <Label htmlFor="templateType">Select Template to Edit</Label>
                  <select
                    id="templateType"
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="border rounded p-2 w-full"
                  >
                    {Object.entries(defaultTemplates).map(([key, template]) => (
                      <option key={key} value={key}>
                        {template.templateName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Email Subject</Label>
                  <Input
                    id="subject"
                    value={values.templates[selectedTemplate]?.subject || ""}
                    onChange={(e) => {
                      const updatedTemplates = {
                        ...values.templates,
                        [selectedTemplate]: {
                          ...values.templates[selectedTemplate],
                          subject: e.target.value,
                        },
                      }
                      setFieldValue("templates", updatedTemplates)
                    }}
                    placeholder="Enter email subject"
                  />
                </div>

                <div className="space-y-2">
                  <Label>HTML Content</Label>
                  <Editor
                    height="400px"
                    defaultLanguage="html"
                    value={values.templates[selectedTemplate]?.html || ""}
                    onChange={(value) => {
                      const updatedTemplates = {
                        ...values.templates,
                        [selectedTemplate]: {
                          ...values.templates[selectedTemplate],
                          html: value || "",
                        },
                      }
                      setFieldValue("templates", updatedTemplates)
                    }}
                    options={editorOptions}
                    theme="vs-light"
                    className="border rounded-md"
                  />
                </div>

                <div className="text-sm text-muted-foreground">
             
                  <p className="font-medium mb-2">Available Variables:</p>
<div className="flex gap-2 text-xs flex-wrap">
  {defaultTemplates[selectedTemplate]?.variables?.map((variable) => (
    <span key={variable} className="border p-2 rounded-sm">{`${variable}`}</span>
  ))}
</div>
                </div>
              </div>

              <div className="space-y-4 overflow-hidden">
             

                <div className="text-sm text-muted-foreground mb-2">
                  <p>
                    <strong>Template :</strong> {defaultTemplates[selectedTemplate]?.templateName}
                  </p>
                </div>

                <Card className="h-[calc(100%-60px)] overflow-hidden">
                  <CardContent className="p-0 h-full flex flex-col">
                    <div className="bg-gray-100 p-4 border-b">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4" />
                        <span className="font-medium">Subject:</span>
                        <span>{processTemplate(values.templates[selectedTemplate]?.subject || "", previewData)}</span>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                      <iframe
                        srcDoc={processTemplate(values.templates[selectedTemplate]?.html || "", previewData)}
                        className="w-full h-full border-none"
                        title="Email Preview"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="w-full flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">

              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || isUpdating}
                >
                  {isSubmitting || isUpdating ? "Saving..." : "Save Templates"}
                </Button>
              </div>
            </div>
          </div>
        </Form>
      )}
    </Formik>
  )
}