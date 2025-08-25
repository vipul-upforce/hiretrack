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
  BarChart3Icon,
  Mail,
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
import { logout } from "@/lib/redux/authSlice";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "@/lib/store";
import PortalHead from "@/components/layouts/PortalHead";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useTheme } from "@/components/theme-provider";
import { NotificationButton } from "@/components/ui/notifications";
import {
  useGetNotificationsQuery,
  useGetNotificationCountQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
} from "@/lib/features/notifications/notificationsApi";
import { CandidateDetailsDialog } from "./jobs/[id]/components/Dialogs/candidate-details-dialog";
import { useLazyFetchCandidateByIdQuery } from "@/lib/features/candidate/candidateApi";
import { Candidate } from "@/types/candidate";

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
    title: "Analytics",
    href: "/dashboard/analytics",
    icon: <BarChart3Icon className="h-5 w-5" />,
    role: "hr", // HR and Admin users can access analytics
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
  // {
  //   title: "Email History",
  //   href: "/dashboard/email-history",
  //   icon: <Mail className="h-5 w-5" />,
  //   role: "admin",
  // },
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

  // Notification hooks
  const [notificationPage, setNotificationPage] = useState(1);
  const { data: notificationsData, isLoading: notificationsLoading } =
    useGetNotificationsQuery(
      { page: notificationPage, limit: 10 },
      { skip: !userData } // Skip query if no user data
    );
  const { data: notificationCountData } = useGetNotificationCountQuery(
    undefined,
    { skip: !userData, pollingInterval: 30000 } // Poll every 30 seconds for real-time updates
  );
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const [fetchCandidateById] = useLazyFetchCandidateByIdQuery();

  // Notification handlers
  const handleNotificationClick = async (notification: any) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      markAsRead(notification._id);
    }

    // For interviewers, handle candidate-related and meeting notifications by opening dialog
    if (
      userData?.role === "interviewer" &&
      (notification.relatedEntity === "candidate" ||
        notification.relatedEntity === "meeting") &&
      notification.relatedId
    ) {
      try {
        const result = await fetchCandidateById(notification.relatedId);
        if (result.data) {
          setSelectedCandidate(result.data);
          setIsCandidateDialogOpen(true);
          return;
        }
      } catch (error) {
        console.error("Failed to fetch candidate:", error);
        toast({
          title: "Error",
          description: "Failed to load candidate details",
          variant: "destructive",
        });
      }
    }

    // For admin/hr or non-candidate notifications, navigate to the page
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await markAsRead(id).unwrap();
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead().unwrap();
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    }
  };
  const { user } = useSelector((state: any) => state.auth || {});

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
      if (user) {
        setUserLoggedIn(true);
        // const decryptedResponse = await verifyAndDecryptJWTToken(String(user));
        // if (decryptedResponse.success && decryptedResponse.user) {
        setUserData(user);
        setUserLoggedIn(true);
        refetch();

        try {
          if (user.organizationInfo.name === "") {
            return;
          }
          const response = await fetch(
            "/api/checkorg?organizationId=" + user.organizationId
          );
          const resp = await response.json();
          if (!resp.exists) {
            Cookies.remove("token");
            dispatch(logout());
            await fetch("/api/auth/logout");

            // debugger;
            window.location.href = "/auth/login";
            return;
          }
        } catch (error) {
          console.error("Error checking organization:", error);
          Cookies.remove("token");
          dispatch(logout());
          await fetch("/api/auth/logout");

          window.location.href = "/auth/login";
        }
        // }
      }
    })();
  }, [user]);

  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(
    null
  );
  const [isCandidateDialogOpen, setIsCandidateDialogOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  // Handle responsive sidebar behavior
  useEffect(() => {
    const handleResize = () => {
      const isSmallScreen = window.innerWidth < 1200;
      const userPreference = sessionStorage.getItem("sidebar-user-preference");

      // On small screens, default to collapsed unless user has explicitly expanded
      if (isSmallScreen) {
        if (userPreference === "expanded") {
          setIsCollapsed(false);
        } else {
          setIsCollapsed(true);
        }
      } else {
        // On large screens, respect user preference or default to expanded
        if (userPreference === "collapsed") {
          setIsCollapsed(true);
        } else {
          setIsCollapsed(false);
        }
      }
    };

    // Initial check
    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Remove isCollapsed dependency to avoid infinite loops

  const handleLogout = async () => {
    // Cookies.remove("token");
    dispatch(logout());
    await fetch("/api/auth/logout");
    setUserData(null);
    setUserLoggedIn(false);
    refetch();
    toast({
      title: "Logged out",
      description: "You have been successfully logged out",
    });
    window.location.href = "/auth/login";
  };

  const generate_share_org = async (e: React.FormEvent) => {
    e.preventDefault();
    let parsedUser = user;

    // console.log(user);
    // if (user) {
    //   const decryptedResponse = await verifyAndDecryptJWTToken(String(user));
    //   if (decryptedResponse.success && decryptedResponse.user) {
    //     parsedUser = decryptedResponse.user;
    //   }
    // }
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

  // Inject portal colors as CSS custom properties
  useEffect(() => {
    console.log("Portal config data:", portalConfigData);
    if (portalConfigData?.primaryColor && portalConfigData?.secondaryColor) {
      console.log("Injecting portal colors:", {
        primary: portalConfigData.primaryColor,
        secondary: portalConfigData.secondaryColor,
      });
      const root = document.documentElement;
      root.style.setProperty("--portal-primary", portalConfigData.primaryColor);
      root.style.setProperty(
        "--portal-secondary",
        portalConfigData.secondaryColor
      );

      // Create lighter and darker variants for hover states
      const primaryRgb = hexToRgb(portalConfigData.primaryColor);
      const secondaryRgb = hexToRgb(portalConfigData.secondaryColor);

      if (primaryRgb) {
        root.style.setProperty(
          "--portal-primary-rgb",
          `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`
        );
        root.style.setProperty(
          "--portal-primary-hover",
          darkenColor(portalConfigData.primaryColor, 10)
        );
        root.style.setProperty(
          "--portal-primary-light",
          lightenColor(portalConfigData.primaryColor, 10)
        );

        // Update focus ring colors to use portal primary
        root.style.setProperty(
          "--focus-ring-color",
          `rgba(${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}, 0.2)`
        );
        root.style.setProperty(
          "--input-border-focus",
          portalConfigData.primaryColor
        );
      }

      if (secondaryRgb) {
        root.style.setProperty(
          "--portal-secondary-rgb",
          `${secondaryRgb.r}, ${secondaryRgb.g}, ${secondaryRgb.b}`
        );
        root.style.setProperty(
          "--portal-secondary-hover",
          darkenColor(portalConfigData.secondaryColor, 10)
        );
        root.style.setProperty(
          "--portal-secondary-light",
          lightenColor(portalConfigData.secondaryColor, 10)
        );
      }
    }
  }, [portalConfigData]);

  // Helper functions for color manipulation
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
      : null;
  };

  const darkenColor = (hex: string, percent: number) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const factor = (100 - percent) / 100;
    const r = Math.round(rgb.r * factor);
    const g = Math.round(rgb.g * factor);
    const b = Math.round(rgb.b * factor);

    // Ensure we always return a valid 6-digit hex
    const result = ((r << 16) + (g << 8) + b).toString(16).padStart(6, "0");
    return `#${result}`;
  };

  const lightenColor = (hex: string, percent: number) => {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;

    const factor = percent / 100;
    const r = Math.round(rgb.r + (255 - rgb.r) * factor);
    const g = Math.round(rgb.g + (255 - rgb.g) * factor);
    const b = Math.round(rgb.b + (255 - rgb.b) * factor);

    // Ensure we always return a valid 6-digit hex
    const result = ((r << 16) + (g << 8) + b).toString(16).padStart(6, "0");
    return `#${result}`;
  };
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
            onClick={() => {
              setIsCollapsed(!isCollapsed);
              sessionStorage.setItem("sidebar-user-preference", "expanded");
            }}
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
              onClick={() => {
                setIsCollapsed(!isCollapsed);
                sessionStorage.setItem("sidebar-user-preference", "collapsed");
              }}
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
              (item.role === "hr" &&
                userData?.role !== "admin" &&
                userData?.role !== "hr") ||
              (userData?.role === "interviewer" && item.title === "Jobs") ||
              (userData?.role === "interviewer" && item.title === "Search") ||
              (userData?.role === "interviewer" && item.title === "CV Upload")
            ) {
              return null;
            }
            const isActive =
              (item.title === "Settings" &&
                pathname.startsWith("/dashboard/settings")) ||
              (item.title === "Analytics" &&
                pathname.startsWith("/dashboard/analytics")) ||
              (item.title === "Email History" &&
                pathname.startsWith("/dashboard/email-history")) ||
              pathname === item.href;

            return (
              <Link key={item.href} href={item.href}>
                <span
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
                    isActive && "portal-nav-active",
                    isCollapsed ? "justify-center" : "justify-start"
                  )}
                  style={
                    isActive
                      ? {
                        backgroundColor: `rgba(var(--portal-primary-rgb, 99, 102, 241), 0.1)`,
                        color: `var(--portal-primary, #6366f1)`,
                        borderLeft: `3px solid var(--portal-primary, #6366f1)`,
                      }
                      : {}
                  }
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
        {/* Notifications and Theme Toggle */}
        <div
          // className="flex justify-start items-center gap-2 mb-2"
          className={cn(
            "flex justify-start items-center gap-2 mb-2",
            isCollapsed ? "flex-col" : "flex-row"
          )}
        >
          {userData && (
            <NotificationButton
              notifications={notificationsData?.notifications || []}
              unreadCount={notificationCountData?.unreadCount || 0}
              totalCount={notificationCountData?.totalCount || 0}
              currentPage={notificationsData?.pagination?.currentPage || 1}
              totalPages={notificationsData?.pagination?.totalPages || 1}
              isLoading={notificationsLoading}
              onMarkAsRead={handleMarkAsRead}
              onMarkAllAsRead={handleMarkAllAsRead}
              onNotificationClick={handleNotificationClick}
              onPageChange={setNotificationPage}
              className="mr-1"
            />
          )}
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

      {/* Candidate Details Dialog for Interviewers */}
      <CandidateDetailsDialog
        candidate={selectedCandidate}
        isOpen={isCandidateDialogOpen}
        onOpenChange={setIsCandidateDialogOpen}
        onUpdate={() => {
          // Optionally refresh candidate data
          if (selectedCandidate) {
            fetchCandidateById(selectedCandidate._id);
          }
        }}
        hideEditButton={userData?.role === "interviewer"}
        hideCloseButtons={false}
      />
    </div>
  );
}
