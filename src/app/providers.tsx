"use client";

import { Provider } from "react-redux";
import { store } from "@/lib/store";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Toaster } from "@/components/ui/toaster";
import { CustomFieldsProvider } from "@/Custom_Fields/Context/CustomFieldsContext";
import { ThemeProvider } from "@/components/theme-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider defaultTheme="light" storageKey="hiretrack-theme">
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Provider store={store}>
          <CustomFieldsProvider>{children}</CustomFieldsProvider>
        </Provider>
      </LocalizationProvider>
      <Toaster />
    </ThemeProvider>
  );
}
