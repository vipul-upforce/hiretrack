"use client";

import { Provider } from "react-redux";
import { store } from "@/lib/store";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Toaster } from "@/components/ui/toaster";
import { CustomFieldsProvider } from "@/Custom_Fields/Context/CustomFieldsContext";
import { useEffect, useState } from "react";
// import { useGetPortalConfigsQuery } from "@/lib/features/settings/settingsApi";
import { useLocation } from "@/hooks/portal-meta";
import Cookies from "js-cookie";
import { verifyAndDecryptJWTToken } from "@/lib/auth";
import { IUser } from "@/lib/models/user";

// Check if favicon exists
const checkFaviconExists = async (url: string): Promise<boolean> => {
  try {
    const response = await fetch(url, { method: "HEAD" });
    const exists = response.ok;
    // console.log(
    //   `[PortalConfigHandler] Checked favicon: ${url}, exists: ${exists}`
    // );
    return exists;
  } catch (err) {
    // console.error(
    //   `[PortalConfigHandler] Error checking favicon ${url}: ${err instanceof Error ? err.message : "Unknown error"}`
    // );
    return false;
  }
};
// Handle portal configuration (title, favicon)
const PortalConfigHandler = ({ children }: { children: React.ReactNode }) => {
  // const {
  //   data: portalConfig,
  //   isLoading,
  //   error,
  // } = useGetPortalConfigsQuery(undefined);
  const [user, setUser] = useState<IUser | null>(null);
  const location = useLocation();
  // const faviconRef = useRef<string | null>(null); // Track current favicon to avoid redundant updates

  // Get user from cookies when component mounts or location changes
  useEffect(() => {
    (async () => {
      const token = Cookies.get("token");
      // console.log(
      //   `[PortalConfigHandler] Cookie token: ${token || "not found"}`
      // );
      if (token) {
        try {
          const decryptedResponse = await verifyAndDecryptJWTToken(token);
          if (decryptedResponse.success && decryptedResponse.user) {
            setUser(decryptedResponse.user);
            // console.log(
            //   `[PortalConfigHandler] User loaded: ${JSON.stringify(decryptedResponse.user)}`
            // );
          } else {
            // console.log(
            //   `[PortalConfigHandler] Token decryption failed: ${JSON.stringify(decryptedResponse)}`
            // );
          }
        } catch (err) {
          console.error(
            `[PortalConfigHandler] Error decrypting token: ${err instanceof Error ? err.message : "Unknown error"}`
          );
        }
      } else {
        setUser(null);
      }
    })();
  }, [location]);

  useEffect(() => {
    (async () => {
      if (!user) {
        // console.log(
        //   "[PortalConfigHandler] User data not yet available, deferring favicon setup"
        // );
        return;
      }

      const currentFavicon = document
        .querySelector("link[rel~='icon']")
        ?.getAttribute("href");

      const title = user?.organizationInfo?.name || "Hiretrack";
      document.title = title;
      // console.log(`[PortalConfigHandler] Setting title: ${title}`);

      const orgName =
        user?.organizationInfo?.name?.toLowerCase().replace(/\s+/g, "-") ||
        "default";
      // const faviconUrl = `/api/files?pathName=../assets/organizations/${orgName}/favicon.png`;
      const faviconUrl = `/api/files?pathName=../assets/organizations/${orgName}/favicon.png`;
      const fallbackFaviconUrl = "/favicon.png";

      let targetFaviconUrl;

      try {
        // Check if the organization favicon exists
        const fileExists = await checkFaviconExists(faviconUrl);
        targetFaviconUrl = fileExists ? faviconUrl : fallbackFaviconUrl;
      } catch (error) {
        console.error("[PortalConfigHandler] Error checking favicon:", error);
        targetFaviconUrl = fallbackFaviconUrl;
      }

      // Skip update if the favicon is already correct
      if (currentFavicon === targetFaviconUrl) {
        // console.log(
        //   `[PortalConfigHandler] Skipping favicon update: already set to ${targetFaviconUrl}`
        // );
        return;
      }

      // console.log(
      //   `[PortalConfigHandler] Setting favicon from ${currentFavicon} to ${targetFaviconUrl}`
      // );

      // Update favicon
      const existingFavicon = document.querySelector(
        "link[rel~='icon']"
      ) as HTMLLinkElement | null;
      if (!existingFavicon) {
        const link = document.createElement("link");
        link.rel = "icon";
        link.type = "image/png";
        link.href = targetFaviconUrl;
        document.head.appendChild(link);
      } else {
        existingFavicon.type = "image/png";
        existingFavicon.href = targetFaviconUrl;
      }
    })();
  }, [user, location]);

  return <>{children}</>;
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Provider store={store}>
        <CustomFieldsProvider>
          <PortalConfigHandler>{children}</PortalConfigHandler>
        </CustomFieldsProvider>
      </Provider>
      <Toaster />
    </LocalizationProvider>
  );
}

