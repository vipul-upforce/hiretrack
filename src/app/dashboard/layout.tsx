"use client";

import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Menu,
  KanbanSquare,
  Calendar,
  ChevronRight,
  LogOut,
  Home,
  Users,
  Settings,
  SearchCheckIcon,
  Link2Icon,
  UploadIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import Cookies from "js-cookie";
import { useCustomFields } from "@/Custom_Fields/hooks/use-customFields";
import { useGetPortalConfigsQuery } from "@/lib/features/settings/settingsApi";
import { IUser } from "@/lib/models/user";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { setAllowMultipleOrgs } from "@/lib/features/org/orgSlice";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/lib/store";
import PortalHead from "@/components/layouts/PortalHead";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTheme } from "@/components/theme-provider";

interface SidebarItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  role?: string;
}

const sidebarItems: SidebarItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: <Home className="h-5 w-5" />,
  },
  {
    title: "Search",
    href: "/dashboard/search",
    icon: <SearchCheckIcon className="h-5 w-5" />,
    role: "interviewer",
  },
  {
    title: "Jobs",
    href: "/dashboard/jobs-board",
    icon: <KanbanSquare className="h-5 w-5" />,
  },
  {
    title: "Calendar",
    href: "/dashboard/calendar",
    icon: <Calendar className="h-5 w-5" />,
  },
  {
    title: "Users",
    href: "/dashboard/users",
    icon: <Users className="h-5 w-5" />,
    role: "admin",
  },
  {
    title: "CV Upload",
    href: "/dashboard/cv-upload",
    icon: <UploadIcon className="h-5 w-5" />,
    role: "interviewer",
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: <Settings className="h-5 w-5" />,
    role: "admin",
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userData, setUserData] = useState<IUser | null>(null);
  const {
    data: portalConfigData,
    isLoading,
    refetch,
  } = useGetPortalConfigsQuery(undefined);
  const { setUserLoggedIn } = useCustomFields();
  const [hasMultipleOrgs, seHasMultipleOrgs] = useState(false);

  const dispatch = useDispatch();
  const allowMultipleOrgs = useSelector(
    (state: RootState) => state.organization.allowMultipleOrgs
  );

  useEffect(() => {
    async function checkAllowance() {
      const data = await fetch("/api/organization");
      const allowance = await data?.json();
      seHasMultipleOrgs(allowance.allow);
      dispatch(setAllowMultipleOrgs(allowance.allow));
    }
    checkAllowance();
  }, [dispatch, allowMultipleOrgs]);

  useEffect(() => {
    (async () => {
      const user = Cookies.get("token");
      if (user) {
        setUserLoggedIn(true);
        const decryptedResponse = await verifyAndDecryptJWTToken(String(user));
        if (decryptedResponse.success && decryptedResponse.user) {
          setUserData(decryptedResponse.user);
          setUserLoggedIn(true);
          refetch();

          try {
            const response = await fetch(
              "/api/checkorg?organizationId=" +
                decryptedResponse.user.organizationId
            );
            const resp = await response.json();
            if (!resp.exists) {
              Cookies.remove("token");
              window.location.href = "/auth/login";
              return;
            }
          } catch (error) {
            console.error("Error checking organization:", error);
            Cookies.remove("token");
            window.location.href = "/auth/login";
          }
        }
      }
    })();
  }, []);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = () => {
    Cookies.remove("token");
    setUserData(null);
    setUserLoggedIn(false);
    refetch();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    router.push("/auth/login");
  };

  const generate_share_org = async (e: React.FormEvent) => {
    e.preventDefault();
    let parsedUser;
    const user = Cookies.get("token");
    if (user) {
      const decryptedResponse = await verifyAndDecryptJWTToken(String(user));
      if (decryptedResponse.success && decryptedResponse.user) {
        parsedUser = decryptedResponse.user;
      }
    }
    if (parsedUser) {
      let url;
      if (hasMultipleOrgs) {
        url = `${window.location.origin}/apply-jobs?o=${parsedUser.organizationInfo?.name}`;
      } else {
        url = `${window.location.origin}/apply-jobs`;
      }
      navigator.clipboard
        .writeText(url)
        .then(() => {
          toast({
            title: "Success",
            description: "Organization sharing URL is copied to your clipboard",
            variant: "default",
          });
        })
        .catch((err) => {
          toast({
            title: "Error",
            description: err.message || "Failed to get the org url.",
            variant: "destructive",
          });
        });
    }
  };

  const { theme } = useTheme();

  // Helper function to get the appropriate logo URL
  const getLogoUrl = (portalLogo?: string, portalLogoDark?: string) => {
    // Use appropriate logo based on theme and availability
    if (theme === "dark" && portalLogoDark) {
      return portalLogoDark;
    } else if (portalLogo) {
      return portalLogo;
    }

    // Otherwise use default logos based on theme
    return theme === "dark" ? "/logo_dark.png" : "/logo.png";
  };

  // Helper function to get user avatar
  const getUserAvatar = () => {
    // Use theme-appropriate icon
    return theme === "dark" ? "/icon_dark.png" : "/icon.png";
  };

  // Helper function to get user initials
  const getUserInitials = (name?: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const shouldShowPortalData = Boolean(
    portalConfigData && userData && portalConfigData.portalName
  );
  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div
        className={cn(
          "flex items-center transition-all duration-200",
          isCollapsed ? "h-16 justify-center px-2" : "h-16 justify-between px-4"
        )}
      >
        {isCollapsed ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 rounded-full flex-shrink-0"
            aria-label="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4 transition-transform duration-1000 ease-in-out rotate-0" />
          </Button>
        ) : (
          <>
            <div className="flex items-center justify-center flex-1">
              {shouldShowPortalData && portalConfigData ? (
                <img
                  src={getLogoUrl(
                    portalConfigData.portalLogo?.url,
                    portalConfigData.portalLogoDark?.url
                  )}
                  alt={portalConfigData.portalName || "Portal Logo"}
                  className="object-contain rounded transition-all duration-200 h-8 w-auto max-w-[180px]"
                />
              ) : !isLoading ? (
                <img
                  src={theme === "dark" ? "/logo_dark.png" : "/logo.png"}
                  alt="Dashboard"
                  className="object-contain rounded transition-all duration-200 h-8 w-auto max-w-[180px]"
                />
              ) : (
                <div className="flex items-center justify-center">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8 rounded-full flex-shrink-0"
              aria-label="Collapse sidebar"
            >
              <ChevronRight className="h-4 w-4 transition-transform duration-1000 ease-in-out rotate-180" />
            </Button>
          </>
        )}
      </div>
      <div className="flex-1 px-3 mt-2">
        <div className="space-y-2">
          {sidebarItems.map((item) => {
            if (
              (item.role === "admin" && userData?.role !== "admin") ||
              (userData?.role === "interviewer" && item.title === "Jobs") ||
              (userData?.role === "interviewer" && item.title === "Search") ||
              (userData?.role === "interviewer" && item.title === "CV Upload")
            ) {
              return null;
            }
            return (
              <Link key={item.href} href={item.href}>
                <span
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
                    pathname === item.href && "bg-accent",
                    isCollapsed ? "justify-center" : "justify-start"
                  )}
                >
                  {item.icon}
                  <span className={cn("", isCollapsed && "hidden")}>
                    {item.title}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
      <div className="px-3 pb-4 mt-auto space-y-2">
        {/* Theme Toggle */}
        <div className="flex justify-start mb-2">
          <ThemeToggle
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
          />
        </div>
        <div className="mt-auto space-y-2">
          <div
            className={cn(
              "flex items-center gap-3 bg-card rounded-lg p-2 transition-all border border-border",
              isCollapsed ? "flex-col justify-center" : "justify-start"
            )}
          >
            <div className="flex-shrink-0">
              <div
                className={`flex items-center justify-center bg-muted text-muted-foreground font-semibold h-8 w-8 rounded-full ${isCollapsed ? "aspect-ratio-square h-6 w-6" : "ring-2 ring-border"}`}
              >
                {getUserInitials(userData?.name)}
              </div>
            </div>
            {!isCollapsed && (
              <div className="flex flex-col min-w-0 flex-1">
                <p className="text-sm font-semibold truncate text-foreground">
                  {userData?.name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {userData?.email}
                </p>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 rounded-full ${isCollapsed ? "ml-0" : "ml-auto"}`}
              onClick={generate_share_org}
              title="Copy Portal URL"
            >
              <Link2Icon className="h-4 w-4" />
              <span className="sr-only">Copy Portal URL</span>
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          className={cn(
            "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:text-destructive hover:bg-destructive/10 text-destructive",
            isCollapsed ? "justify-center" : "justify-start"
          )}
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          <span className={cn("", isCollapsed && "hidden")}>Logout</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-full flex" style={{ overflowX: "hidden" }}>
      <PortalHead isLoading={true} />
      <aside
        className={cn(
          "hidden h-screen border-r bg-background md:block transition-all duration-300",
          isCollapsed ? "w-[70px]" : "w-[240px]"
        )}
      >
        <SidebarContent />
      </aside>
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden fixed left-4 top-4 z-40"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-[240px] p-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>
      <main className="w-full overflow-x-hidden overflow-y-scroll h-[100vh]">
        <div className="max-w-[100%] mx-auto overflow-x-hidden overflow-y-scroll">
          {children}
        </div>
      </main>
    </div>
  );
}
