"use client";
import React from "react";
import { useState, useEffect, useRef } from "react";
// import { createRoot } from "react-dom/client";
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

// function FullScreenEditor({
//   headerHtml,
//   footerHtml,
//   initialHeaderHtml,
//   initialFooterHtml,
//   onHeaderChange,
//   onFooterChange,
//   setFieldValue,
//   onClose,
// }: {
//   headerHtml: string;
//   footerHtml: string;
//   initialHeaderHtml?: string;
//   initialFooterHtml?: string;
//   onHeaderChange: (html: string) => void;
//   onFooterChange: (html: string) => void;
//   setFieldValue?: FormikHelpers<any>["setFieldValue"];
//   onClose: () => void;
// }) {
//   const [localHeaderHtml, setLocalHeaderHtml] = useState(headerHtml);
//   const [localFooterHtml, setLocalFooterHtml] = useState(footerHtml);

//   useEffect(() => {
//     onHeaderChange(localHeaderHtml);
//   }, [localHeaderHtml, onHeaderChange]);

//   useEffect(() => {
//     onFooterChange(localFooterHtml);
//   }, [localFooterHtml, onFooterChange]);

//   return (
//     <div
//       style={{
//         width: "100vw",
//         height: "100vh",
//         padding: "20px",
//         boxSizing: "border-box",
//         fontFamily: "system-ui, -apple-system, sans-serif",
//       }}
//     >
//       <div
//         style={{
//           display: "flex",
//           justifyContent: "space-between",
//           alignItems: "center",
//           marginBottom: "20px",
//           paddingBottom: "10px",
//           borderBottom: "1px solid #e2e8f0",
//         }}
//       >
//         <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "bold" }}>
//           HTML Editor - Full Screen
//         </h1>
//         <button
//           onClick={onClose}
//           style={{
//             padding: "8px 16px",
//             backgroundColor: "#ef4444",
//             color: "white",
//             border: "none",
//             borderRadius: "6px",
//             cursor: "pointer",
//             fontSize: "14px",
//           }}
//         >
//           Close Window
//         </button>
//       </div>

