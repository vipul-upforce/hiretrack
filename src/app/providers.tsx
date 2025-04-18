"use client";

import { Provider } from "react-redux";
import { store } from "@/lib/store";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Toaster } from "@/components/ui/toaster";
import { CustomFieldsProvider } from "@/Custom_Fields/Context/CustomFieldsContext";
import { useEffect } from "react";
import { useGetPortalConfigsQuery } from "@/lib/features/settings/settingsApi";
import { useLocation } from "@/hooks/portal-meta";

// Handle portal configuration (title, favicon)
const PortalConfigHandler = ({ children }: { children: React.ReactNode }) => {
  const { data: portalConfig } = useGetPortalConfigsQuery(undefined);
  const location = useLocation();

  useEffect(() => {
    document.title = portalConfig?.portalName || "Hire Track";

    if (portalConfig?.portalLogo) {
      const existingFavicon = document.querySelector("link[rel~='icon']");
      if (
        !existingFavicon ||
        existingFavicon.getAttribute("href") !== portalConfig.portalLogo.url
      ) {
        const link = (existingFavicon ||
          document.createElement("link")) as HTMLLinkElement;
        link.type = "image/x-icon";
        link.rel = "shortcut icon";
        link.href = portalConfig.portalLogo.url;
        if (!existingFavicon) {
          document.head.appendChild(link);
        }
      }
    }
  }, [portalConfig, location]); // Will react to all location changes

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
