
"use client"
import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Editor from "@monaco-editor/react"
import type { PortalConfigValues } from "./portalConfig-dialog"
import type { FormikHelpers } from "formik"
import ApplyJobsContent from "@/app/apply-jobs/ApplyJobContent"

export interface ILivePreviewAndCodeEditor {
  headerHtml?: string
  footerHtml?: string
  initialHeaderHtml?: string
  initialFooterHtml?: string
  setHeaderHtml?: (value: string) => void
  setFooterHtml?: (value: string) => void
  values?: PortalConfigValues
  setFieldValue?: FormikHelpers<any>["setFieldValue"]
  activeTab?: string
  setActiveTab?: (tab: string) => void
}

const editorOptions = {
  minimap: { enabled: false },
  fontSize: 14,
  lineNumbers: "on" as const,
  roundedSelection: false,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  wordWrap: "on" as const,
  formatOnPaste: true,
  formatOnType: true,
}

const LivePreviewAndCodeEditor = ({
  headerHtml,
  footerHtml,
  initialHeaderHtml,
  initialFooterHtml,
  setHeaderHtml,
  setFooterHtml,
  setFieldValue,
  activeTab,
  setActiveTab,
}: ILivePreviewAndCodeEditor) => {
  const [currentTab, setCurrentTab] = useState(activeTab || "header")

  const handleTabChange = (value: string) => {
    setCurrentTab(value)
    setActiveTab?.(value)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs moved outside - controls both editor and preview */}
      <Tabs value={currentTab} onValueChange={handleTabChange} className="flex flex-col h-full">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="header" className="flex-1">
            Header
          </TabsTrigger>
          <TabsTrigger value="footer" className="flex-1">
            Footer
          </TabsTrigger>
        </TabsList>

        {/* Header Tab Content */}
        <TabsContent value="header" className="flex-1 min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            {/* Editor Section */}
            <div className="flex flex-col h-full">
              <Label htmlFor="header-editor" className="text-sm font-medium mb-2">
                Header HTML Code
                {initialHeaderHtml && <span className="text-xs text-green-600 ml-2">(From uploaded file)</span>}
              </Label>
              <div className="border rounded-md overflow-hidden flex-1 min-h-0">
                <Editor
                  height="100%"
                  defaultLanguage="html"
                  value={headerHtml}
                  onChange={(value) => {
                    setHeaderHtml?.(value || "")
                    setFieldValue?.("headerFile", value)
                  }}
                  options={editorOptions}
                  theme="vs-light"
                />
              </div>
            </div>

            {/* Preview Section */}
            <div className="flex flex-col h-full">
              <Label className="text-sm font-medium mb-2">Live Preview</Label>
              <div className="flex flex-col flex-1 min-h-0 border rounded-md overflow-hidden bg-white">
                <div dangerouslySetInnerHTML={{ __html: headerHtml || "" }} />
                <div className="flex-1 overflow-auto">
                  <ApplyJobsContent showHeaderFooter={false} />
                </div>
                <div dangerouslySetInnerHTML={{ __html: footerHtml || "" }} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Footer Tab Content */}
        <TabsContent value="footer" className="flex-1 min-h-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            {/* Editor Section */}
            <div className="flex flex-col h-full">
              <Label htmlFor="footer-editor" className="text-sm font-medium mb-2">
                Footer HTML Code
                {initialFooterHtml && <span className="text-xs text-green-600 ml-2">(From uploaded file)</span>}
              </Label>
              <div className="border rounded-md overflow-hidden flex-1 min-h-0">
                <Editor
                  height="100%"
                  defaultLanguage="html"
                  value={footerHtml}
                  onChange={(value) => {
                    setFooterHtml?.(value || "")
                    setFieldValue?.("footerFile", value)
                  }}
                  options={editorOptions}
                  theme="vs-light"
                />
              </div>
            </div>

            {/* Preview Section */}
            <div className="flex flex-col h-full">
              <Label className="text-sm font-medium mb-2">Live Preview</Label>
              <div className="flex flex-col flex-1 min-h-0 border rounded-md overflow-hidden bg-white">
                <div dangerouslySetInnerHTML={{ __html: headerHtml || "" }} />
                <div className="flex-1 overflow-auto">
                  <ApplyJobsContent showHeaderFooter={false} />
                </div>
                <div dangerouslySetInnerHTML={{ __html: footerHtml || "" }} />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default LivePreviewAndCodeEditor
