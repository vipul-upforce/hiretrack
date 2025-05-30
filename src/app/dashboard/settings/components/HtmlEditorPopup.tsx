"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Download, RefreshCw, SaveAll } from "lucide-react";
import LivePreviewAndCodeEditor from "./LivePreviewAndCodeEditor";
import { FormikHelpers } from "formik";

interface HtmlEditorPopupProps {
  isOpen: boolean;
  onClose: () => void;
  initialHeaderHtml?: string;
  initialFooterHtml?: string;
  handleSubmit?: (e?: React.FormEvent<HTMLFormElement>) => void;
  setFieldValue?: FormikHelpers<any>["setFieldValue"];
}

const defaultHeaderHtml = `<header style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 1rem 0;">
  <div style="max-width: 1200px; margin: 0 auto; padding: 0 1rem; display: flex; justify-content: space-between; align-items: center;">
    <div style="font-size: 1.5rem; font-weight: bold;">Your Logo</div>
    <nav style="display: flex; gap: 2rem;">
      <a href="#" style="color: white; text-decoration: none; transition: opacity 0.3s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">Home</a>
      <a href="#" style="color: white; text-decoration: none; transition: opacity 0.3s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">About</a>
      <a href="#" style="color: white; text-decoration: none; transition: opacity 0.3s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">Services</a>
      <a href="#" style="color: white; text-decoration: none; transition: opacity 0.3s;" onmouseover="this.style.opacity='0.8'" onmouseout="this.style.opacity='1'">Contact</a>
    </nav>
  </div>
</header>`;

const defaultFooterHtml = `<footer style="background: #1a202c; color: white; padding: 3rem 0 1rem;">
  <div style="max-width: 1200px; margin: 0 auto; padding: 0 1rem;">
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; margin-bottom: 2rem;">
      <div>
        <h3 style="font-size: 1.25rem; font-weight: bold; margin-bottom: 1rem;">Company</h3>
        <p style="color: #a0aec0; line-height: 1.6;">Building amazing web experiences with modern technology and innovative design solutions.</p>
      </div>
      <div>
        <h4 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem;">Quick Links</h4>
        <div style="display: flex; flex-direction: column; gap: 0.5rem;">
          <a href="#" style="color: #a0aec0; text-decoration: none; transition: color 0.3s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#a0aec0'">About Us</a>
          <a href="#" style="color: #a0aec0; text-decoration: none; transition: color 0.3s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#a0aec0'">Services</a>
          <a href="#" style="color: #a0aec0; text-decoration: none; transition: color 0.3s;" onmouseover="this.style.color='white'" onmouseout="this.style.color='#a0aec0'">Contact</a>
        </div>
      </div>
      <div>
        <h4 style="font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem;">Contact Info</h4>
        <div style="color: #a0aec0; line-height: 1.8;">
          <p>123 Business Street</p>
          <p>City, State 12345</p>
          <p>Phone: (555) 123-4567</p>
          <p>Email: info@company.com</p>
        </div>
      </div>
    </div>
    <div style="border-top: 1px solid #2d3748; padding-top: 1rem; text-align: center; color: #a0aec0;">
      <p>&copy; 2024 Your Company. All rights reserved.</p>
    </div>
  </div>
</footer>`;

export default function HtmlEditorPopup({
  isOpen,
  onClose,
  initialHeaderHtml,
  initialFooterHtml,
  handleSubmit,
  setFieldValue,
}: HtmlEditorPopupProps) {
  const [headerHtml, setHeaderHtml] = useState(defaultHeaderHtml);
  const [footerHtml, setFooterHtml] = useState(defaultFooterHtml);
  const [activeTab, setActiveTab] = useState("preview");

  // Update content when initial values change
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

  const handleReset = () => {
    setHeaderHtml(defaultHeaderHtml);
    setFooterHtml(defaultFooterHtml);
    setFieldValue?.('headerFile',defaultHeaderHtml)
    setFieldValue?.('footerFile',defaultFooterHtml)

  };

  const handleCopyCode = () => {
    const combinedCode = `<!-- Header -->\n${headerHtml}\n\n<!-- Your Content Here -->\n<main style="min-height: 400px; padding: 2rem; background: #f7fafc;">\n  <div style="max-width: 1200px; margin: 0 auto; text-align: center;">\n    <h1>Your Content Goes Here</h1>\n    <p>This is where your main content will be displayed.</p>\n  </div>\n</main>\n\n<!-- Footer -->\n${footerHtml}`;

    navigator.clipboard.writeText(combinedCode).then(() => {
      alert("Code copied to clipboard!");
    });
  };

  const handleDownload = () => {
    const combinedCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Header and Footer Template</title>
</head>
<body style="margin: 0; font-family: Arial, sans-serif;">
    ${headerHtml}
    
    <main style="min-height: 400px; padding: 2rem; background: #f7fafc;">
        <div style="max-width: 1200px; margin: 0 auto; text-align: center;">
            <h1>Your Content Goes Here</h1>
            <p>This is where your main content will be displayed.</p>
        </div>
    </main>
    
    ${footerHtml}
</body>
</html>`;

    const blob = new Blob([combinedCode], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "header-footer-template.html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            HTML Header & Footer Editor
            {(initialHeaderHtml || initialFooterHtml) && (
              <span className="text-sm font-normal text-green-600 ml-2">
                (Loaded from uploaded files)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4 mb-4">
          <Button onClick={handleReset} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset to Default
          </Button>
          <Button onClick={handleCopyCode} variant="outline" size="sm">
            <Copy className="w-4 h-4 mr-2" />
            Copy Code
          </Button>
          <Button onClick={handleDownload} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download HTML
          </Button>
          <Button onClick={(e) => handleSubmit?.()} variant="outline" size="sm">
            <SaveAll className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </div>
        <LivePreviewAndCodeEditor
          activeTab={activeTab}
          setActiveTab={setActiveTab}
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
