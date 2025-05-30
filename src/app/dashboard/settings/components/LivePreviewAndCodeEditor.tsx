import React from "react";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Editor from "@monaco-editor/react";
import { PortalConfigValues } from "./portalConfig-dialog";
import { FormikHelpers } from "formik";
import { ApplyJobsContent } from "@/app/apply-jobs/page";

export interface ILivePreviewAndCodeEditor {
  activeTab?: string;
  setActiveTab?: React.Dispatch<React.SetStateAction<string>>;
  headerHtml?: string;
  footerHtml?: string;
  initialHeaderHtml?: string;
  initialFooterHtml?: string;
  editorOptions?: Record<string, any>;
  setHeaderHtml?: (value: string) => void;
  setFooterHtml?: (value: string) => void;
  values?: PortalConfigValues;
  setFieldValue?: FormikHelpers<any>["setFieldValue"];
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
};

const LivePreviewAndCodeEditor = ({
  activeTab,
  setActiveTab,
  headerHtml,
  footerHtml,
  initialHeaderHtml,
  initialFooterHtml,
  setHeaderHtml,
  setFooterHtml,
  setFieldValue,
}: ILivePreviewAndCodeEditor) => {
  return (
    <>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preview">Live Preview</TabsTrigger>
          <TabsTrigger value="editor">Code Editor</TabsTrigger>
        </TabsList>

        <TabsContent
          value="preview"
          className="h-[calc(90vh-200px)] overflow-auto"
        >
          <div className="border rounded-lg overflow-hidden bg-white">
            <div dangerouslySetInnerHTML={{ __html: headerHtml || <></> }} />
            <ApplyJobsContent showHeaderFooter={false}/>
            <div dangerouslySetInnerHTML={{ __html: footerHtml || <></> }} />
          </div>
        </TabsContent>

        <TabsContent value="editor" className="h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
            <div className="space-y-2">
              <Label htmlFor="header-editor" className="text-sm font-medium">
                Header HTML Code
                {initialHeaderHtml && (
                  <span className="text-xs text-green-600 ml-2">
                    (From uploaded file)
                  </span>
                )}
              </Label>
              <div className="border rounded-md overflow-hidden h-[calc(67vh-60px)]">
                <Editor
                  height="100%"
                  defaultLanguage="html"
                  value={headerHtml}
                  onChange={(value: any) => {
                    setHeaderHtml?.(value || "");
                    setFieldValue?.("headerFile", value);
                  }}
                  options={editorOptions}
                  theme="vs-light"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="footer-editor" className="text-sm font-medium">
                Footer HTML Code
                {initialFooterHtml && (
                  <span className="text-xs text-green-600 ml-2">
                    (From uploaded file)
                  </span>
                )}
              </Label>
              <div className="border rounded-md overflow-hidden h-[calc(67vh-60px)]">
                <Editor
                  height="100%"
                  defaultLanguage="html"
                  value={footerHtml}
                  onChange={(value: any) => {
                    setFooterHtml?.(value || "");
                    setFieldValue?.("footerFile", value);
                  }}
                  options={editorOptions}
                  theme="vs-light"
                />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default LivePreviewAndCodeEditor;