//       <div style={{ height: "calc(100vh - 100px)" }}>
//         <LivePreviewAndCodeEditor
//           // activeTab={activeTab}
//           // setActiveTab={setActiveTab}
//           headerHtml={localHeaderHtml}
//           footerHtml={localFooterHtml}
//           initialHeaderHtml={initialHeaderHtml}
//           initialFooterHtml={initialFooterHtml}
//           setHeaderHtml={setLocalHeaderHtml}
//           setFooterHtml={setLocalFooterHtml}
//           setFieldValue={setFieldValue}
//         />
//       </div>
//     </div>
//   );
// }

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

  // const handleCopyCode = () => {
  //   const combinedCode = `<!-- Header -->\n${headerHtml}\n\n<!-- Your Content Here -->\n<main style="min-height: 400px; padding: 2rem; background: #f7fafc;">\n  <div style="max-width: 1200px; margin: 0 auto; text-align: center;">\n    <h1>Your Content Goes Here</h1>\n    <p>This is where your main content will be displayed.</p>\n  </div>\n</main>\n\n<!-- Footer -->\n${footerHtml}`;

  //   navigator.clipboard.writeText(combinedCode).then(() => {
  //     alert("Code copied to clipboard!");
  //   });
  // };

  const handleDownload = () => {
    // Create and download header.html
    const headerBlob = new Blob([headerHtml || ""], { type: "text/html" });
    const headerUrl = URL.createObjectURL(headerBlob);
    const headerLink = document.createElement("a");
    headerLink.href = headerUrl;
    headerLink.download = "header.html";
    document.body.appendChild(headerLink);
    headerLink.click();
    document.body.removeChild(headerLink);
    URL.revokeObjectURL(headerUrl);

    // Create and download footer.html
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

  // const handleOpenFullScreen = () => {
  //   // Close existing window if open
  //   if (newWindowRef.current && !newWindowRef.current.closed) {
  //     newWindowRef.current.close();
  //   }

  //   // Open new window
  //   const newWindow = window.open(
  //     "",
  //     "_blank",
  //     "width=1400,height=900,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no,status=no"
  //   );

  //   if (!newWindow) {
  //     alert("Popup blocked! Please allow popups for this website.");
  //     return;
  //   }

  //   newWindowRef.current = newWindow;

  //   // Set up the new window document
  //   newWindow.document.write(`
  //   <!DOCTYPE html>
  //   <html lang="en">
  //   <head>
  //     <meta charset="UTF-8">
  //     <meta name="viewport" content="width=device-width, initial-scale=1.0">
  //     <title>HTML Editor - Full Screen</title>
  //     <style>
  //       * { box-sizing: border-box; }
  //       body { margin: 0; font-family: system-ui, -apple-system, sans-serif; }
  //     </style>
  //   </head>
  //   <body>
  //     <div id="root"></div>
  //   </body>
  //   </html>
  // `);
  //   newWindow.document.close();

  //   // Wait for the document to be ready
  //   const setupReactApp = () => {
  //     const rootElement = newWindow.document.getElementById("root");
  //     if (rootElement) {
  //       try {
  //         // Copy necessary globals with proper typing
  //         const windowWithReact = newWindow as any;
  //         const parentWindow = window as any;

  //         windowWithReact.React = parentWindow.React;
  //         windowWithReact.ReactDOM = parentWindow.ReactDOM;

  //         // Create root and render
  //         if (!rootRef.current) {
  //           rootRef.current = createRoot(rootElement);
  //         }

  //         renderFullScreenEditor();
  //       } catch (error) {
  //         console.error("Error setting up React in new window:", error);
  //         // Fallback: render a simple HTML version
  //         renderSimpleVersion();
  //       }
  //     }
  //   };

  //   const renderFullScreenEditor = () => {
  //     if (
  //       rootRef.current &&
  //       newWindowRef.current &&
  //       !newWindowRef.current.closed
  //     ) {
  //       try {
  //         rootRef.current.render(
  //           React.createElement(FullScreenEditor, {
  //             headerHtml,
  //             footerHtml,
  //             initialHeaderHtml,
  //             initialFooterHtml,
  //             onHeaderChange: setHeaderHtml,
  //             onFooterChange: setFooterHtml,
  //             setFieldValue,
  //             onClose: () => {
  //               if (newWindowRef.current) {
  //                 newWindowRef.current.close();
  //                 newWindowRef.current = null;
  //                 rootRef.current = null;
  //               }
  //             },
  //           })
  //         );
  //       } catch (error) {
  //         console.error("Error rendering React component:", error);
  //         renderSimpleVersion();
  //       }
  //     }
  //   };

  //   const renderSimpleVersion = () => {
  //     // Fallback: render a simple HTML preview
  //     const combinedHtml = `
  //     <div style="padding: 20px; font-family: system-ui, -apple-system, sans-serif;">
  //       <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0;">
  //         <h1 style="margin: 0; font-size: 24px;">HTML Preview - Full Screen</h1>
  //         <button onclick="window.close()" style="padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;">Close Window</button>
  //       </div>
  //       <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
  //         ${headerHtml}
  //         <main style="min-height: 400px; padding: 2rem; background: #f7fafc;">
  //           <div style="max-width: 1200px; margin: 0 auto; text-align: center;">
  //             <h1>Your Content Goes Here</h1>
  //             <p>This is where your main content will be displayed.</p>
  //           </div>
  //         </main>
  //         ${footerHtml}
  //       </div>
  //     </div>
  //   `;

  //     if (newWindowRef.current && !newWindowRef.current.closed) {
  //       newWindowRef.current.document.body.innerHTML = combinedHtml;
  //     }
  //   };

  //   // Handle window close
  //   newWindow.addEventListener("beforeunload", () => {
  //     newWindowRef.current = null;
  //     rootRef.current = null;
  //   });

  //   setTimeout(setupReactApp, 100);
  // };

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
                    // debugger;
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
          // activeTab={activeTab}
          // setActiveTab={setActiveTab}
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
