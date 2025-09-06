"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  useGetPortalConfigsQuery,
  useUpdatePortalConfigsMutation,
} from "@/lib/features/settings/settingsApi";
import { updateUser as updateUserInState } from "@/lib/redux/authSlice";
import {
  Upload,
  X,
  Palette,
  Eye,
  Save,
  RefreshCw,
  Moon,
  Sun,
  ArrowLeft,
  Code,
  Star,
  Settings,
  Image as ImageIcon,
  PaintBucket,
  FileCode,
  Home,
  ChevronRight,
  Expand,
  Minimize2,
  Copy,
  Check,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTheme } from "@/components/theme-provider";
import { HexColorPicker } from "react-colorful";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Editor } from "@monaco-editor/react";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { Organization } from "@/lib/mongodb";
import { User } from "../../jobs/[id]/schemas/AssignCandidateSchema";

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
    primary: "#94a3b8",
    secondary: "#64748b",
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
  const dispatch = useDispatch();

  const { user: userCookieData }: { user: User } = useSelector(
    (state: any) => state.auth || {}
  );

  const {
    data: portalData,
    isLoading: loading,
    refetch,
  } = useGetPortalConfigsQuery(undefined);
  const [updatePortalConfigs, { isLoading: saving }] =
    useUpdatePortalConfigsMutation();
  const { user } = useSelector((state: any) => state.auth || {});
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
  const [isHeaderExpanded, setIsHeaderExpanded] = useState<boolean>(false);
  const [isFooterExpanded, setIsFooterExpanded] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [embedWidth, setEmbedWidth] = useState<string>("100%");
  const [embedHeight, setEmbedHeight] = useState<string>("600px");
  const [embedShowBorder, setEmbedShowBorder] = useState<boolean>(true);
  const [embedHideHeader, setEmbedHideHeader] = useState<boolean>(false);
  const [embedHideFooter, setEmbedHideFooter] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>("general");
  const [hasMultipleOrgs, setHasMultipleOrgs] = useState<boolean>(false);

  useEffect(() => {
    if (portalData) {
      loadPortalData(portalData);
    }
  }, [portalData]);

  useEffect(() => {
    async function checkAllowance() {
      try {
        const data = await fetch("/api/organization");
        const allowance = await data?.json();
        setHasMultipleOrgs(allowance.allow);
      } catch (error) {
        console.error("Error checking organization allowance:", error);
      }
    }
    checkAllowance();
  }, []);

  // Helper function to generate the correct portal URL (similar to generate_share_org)
  const generatePortalUrl = (additionalParams: string[] = []) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    let url;

    if (hasMultipleOrgs && user?.organizationInfo?.name) {
      const orgParam = `o=${user.organizationInfo.name}`;
      const allParams = [orgParam, ...additionalParams].filter(Boolean);
      url = `${origin}/apply-jobs?${allParams.join("&")}`;
    } else {
      const allParams = additionalParams.filter(Boolean);
      url =
        allParams.length > 0
          ? `${origin}/apply-jobs?${allParams.join("&")}`
          : `${origin}/apply-jobs`;
    }

    return url;
  };

  const loadPortalData = async (data: any) => {
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
        .then((res) => res.text())
        .then((html) => setHeaderHtml(html))
        .catch((err) => console.error("Failed to load header HTML:", err));
    }
    if (data.portalFooter?.url) {
      fetch(data.portalFooter.url)
        .then((res) => res.text())
        .then((html) => setFooterHtml(html))
        .catch((err) => console.error("Failed to load footer HTML:", err));
    }
  };

  const handleFileUpload = async (file: File, type: keyof PortalSettings) => {
    // Validate favicon size (check file size instead of dimensions)
    if (type === "portalFavicon" && file.size > 50000) {
      // 50KB limit for favicon
      toast.error("Favicon must be smaller than 50KB");
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
    try {
      // Prepare payload - exclude HTML file references, only send HTML content
      const { portalHeader, portalFooter, ...settingsWithoutHtmlFiles } =
        settings;
      const payload = {
        ...settingsWithoutHtmlFiles,
        portalHeaderHtml: headerHtml,
        portalFooterHtml: footerHtml,
      };

      await updatePortalConfigs(payload).unwrap();

      const updatedUser = {
        ...userCookieData,
        organizaionInfo: {
          ...userCookieData?.organizationInfo,
          name: payload.portalName,
        },
      };
      if (user) {
        dispatch(updateUserInState(updatedUser));
      }

      toast.success("Portal settings saved successfully");
      // The portal colors will automatically update due to cache invalidation
    } catch (error) {
      toast.error("Failed to save portal settings");
    }
  };

  const ColorPicker = ({
    value,
    onChange,
    label,
  }: {
    value: string;
    onChange: (color: string) => void;
    label: string;
  }) => {
    const handleInputChange = (e) => {
      const newColor = e.target.value;
      // // Validate hex color format (e.g., #RRGGBB)
      // if (/^#[0-9A-Fa-f]{6}$/.test(newColor)) {
      onChange(newColor);
      // }
    };

    return (
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
          <input
            type="text"
            value={value}
            onChange={handleInputChange}
            placeholder="#RRGGBB"
            className="border bg-background  border-border rounded-md px-3 py-1.5 w-24 focus:outline-none ring-primary ring-offset-2  text-sm"
          />
        </div>
      </div>
    );
  };
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

  console.log("&&&&&&&&&& settings.portalName: ", settings.portalName, user);
  console.log(
    "dwdwdw ",
    settings.portalName &&
      settings.portalName !== "" &&
      settings.portalName.length > 0
      ? true
      : false
  );

  return (
    <div className="h-screen flex flex-col overflow-hidden w-full">
      {/* Header section with improved design and breadcrumbs */}
      <div className="flex-shrink-0 px-4 pb-2 border-b border-gray-200 dark:border-gray-700">
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-y-2 py-3 px-0">
            {/* Title and Breadcrumbs */}
            <div className="flex flex-col gap-2">
              {/* Breadcrumbs */}
              <nav className="flex items-center text-sm text-muted-foreground font-medium">
                <Link
                  href="/dashboard"
                  className="flex items-center hover:text-foreground transition-colors"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Dashboard
                </Link>
                <ChevronRight className="h-4 w-4 mx-2" />
                <Link
                  href="/dashboard/settings"
                  className="hover:text-foreground transition-colors"
                >
                  Settings
                </Link>
                <ChevronRight className="h-4 w-4 mx-2" />
                <span className="text-foreground font-semibold">
                  Portal Configuration
                </span>
              </nav>
            </div>

            {/* Right Section - Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2 sm:gap-3">
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="flex-1 min-h-0 px-4 pb-4 mt-4 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Tabs
              defaultValue="general"
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger
                  value="general"
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  General
                </TabsTrigger>
                <TabsTrigger
                  value="branding"
                  className="flex items-center gap-2"
                >
                  <ImageIcon className="h-4 w-4" />
                  Branding
                </TabsTrigger>
                <TabsTrigger value="colors" className="flex items-center gap-2">
                  <PaintBucket className="h-4 w-4" />
                  Colors
                </TabsTrigger>
                <TabsTrigger
                  value="advanced"
                  className="flex items-center gap-2"
                >
                  <FileCode className="h-4 w-4" />
                  Advanced
                </TabsTrigger>
                <TabsTrigger value="embed" className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Embed
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
                        value={
                          settings.portalName &&
                          settings.portalName !== "" &&
                          settings.portalName.length > 0
                            ? settings.portalName
                            : user.organizationInfo.name
                        }
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            portalName: e.target.value,
                          }))
                        }
                        placeholder="Enter your portal name"
                      />
                      <p className="text-xs text-muted-foreground">
                        This name will appear in the browser title and portal
                        header
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
                      Choose from predefined color combinations or customize
                      your own
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {predefinedColorCombinations.map((combo) => (
                        <button
                          key={combo.name}
                          className={cn(
                            "p-3 rounded-lg border-2 transition-all hover:scale-105 relative",
                            settings.primaryColor === combo.primary &&
                              settings.secondaryColor === combo.secondary
                              ? "border-primary ring-2 ring-primary ring-offset-2"
                              : "border-border hover:border-primary/50",
                            combo.isDefault &&
                              "bg-gradient-to-br from-primary/5 to-secondary/5"
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
                          <p
                            className={cn(
                              "text-xs font-medium text-center",
                              combo.isDefault && "font-semibold"
                            )}
                          >
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
                          setSettings((prev) => ({
                            ...prev,
                            primaryColor: color,
                          }))
                        }
                      />
                      <ColorPicker
                        label="Secondary Color"
                        value={settings.secondaryColor}
                        onChange={(color) =>
                          setSettings((prev) => ({
                            ...prev,
                            secondaryColor: color,
                          }))
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
                      Add custom HTML content for the portal header. Use CSS
                      variables: <code>var(--portal-primary)</code> and{" "}
                      <code>var(--portal-secondary)</code> for dynamic colors.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="headerHtml">HTML Code</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setHeaderHtml(`<style>
  .portal-header {
    background: linear-gradient(135deg, var(--portal-primary, #6366f1), var(--portal-secondary, #8b5cf6));
    padding: 1rem 2rem;
    color: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  }
  .portal-header-container {
    display: flex;
    align-items: center;
    justify-content: space-between;
    max-width: 1200px;
    margin: 0 auto;
  }
  .portal-header-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
  }
  .portal-header-nav {
    display: flex;
    gap: 1rem;
  }
  .portal-header-link {
    color: white;
    text-decoration: none;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    transition: background-color 0.2s ease;
    font-weight: 500;
  }
  .portal-header-link:hover {
    background-color: rgba(255,255,255,0.15);
  }
</style>
<div class="portal-header">
  <div class="portal-header-container">
    <h1 class="portal-header-title">Your Company</h1>
    <nav class="portal-header-nav">
      <a href="#jobs" class="portal-header-link">Open Positions</a>
      <a href="#about" class="portal-header-link">About Us</a>
      <a href="#contact" class="portal-header-link">Contact</a>
    </nav>
  </div>
</div>`)
                            }
                          >
                            Insert Example
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setIsHeaderExpanded(!isHeaderExpanded)
                            }
                          >
                            {isHeaderExpanded ? (
                              <Minimize2 className="h-4 w-4" />
                            ) : (
                              <Expand className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="border rounded-lg overflow-hidden">
                        <Editor
                          height={isHeaderExpanded ? "600px" : "200px"}
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
                      Add custom HTML content for the portal footer. Use CSS
                      variables: <code>var(--portal-primary)</code> and{" "}
                      <code>var(--portal-secondary)</code> for dynamic colors.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="footerHtml">HTML Code</Label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setFooterHtml(`<style>
  .portal-footer {
    background: linear-gradient(135deg, var(--portal-primary, #6366f1), var(--portal-secondary, #8b5cf6));
    color: white;
    padding: 2rem;
    margin-top: 2rem;
    text-align: center;
  }
  .portal-footer-container {
    max-width: 1200px;
    margin: 0 auto;
  }
  .portal-footer h3 {
    margin: 0 0 1rem 0;
    font-size: 1.25rem;
    font-weight: 600;
  }
  .portal-footer p {
    margin: 0;
    opacity: 0.9;
  }
  .portal-footer-links {
    display: flex;
    justify-content: center;
    gap: 2rem;
    margin: 1.5rem 0;
  }
  .portal-footer-link {
    color: white;
    text-decoration: none;
    transition: opacity 0.2s ease;
  }
  .portal-footer-link:hover {
    opacity: 0.8;
  }
</style>
<div class="portal-footer">
  <div class="portal-footer-container">
    <h3>Your Company</h3>
    <div class="portal-footer-links">
      <a href="#" class="portal-footer-link">Privacy Policy</a>
      <a href="#" class="portal-footer-link">Terms of Service</a>
      <a href="#" class="portal-footer-link">Contact Us</a>
    </div>
    <p>&copy; 2024 Your Company. All rights reserved.</p>
  </div>
</div>`)
                            }
                          >
                            Insert Example
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setIsFooterExpanded(!isFooterExpanded)
                            }
                          >
                            {isFooterExpanded ? (
                              <Minimize2 className="h-4 w-4" />
                            ) : (
                              <Expand className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="border rounded-lg overflow-hidden">
                        <Editor
                          height={isFooterExpanded ? "600px" : "200px"}
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

              <TabsContent value="embed" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5" />
                      Embed Configuration
                    </CardTitle>
                    <CardDescription>
                      Generate an iframe embed code to integrate your candidate
                      portal into any website
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Embed Settings */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium">Embed Settings</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="embedWidth">Width</Label>
                          <Input
                            id="embedWidth"
                            value={embedWidth}
                            onChange={(e) => setEmbedWidth(e.target.value)}
                            placeholder="100% or 800px"
                          />
                          <p className="text-xs text-muted-foreground">
                            Set width in pixels (e.g., 800px) or percentage
                            (e.g., 100%)
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="embedHeight">Height</Label>
                          <Input
                            id="embedHeight"
                            value={embedHeight}
                            onChange={(e) => setEmbedHeight(e.target.value)}
                            placeholder="600px"
                          />
                          <p className="text-xs text-muted-foreground">
                            Set height in pixels (e.g., 600px)
                          </p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="embedShowBorder"
                            checked={embedShowBorder}
                            onChange={(e) =>
                              setEmbedShowBorder(e.target.checked)
                            }
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor="embedShowBorder">
                            Show border around iframe
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="embedHideHeader"
                            checked={embedHideHeader}
                            onChange={(e) =>
                              setEmbedHideHeader(e.target.checked)
                            }
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor="embedHideHeader">
                            Hide portal header
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="embedHideFooter"
                            checked={embedHideFooter}
                            onChange={(e) =>
                              setEmbedHideFooter(e.target.checked)
                            }
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor="embedHideFooter">
                            Hide portal footer
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Generated Embed Code */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Generated Embed Code</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const queryParams = [];
                            if (embedHideHeader)
                              queryParams.push("hideHeader=true");
                            if (embedHideFooter)
                              queryParams.push("hideFooter=true");

                            const embedUrl = generatePortalUrl(queryParams);

                            const embedCode = `<iframe
  src="${embedUrl}"
  width="${embedWidth}"
  height="${embedHeight}"
  ${embedShowBorder ? "" : 'frameborder="0"'}
  style="${embedShowBorder ? "border: 1px solid #e5e7eb;" : "border: none;"} border-radius: 8px;"
  allow="camera; microphone"
  title="${settings.portalName || "Job Portal"}"
></iframe>`;
                            navigator.clipboard.writeText(embedCode);
                            setCopiedCode(true);
                            setTimeout(() => setCopiedCode(false), 2000);
                            toast.success("Embed code copied to clipboard!");
                          }}
                        >
                          {copiedCode ? (
                            <>
                              <Check className="h-4 w-4 mr-2" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Code
                            </>
                          )}
                        </Button>
                      </div>
                      <div className="border rounded-lg overflow-hidden">
                        <Editor
                          height="200px"
                          language="html"
                          theme={theme === "dark" ? "vs-dark" : "vs"}
                          value={(() => {
                            const queryParams = [];
                            if (embedHideHeader)
                              queryParams.push("hideHeader=true");
                            if (embedHideFooter)
                              queryParams.push("hideFooter=true");

                            const embedUrl = generatePortalUrl(queryParams);

                            return `<iframe
  src="${embedUrl}"
  width="${embedWidth}"
  height="${embedHeight}"
  ${embedShowBorder ? "" : 'frameborder="0"'}
  style="${embedShowBorder ? "border: 1px solid #e5e7eb;" : "border: none;"} border-radius: 8px;"
  allow="camera; microphone"
  title="${settings.portalName || "Job Portal"}"
></iframe>`;
                          })()}
                          options={{
                            fontSize: 14,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            wordWrap: "on",
                            lineNumbers: "on",
                            folding: false,
                            readOnly: true,
                            automaticLayout: true,
                          }}
                        />
                      </div>
                    </div>

                    {/* Integration Instructions */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">
                        Integration Instructions
                      </h3>
                      <div className="space-y-3 text-sm text-muted-foreground">
                        <div className="flex gap-2">
                          <span className="font-semibold">1.</span>
                          <p>
                            Copy the embed code above by clicking the "Copy
                            Code" button.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-semibold">2.</span>
                          <p>
                            Paste the code into your website's HTML where you
                            want the portal to appear.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-semibold">3.</span>
                          <p>
                            Adjust the width and height settings to fit your
                            website's design.
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <span className="font-semibold">4.</span>
                          <p>
                            The portal will automatically inherit your
                            configured branding and colors.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Security Notice */}
                    <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-4">
                      <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                        Security Notice
                      </h4>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300">
                        Make sure to only embed this portal on trusted domains.
                        The iframe allows camera and microphone access for video
                        interviews. You can configure additional security
                        settings like allowed domains in your organization
                        settings.
                      </p>
                    </div>

                    {/* Test Link */}
                    <div className="pt-4 border-t">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const queryParams = [];
                          if (embedHideHeader)
                            queryParams.push("hideHeader=true");
                          if (embedHideFooter)
                            queryParams.push("hideFooter=true");
                          const url = generatePortalUrl(queryParams);
                          window.open(url, "_blank");
                        }}
                        className="w-full"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Portal in New Tab (with current settings)
                      </Button>
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
                  <CardTitle>
                    {activeTab === "embed" ? "Embed Preview" : "Preview"}
                  </CardTitle>
                  {activeTab !== "embed" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setPreviewTheme(
                          previewTheme === "light" ? "dark" : "light"
                        )
                      }
                    >
                      {previewTheme === "light" ? (
                        <Moon className="h-4 w-4" />
                      ) : (
                        <Sun className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
                <CardDescription>
                  {activeTab === "embed"
                    ? "Preview of how your portal will look when embedded"
                    : "Live preview of your portal settings"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeTab === "embed" ? (
                  // Real Iframe Embed Preview
                  <div className="space-y-3">
                    {/* Browser Frame */}
                    <div className="rounded-lg border bg-gray-100 dark:bg-black p-2">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex gap-1">
                          <div className="w-3 h-3 rounded-full bg-red-500"></div>
                          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                          <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <div className="flex-1 bg-white dark:bg-gray-700 rounded px-3 py-1 text-xs text-gray-500 dark:text-gray-400">
                          yourwebsite.com/careers
                        </div>
                      </div>

                      {/* Real Iframe */}
                      <div className="bg-white dark:bg-black rounded p-2 overflow-auto">
                        <div
                          style={{
                            width: embedWidth.includes("%")
                              ? embedWidth
                              : `${parseInt(embedWidth) || 400}px`,
                            height: embedHeight.includes("px")
                              ? embedHeight
                              : `${parseInt(embedHeight) || 600}px`,
                            maxWidth: "100%",
                            maxHeight: "80vh",
                          }}
                        >
                          <iframe
                            src={(() => {
                              // For iframe preview, always add explicit header/footer params to override iframe auto-hide behavior
                              const queryParams = [];
                              queryParams.push(`hideHeader=${embedHideHeader}`);
                              queryParams.push(`hideFooter=${embedHideFooter}`);

                              if (
                                hasMultipleOrgs &&
                                user?.organizationInfo?.name
                              ) {
                                const orgParam = `o=${user.organizationInfo.name}`;
                                const allParams = [orgParam, ...queryParams];
                                return `/apply-jobs?${allParams.join("&")}`;
                              } else {
                                return `/apply-jobs?${queryParams.join("&")}`;
                              }
                            })()}
                            width="100%"
                            height="100%"
                            frameBorder={embedShowBorder ? "1" : "0"}
                            style={{
                              border: embedShowBorder
                                ? "1px solid #e5e7eb"
                                : "none",
                              borderRadius: "8px",
                              display: "block",
                            }}
                            allow="camera; microphone"
                            title={settings.portalName || "Job Portal"}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Embed Info */}
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p className="flex items-center gap-1">
                        <Code className="h-3 w-3" />
                        Dimensions: {embedWidth} × {embedHeight}
                      </p>
                      {(embedHideHeader || embedHideFooter) && (
                        <p className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          Hidden:{" "}
                          {[
                            embedHideHeader && "Header",
                            embedHideFooter && "Footer",
                          ]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  // Normal Preview - keeping existing preview code
                  <div
                    className={cn(
                      "rounded-lg overflow-hidden border",
                      previewTheme === "dark" ? "bg-slate-900" : "bg-white"
                    )}
                    style={
                      {
                        "--portal-primary": settings.primaryColor,
                        "--portal-secondary": settings.secondaryColor,
                      } as React.CSSProperties
                    }
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
                          previewTheme === "dark"
                            ? "text-white"
                            : "text-gray-900"
                        )}
                      >
                        {/* Job Application Header */}
                        <div className="border-b pb-4">
                          <h1 className="text-2xl font-bold">
                            Senior Frontend Developer
                          </h1>
                          <p className="text-sm opacity-70 mt-1">
                            Technology • Full-time • Remote
                          </p>
                        </div>

                        {/* Job Details */}
                        <div className="space-y-3">
                          <h3 className="font-semibold">Job Description</h3>
                          <p className="text-sm opacity-80 leading-relaxed">
                            We are seeking a talented Senior Frontend Developer
                            to join our dynamic team. You will be responsible
                            for creating exceptional user experiences using
                            modern web technologies.
                          </p>
                        </div>

                        {/* Application Form Preview */}
                        <div className="space-y-3 pt-4 border-t">
                          <h3 className="font-semibold">
                            Apply for this position
                          </h3>
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-xs font-medium opacity-70">
                                  First Name
                                </label>
                                <div className="h-9 border rounded bg-background/20 border-white/20" />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium opacity-70">
                                  Last Name
                                </label>
                                <div className="h-9 border rounded bg-background/20 border-white/20" />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium opacity-70">
                                Email Address
                              </label>
                              <div className="h-9 border rounded bg-background/20 border-white/20" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-medium opacity-70">
                                Upload Resume
                              </label>
                              <div className="h-20 border-2 border-dashed rounded bg-background/10 border-white/20 flex items-center justify-center">
                                <span className="text-xs opacity-60">
                                  Drop files here or click to browse
                                </span>
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
                          <button className="px-6 py-2 rounded-lg border border-white/20 text-current font-medium text-sm">
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
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