// "use client";

// import { Provider } from "react-redux";
// import { store } from "@/lib/store";
// import { LocalizationProvider } from "@mui/x-date-pickers";
// import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
// import { Toaster } from "@/components/ui/toaster";
// import { CustomFieldsProvider } from "@/Custom_Fields/Context/CustomFieldsContext";
// import { useEffect, useRef, useState } from "react";
// // import { useGetPortalConfigsQuery } from "@/lib/features/settings/settingsApi";
// import { useLocation } from "@/hooks/portal-meta";
// import { IUser } from "@/lib/models/user";
// import Cookies from "js-cookie";
// import { verifyAndDecryptJWTToken } from "@/lib/auth";
// interface DecryptedResponse {
//   success: boolean;
//   user?: IUser;
// }
// // Handle portal configuration (title, favicon)
// const PortalConfigHandler = ({ children }: { children: React.ReactNode }) => {
//   const location = useLocation();
//   const [user, setUser] = useState<IUser | null>(null);
//   // const faviconRef = useRef<string | null>(null); // Track current favicon to avoid redundant updates
//   const faviconCache = useRef<Map<string, boolean>>(new Map());

//   // Get user from cookies on mount and location change
//   useEffect(() => {
//     (async () => {
//       const token = Cookies.get("token");
//       console.log(
//         `[PortalConfigHandler] Cookie token: ${token || "not found"}`
//       );
//       if (token) {
//         try {
//           const decryptedResponse: DecryptedResponse =
//             await verifyAndDecryptJWTToken(token);
//           if (decryptedResponse.success && decryptedResponse.user) {
//             setUser(decryptedResponse.user);
//             console.log(
//               `[PortalConfigHandler] User loaded: ${JSON.stringify(decryptedResponse.user)}`
//             );
//           } else {
//             console.log(
//               `[PortalConfigHandler] Token decryption failed: ${JSON.stringify(decryptedResponse)}`
//             );
//             setUser(null);
//           }
//         } catch (err) {
//           console.error(
//             `[PortalConfigHandler] Error decrypting token: ${err instanceof Error ? err.message : "Unknown error"}`
//           );
//           setUser(null);
//         }
//       } else {
//         setUser(null); // Clear user if no token
//       }
//     })();
//   }, [location]);

//   // Check if favicon exists
//   const checkFaviconExists = async (url: string): Promise<boolean> => {
//     // Check cache first
//     if (faviconCache.current.has(url)) {
//       console.log(
//         `[PortalConfigHandler] Cache hit for favicon: ${url}, exists: ${faviconCache.current.get(url)}`
//       );
//       return faviconCache.current.get(url)!;
//     }

//     try {
//       const response = await fetch(url, { method: "HEAD" });
//       const exists = response.ok;
//       faviconCache.current.set(url, exists);
//       console.log(
//         `[PortalConfigHandler] Checked favicon: ${url}, exists: ${exists}`
//       );
//       return exists;
//     } catch (err) {
//       console.error(
//         `[PortalConfigHandler] Error checking favicon ${url}: ${err instanceof Error ? err.message : "Unknown error"}`
//       );
//       faviconCache.current.set(url, false);
//       return false;
//     }
//   };

//   useEffect(() => {
//     (async () => {
//       // Set document title
//       const title = user?.organizationInfo?.name || "Hiretrack";
//       document.title = title;
//       console.log(`[PortalConfigHandler] Setting title: ${title}`);

