"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Upload, X, Palette, Eye, Save, RefreshCw, Moon, Sun, ArrowLeft, Code, Star, Settings, Image as ImageIcon, PaintBucket, FileCode } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { HexColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Editor } from "@monaco-editor/react";

interface FileUpload {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

interface PortalSettings {
  portalName: string;
  portalLogo: FileUpload | null;
  portalLogoDark: FileUpload | null;
  portalFavicon: FileUpload | null;
  portalHeader: FileUpload | null;
  portalFooter: FileUpload | null;
  primaryColor: string;
  secondaryColor: string;
}

const predefinedColors = [
  "#6366f1", // Indigo
  "#8b5cf6", // Purple
  "#3b82f6", // Blue
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#ec4899", // Pink
  "#f97316", // Orange
  "#84cc16", // Lime
];

const predefinedColorCombinations = [
  {
    name: "Default Theme",
    primary: "#6366f1",
    secondary: "#8b5cf6",
    isDefault: true,
  },
  {
    name: "Ocean Blue",
    primary: "#3b82f6",
    secondary: "#06b6d4",
  },
  {
    name: "Forest Green",
    primary: "#10b981",
    secondary: "#84cc16",
  },
  {
    name: "Sunset Orange",
    primary: "#f97316",
    secondary: "#f59e0b",
  },
  {
    name: "Cherry Blossom",
    primary: "#ec4899",
    secondary: "#f43f5e",
  },
  {
    name: "Midnight",
    primary: "#1e293b",
    secondary: "#475569",
  },
  {
    name: "Emerald Mint",
    primary: "#059669",
    secondary: "#34d399",
  },
  {
    name: "Royal Purple",
    primary: "#7c3aed",
    secondary: "#a855f7",
  },
];

export default function PortalConfigurationPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PortalSettings>({
    portalName: "",
    portalLogo: null,
    portalLogoDark: null,
    portalFavicon: null,
    portalHeader: null,
    portalFooter: null,
    primaryColor: "#6366f1",
    secondaryColor: "#8b5cf6",
  });
  const [previewTheme, setPreviewTheme] = useState<"light" | "dark">("light");
  const [headerHtml, setHeaderHtml] = useState<string>("");
  const [footerHtml, setFooterHtml] = useState<string>("");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings/portal");
      if (response.ok) {
        const data = await response.json();
        setSettings({
          portalName: data.portalName || "",
          portalLogo: data.portalLogo || null,
          portalLogoDark: data.portalLogoDark || null,
          portalFavicon: data.portalFavicon || null,
          portalHeader: data.portalHeader || null,
          portalFooter: data.portalFooter || null,
          primaryColor: data.primaryColor || "#6366f1",
          secondaryColor: data.secondaryColor || "#8b5cf6",
        });

        // Load HTML content for header/footer
        if (data.portalHeader?.url) {
          fetch(data.portalHeader.url)
            .then(res => res.text())
            .then(html => setHeaderHtml(html))
            .catch(err => console.error("Failed to load header HTML:", err));
        }
        if (data.portalFooter?.url) {
          fetch(data.portalFooter.url)
            .then(res => res.text())
            .then(html => setFooterHtml(html))
            .catch(err => console.error("Failed to load footer HTML:", err));
        }
      }
    } catch (error) {
      toast.error("Failed to load portal settings");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File, type: keyof PortalSettings) => {
    // Validate favicon size
    if (type === "portalFavicon" && (file.width > 32 || file.height > 32)) {
      toast.error("Favicon must be 32x32 pixels or smaller");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const fileData: FileUpload = {
        id: Date.now().toString(),
        name: file.name,
        url: e.target?.result as string,
        type: file.type,
        size: file.size,
      };
      setSettings((prev) => ({ ...prev, [type]: fileData }));
    };
    reader.readAsDataURL(file);
  };

  const removeFile = (type: keyof PortalSettings) => {
    setSettings((prev) => ({ ...prev, [type]: null }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Prepare payload - exclude HTML file references, only send HTML content
      const { portalHeader, portalFooter, ...settingsWithoutHtmlFiles } = settings;
      const payload = {
        ...settingsWithoutHtmlFiles,
        portalHeaderHtml: headerHtml,
        portalFooterHtml: footerHtml,
      };

      const response = await fetch("/api/settings/portal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success("Portal settings saved successfully");
        // Refresh settings to get updated file references
        await fetchSettings();
      } else {
        toast.error("Failed to save portal settings");
      }
    } catch (error) {
      toast.error("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  const ColorPicker = ({ 
    value, 
    onChange, 
    label 
  }: { 
    value: string; 
    onChange: (color: string) => void; 
    label: string;
  }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-start text-left font-normal"
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-4 w-4 rounded border border-border"
                  style={{ backgroundColor: value }}
                />
                <span>{value}</span>
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3">
            <HexColorPicker color={value} onChange={onChange} />
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Preset Colors
              </p>
              <div className="grid grid-cols-5 gap-1">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    className={cn(
                      "h-6 w-6 rounded border border-border",
                      value === color && "ring-2 ring-primary ring-offset-2"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => onChange(color)}
                  />
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );

  const FileUploadCard = ({
    title,
    description,
    file,
    type,
    accept = "image/*",
    maxSize,
  }: {
    title: string;
    description: string;
    file: FileUpload | null;
    type: keyof PortalSettings;
    accept?: string;
    maxSize?: string;
  }) => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {file ? (
          <div className="relative group">
            <div className="aspect-video relative bg-muted rounded-lg overflow-hidden">
              {file.type.startsWith("image/") ? (
                <Image
                  src={file.url}
                  alt={file.name}
                  fill
                  className="object-contain"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-sm text-muted-foreground">{file.name}</p>
                </div>
              )}
            </div>
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => removeFile(type)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <label className="block">
            <input
              type="file"
              accept={accept}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file, type);
              }}
            />
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Click to upload {maxSize && `(max ${maxSize})`}
              </p>
            </div>
          </label>
        )}
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading portal settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard/settings")}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Portal Configuration</h1>
            <p className="text-muted-foreground mt-2">
              Customize your portal appearance and branding
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchSettings}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="branding" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Branding
              </TabsTrigger>
              <TabsTrigger value="colors" className="flex items-center gap-2">
                <PaintBucket className="h-4 w-4" />
                Colors
              </TabsTrigger>
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                Advanced
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Portal Information</CardTitle>
                  <CardDescription>
                    Basic settings for your portal
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="portalName">Portal Name</Label>
                    <Input
                      id="portalName"
                      value={settings.portalName}
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          portalName: e.target.value,
                        }))
                      }
                      placeholder="Enter your portal name"
                    />
                    <p className="text-xs text-muted-foreground">
                      This name will appear in the browser title and portal header
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="branding" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FileUploadCard
                  title="Light Theme Logo"
                  description="Logo for light theme"
                  file={settings.portalLogo}
                  type="portalLogo"
                />
                <FileUploadCard
                  title="Dark Theme Logo"
                  description="Logo for dark theme"
                  file={settings.portalLogoDark}
                  type="portalLogoDark"
                />
                <FileUploadCard
                  title="Favicon"
                  description="Browser tab icon (32x32 max)"
                  file={settings.portalFavicon}
                  type="portalFavicon"
                  accept="image/x-icon,image/png"
                  maxSize="32x32"
                />
              </div>
            </TabsContent>

            <TabsContent value="colors" className="space-y-4">
              {/* Predefined Color Combinations */}
              <Card>
                <CardHeader>
                  <CardTitle>Color Combinations</CardTitle>
                  <CardDescription>
                    Choose from predefined color combinations or customize your own
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {predefinedColorCombinations.map((combo) => (
                      <button
                        key={combo.name}
                        className={cn(
                          "p-3 rounded-lg border-2 transition-all hover:scale-105 relative",
                          settings.primaryColor === combo.primary && settings.secondaryColor === combo.secondary
                            ? "border-primary ring-2 ring-primary ring-offset-2"
                            : "border-border hover:border-primary/50",
                          combo.isDefault && "bg-gradient-to-br from-primary/5 to-secondary/5"
                        )}
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            primaryColor: combo.primary,
                            secondaryColor: combo.secondary,
                          }))
                        }
                      >
                        {combo.isDefault && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                            <Star className="w-3 h-3 text-white fill-current" />
                          </div>
                        )}
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-4 h-4 rounded-full border border-border"
                            style={{ backgroundColor: combo.primary }}
                          />
                          <div
                            className="w-4 h-4 rounded-full border border-border"
                            style={{ backgroundColor: combo.secondary }}
                          />
                        </div>
                        <p className={cn(
                          "text-xs font-medium text-center",
                          combo.isDefault && "font-semibold"
                        )}>
                          {combo.name}
                        </p>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Custom Colors */}
              <Card>
                <CardHeader>
                  <CardTitle>Custom Colors</CardTitle>
                  <CardDescription>
                    Fine-tune your color palette
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <ColorPicker
                      label="Primary Color"
                      value={settings.primaryColor}
                      onChange={(color) =>
                        setSettings((prev) => ({ ...prev, primaryColor: color }))
                      }
                    />
                    <ColorPicker
                      label="Secondary Color"
                      value={settings.secondaryColor}
                      onChange={(color) =>
                        setSettings((prev) => ({ ...prev, secondaryColor: color }))
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              {/* Header HTML Editor */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Custom Header HTML
                  </CardTitle>
                  <CardDescription>
                    Add custom HTML content for the portal header. Use CSS variables: <code>var(--portal-primary)</code> and <code>var(--portal-secondary)</code> for dynamic colors.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="headerHtml">HTML Code</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setHeaderHtml(`<!-- Custom Portal Header -->
<div style="background: linear-gradient(135deg, var(--portal-primary, ${settings.primaryColor}), var(--portal-secondary, ${settings.secondaryColor})); padding: 1rem; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
  <div style="display: flex; align-items: center; justify-content: space-between; max-width: 1200px; margin: 0 auto;">
    <div style="display: flex; align-items: center; gap: 1rem;">
      <h1 style="margin: 0; font-size: 1.5rem; font-weight: 600;">${settings.portalName || 'Your Portal Name'}</h1>
    </div>
    <nav style="display: flex; gap: 1.5rem;">
      <a href="#jobs" style="color: white; text-decoration: none; padding: 0.5rem 1rem; border-radius: 0.375rem; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='rgba(255,255,255,0.1)'" onmouseout="this.style.backgroundColor='transparent'">Jobs</a>
      <a href="#about" style="color: white; text-decoration: none; padding: 0.5rem 1rem; border-radius: 0.375rem; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='rgba(255,255,255,0.1)'" onmouseout="this.style.backgroundColor='transparent'">About</a>
      <a href="#contact" style="color: white; text-decoration: none; padding: 0.5rem 1rem; border-radius: 0.375rem; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='rgba(255,255,255,0.1)'" onmouseout="this.style.backgroundColor='transparent'">Contact</a>
    </nav>
  </div>
</div>`)}
                      >
                        Insert Example
                      </Button>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <Editor
                        height="300px"
                        language="html"
                        theme={theme === "dark" ? "vs-dark" : "vs"}
                        value={headerHtml}
                        onChange={(value) => setHeaderHtml(value || "")}
                        options={{
                          fontSize: 14,
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          wordWrap: "on",
                          lineNumbers: "on",
                          folding: true,
                          automaticLayout: true,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Footer HTML Editor */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Code className="h-5 w-5" />
                    Custom Footer HTML
                  </CardTitle>
                  <CardDescription>
                    Add custom HTML content for the portal footer. Use CSS variables: <code>var(--portal-primary)</code> and <code>var(--portal-secondary)</code> for dynamic colors.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="footerHtml">HTML Code</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFooterHtml(`<!-- Custom Portal Footer -->
<div style="background: var(--portal-primary, ${settings.primaryColor}); color: white; padding: 2rem 1rem; margin-top: 2rem;">
  <div style="max-width: 1200px; margin: 0 auto;">
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; margin-bottom: 2rem;">
      <div>
        <h3 style="margin: 0 0 1rem 0; font-size: 1.125rem; font-weight: 600;">${settings.portalName || 'Your Company'}</h3>
        <p style="margin: 0; opacity: 0.9; line-height: 1.5;">Building the future of work through innovative recruitment solutions.</p>
      </div>
      <div>
        <h4 style="margin: 0 0 1rem 0; font-weight: 600;">Quick Links</h4>
        <ul style="margin: 0; padding: 0; list-style: none;">
          <li style="margin-bottom: 0.5rem;"><a href="#jobs" style="color: white; text-decoration: none; opacity: 0.9;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.9'">Open Positions</a></li>
          <li style="margin-bottom: 0.5rem;"><a href="#about" style="color: white; text-decoration: none; opacity: 0.9;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.9'">About Us</a></li>
          <li style="margin-bottom: 0.5rem;"><a href="#contact" style="color: white; text-decoration: none; opacity: 0.9;" onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.9'">Contact</a></li>
        </ul>
      </div>
      <div>
        <h4 style="margin: 0 0 1rem 0; font-weight: 600;">Contact Info</h4>
        <p style="margin: 0 0 0.5rem 0; opacity: 0.9;">careers@company.com</p>
        <p style="margin: 0; opacity: 0.9;">+1 (555) 123-4567</p>
      </div>
    </div>
    <div style="border-top: 1px solid rgba(255,255,255,0.2); padding-top: 1rem; text-align: center;">
      <p style="margin: 0; opacity: 0.8; font-size: 0.875rem;">&copy; 2024 ${settings.portalName || 'Your Company'}. All rights reserved.</p>
    </div>
  </div>
</div>`)}
                      >
                        Insert Example
                      </Button>
                    </div>
                    <div className="border rounded-lg overflow-hidden">
                      <Editor
                        height="300px"
                        language="html"
                        theme={theme === "dark" ? "vs-dark" : "vs"}
                        value={footerHtml}
                        onChange={(value) => setFooterHtml(value || "")}
                        options={{
                          fontSize: 14,
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          wordWrap: "on",
                          lineNumbers: "on",
                          folding: true,
                          automaticLayout: true,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-4">
          <Card className="sticky top-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Preview</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setPreviewTheme(previewTheme === "light" ? "dark" : "light")
                  }
                >
                  {previewTheme === "light" ? (
                    <Moon className="h-4 w-4" />
                  ) : (
                    <Sun className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <CardDescription>
                Live preview of your portal settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  "rounded-lg overflow-hidden border",
                  previewTheme === "dark" ? "bg-slate-900" : "bg-white"
                )}
                style={{
                  "--portal-primary": settings.primaryColor,
                  "--portal-secondary": settings.secondaryColor,
                } as React.CSSProperties}
              >
                {/* Custom Header Preview */}
                {headerHtml && (
                  <div className="border-b">
                    <div dangerouslySetInnerHTML={{ __html: headerHtml }} />
                  </div>
                )}

                {/* Default Header if no custom header */}
                {!headerHtml && (
                  <div
                    className="p-4"
                    style={{
                      background: `linear-gradient(135deg, ${settings.primaryColor} 0%, ${settings.secondaryColor} 100%)`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {(previewTheme === "dark"
                          ? settings.portalLogoDark
                          : settings.portalLogo) && (
                          <div className="h-10 w-32 relative bg-white/10 rounded">
                            <Image
                              src={
                                previewTheme === "dark"
                                  ? settings.portalLogoDark?.url || ""
                                  : settings.portalLogo?.url || ""
                              }
                              alt="Logo"
                              fill
                              className="object-contain p-2"
                            />
                          </div>
                        )}
                        <h3 className="text-white font-semibold">
                          {settings.portalName || "Portal Name"}
                        </h3>
                      </div>
                    </div>
                  </div>
                )}

                {/* Candidate Portal Preview Content */}
                <div className="p-6 space-y-6">
                  <div
                    className={cn(
                      "space-y-4",
                      previewTheme === "dark" ? "text-white" : "text-gray-900"
                    )}
                  >
                    {/* Job Application Header */}
                    <div className="border-b pb-4">
                      <h1 className="text-2xl font-bold">Senior Frontend Developer</h1>
                      <p className="text-sm opacity-70 mt-1">Technology • Full-time • Remote</p>
                    </div>

                    {/* Job Details */}
                    <div className="space-y-3">
                      <h3 className="font-semibold">Job Description</h3>
                      <p className="text-sm opacity-80 leading-relaxed">
                        We are seeking a talented Senior Frontend Developer to join our dynamic team. 
                        You will be responsible for creating exceptional user experiences using modern web technologies.
                      </p>
                    </div>

                    {/* Application Form Preview */}
                    <div className="space-y-3 pt-4 border-t">
                      <h3 className="font-semibold">Apply for this position</h3>
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-xs font-medium opacity-70">First Name</label>
                            <div className="h-9 border rounded bg-background/20 border-white/20" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-medium opacity-70">Last Name</label>
                            <div className="h-9 border rounded bg-background/20 border-white/20" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium opacity-70">Email Address</label>
                          <div className="h-9 border rounded bg-background/20 border-white/20" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-medium opacity-70">Upload Resume</label>
                          <div className="h-20 border-2 border-dashed rounded bg-background/10 border-white/20 flex items-center justify-center">
                            <span className="text-xs opacity-60">Drop files here or click to browse</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <button
                        className="px-6 py-2 rounded-lg text-white font-medium text-sm flex-1"
                        style={{ backgroundColor: settings.primaryColor }}
                      >
                        Submit Application
                      </button>
                      <button
                        className="px-6 py-2 rounded-lg border border-white/20 text-current font-medium text-sm"
                      >
                        Save as Draft
                      </button>
                    </div>
                  </div>
                </div>

                {/* Custom Footer Preview */}
                {footerHtml && (
                  <div className="border-t">
                    <div dangerouslySetInnerHTML={{ __html: footerHtml }} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}