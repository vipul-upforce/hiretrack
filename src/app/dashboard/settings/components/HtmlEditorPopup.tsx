"use client";
import React from "react";
import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw, SaveAll } from "lucide-react";
import LivePreviewAndCodeEditor from "./LivePreviewAndCodeEditor";
import type { FormikErrors, FormikHelpers } from "formik";
import { defaultFooterHtml, defaultHeaderHtml } from "@/lib/rteUtils";
import { PortalConfigValues } from "./portalConfig-dialog";
import { toast } from "@/hooks/use-toast";

interface HtmlEditorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  initialHeaderHtml?: string;
  initialFooterHtml?: string;
  handleSubmit?: (e?: React.FormEvent<HTMLFormElement>) => void;
  setFieldValue?: FormikHelpers<any>["setFieldValue"];
  errors: FormikErrors<PortalConfigValues>;
}


export default function HtmlEditorPopup({
  isOpen,
  onClose,
  initialHeaderHtml,
  initialFooterHtml,
  handleSubmit,
  setFieldValue,
  errors,
}: HtmlEditorPopupProps) {
  const [headerHtml, setHeaderHtml] = useState(defaultHeaderHtml);
  const [footerHtml, setFooterHtml] = useState(defaultFooterHtml);
  const newWindowRef = useRef<Window | null>(null);
  // const rootRef = useRef<any>(null);
  useEffect(() => {
    if (initialHeaderHtml) {
      setHeaderHtml(initialHeaderHtml);
    } else {
      setHeaderHtml(defaultHeaderHtml);
    }
  }, [initialHeaderHtml]);

  useEffect(() => {
    if (initialFooterHtml) {
      setFooterHtml(initialFooterHtml);
    } else {
      setFooterHtml(defaultFooterHtml);
    }
  }, [initialFooterHtml]);

  useEffect(() => {
    return () => {
      if (newWindowRef.current && !newWindowRef.current.closed) {
        newWindowRef.current.close();
      }
    };
  }, []);

  const handleReset = () => {
    setHeaderHtml(defaultHeaderHtml);
    setFooterHtml(defaultFooterHtml);
    setFieldValue?.("headerFile", defaultHeaderHtml);
    setFieldValue?.("footerFile", defaultFooterHtml);
  };


  const handleDownload = () => {
    const headerBlob = new Blob([headerHtml || ""], { type: "text/html" });
    const headerUrl = URL.createObjectURL(headerBlob);
    const headerLink = document.createElement("a");
    headerLink.href = headerUrl;
    headerLink.download = "header.html";
    document.body.appendChild(headerLink);
    headerLink.click();
    document.body.removeChild(headerLink);
    URL.revokeObjectURL(headerUrl);

    const footerBlob = new Blob([footerHtml || ""], { type: "text/html" });
    const footerUrl = URL.createObjectURL(footerBlob);
    const footerLink = document.createElement("a");
    footerLink.href = footerUrl;
    footerLink.download = "footer.html";
    document.body.appendChild(footerLink);
    footerLink.click();
    document.body.removeChild(footerLink);
    URL.revokeObjectURL(footerUrl);
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-8xl max-h-[100vh] min-h-[100vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            <div className="flex justify-between items-center mb-4">
              <p className="text-lg font-semibold">
                HTML Header & Footer Editor
              </p>
              <div className="space-x-2 mr-4">
                <Button onClick={handleReset} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset to Default
                </Button>

                <Button onClick={handleDownload} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Download HTML
                </Button>

                <Button
                  onClick={() => {
                    if (errors && Object.keys(errors).length > 0) {
                      toast({
                        title: "Failed To Save Portal Configs",
                        description: Object.values(errors).map((e) => e),
                        variant: "destructive",
                      });
                    }
                    return handleSubmit?.();
                  }}
                  variant="outline"
                  size="sm"
                >
                  <SaveAll className="w-4 h-4 mr-2" />
                  Save Settings
                </Button>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <LivePreviewAndCodeEditor
          headerHtml={headerHtml}
          footerHtml={footerHtml}
          initialHeaderHtml={initialHeaderHtml}
          initialFooterHtml={initialFooterHtml}
          setHeaderHtml={setHeaderHtml}
          setFooterHtml={setFooterHtml}
          setFieldValue={setFieldValue}
        />
      </DialogContent>
    </Dialog>
  );
}