//       // Set favicon
//       const orgName =
//         user?.organizationInfo?.name?.toLowerCase().replace(/\s+/g, "-") ||
//         "default";
//       const faviconUrl = `/${orgName}/favicon.png`; // Maps to public/<orgName>/favicon.png
//       const fallbackFaviconUrl = "/favicon.png";

//       // Determine favicon to use
//       let targetFaviconUrl = fallbackFaviconUrl;
//       if (user?.organizationInfo?.name) {
//         const faviconExists = await checkFaviconExists(faviconUrl);
//         targetFaviconUrl = faviconExists ? faviconUrl : fallbackFaviconUrl;
//       }

//       console.log(
//         `[PortalConfigHandler] Selected favicon: ${targetFaviconUrl}`
//       );

//       // Avoid redundant favicon updates
//       // if (faviconRef.current === targetFaviconUrl) {
//       //   console.log(
//       //     `[PortalConfigHandler] Skipping favicon update: already set to ${targetFaviconUrl}`
//       //   );
//       //   return;
//       // }

//       console.log(`[PortalConfigHandler] Setting favicon: ${targetFaviconUrl}`);
//       // faviconRef.current = targetFaviconUrl;

//       const existingFavicon = document.querySelector(
//         "link[rel~='icon']"
//       ) as HTMLLinkElement | null;
//       if (!existingFavicon) {
//         const link = document.createElement("link");
//         link.rel = "icon";
//         link.type = "image/png";
//         link.href = targetFaviconUrl;
//         document.head.appendChild(link);
//       } else {
//         // setTimeout
//         existingFavicon.type = "image/png";
//         existingFavicon.href = targetFaviconUrl;
//       }
//     })();
//   }, [user, location]);

//   return <>{children}</>;
// };
// export function Providers({ children }: { children: React.ReactNode }) {
//   return (
//     <LocalizationProvider dateAdapter={AdapterDayjs}>
//       <Provider store={store}>
//         <CustomFieldsProvider>
//           <PortalConfigHandler>{children}</PortalConfigHandler>
//         </CustomFieldsProvider>
//       </Provider>
//       <Toaster />
//     </LocalizationProvider>
//   );
// }

// "use client";

// import { Provider } from "react-redux";
// import { store } from "@/lib/store";
// import { LocalizationProvider } from "@mui/x-date-pickers";
// import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
// import { Toaster } from "@/components/ui/toaster";
// import { CustomFieldsProvider } from "@/Custom_Fields/Context/CustomFieldsContext";
// import { useEffect } from "react";
// import { useGetPortalConfigsQuery } from "@/lib/features/settings/settingsApi";
// import { useLocation } from "@/hooks/portal-meta";

// // Handle portal configuration (title, favicon)
// const PortalConfigHandler = ({ children }: { children: React.ReactNode }) => {
//   const { data: portalConfig } = useGetPortalConfigsQuery(undefined);
//   const location = useLocation();

//   useEffect(() => {
//     const localConfig = localStorage.getItem("portalConfig");
//     const parsedConfig = localConfig ? JSON.parse(localConfig) : null;

//     const configToUse = portalConfig || parsedConfig;

//     if (configToUse) {
//       document.title = configToUse.portalName || "Hire Track";

//       const existingFavicon = document.querySelector("link[rel~='icon']");
//       if (
//         !existingFavicon ||
//         existingFavicon.getAttribute("href") !== configToUse.portalLogo?.url
//       ) {
//         const link = (existingFavicon ||
//           document.createElement("link")) as HTMLLinkElement;
//         link.type = "image/x-icon";
//         link.rel = "icon";
//         link.href = configToUse.portalLogo?.url;
//         if (!existingFavicon) {
//           document.head.appendChild(link);
//         }
//       }
//     }

//     // Store fresh config in localStorage if available
//     if (portalConfig) {
//       localStorage.setItem("portalConfig", JSON.stringify(portalConfig));
//     }
//   }, [portalConfig, location]);

//   return <>{children}</>;
// };

// export function Providers({ children }: { children: React.ReactNode }) {
//   return (
//     <LocalizationProvider dateAdapter={AdapterDayjs}>
//       <Provider store={store}>
//         <CustomFieldsProvider>
//           <PortalConfigHandler>{children}</PortalConfigHandler>
//         </CustomFieldsProvider>
//       </Provider>
//       <Toaster />
//     </LocalizationProvider>
//   );
// }
