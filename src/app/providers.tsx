"use client";
import { Provider } from "react-redux";
import { persistor, store } from "@/lib/store";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { Toaster } from "@/components/ui/toaster";
import { CustomFieldsProvider } from "@/Custom_Fields/Context/CustomFieldsContext";
import { ThemeProvider } from "@/components/theme-provider";
import { PersistGate } from "redux-persist/integration/react";
import LoadingScreen from "./loading-screen";
import { Suspense } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ThemeProvider defaultTheme="light" storageKey="hiretrack-theme">
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
              <CustomFieldsProvider>{children}</CustomFieldsProvider>
            </PersistGate>
          </Provider>
        </LocalizationProvider>
        <Toaster />
      </ThemeProvider>
    </Suspense>
  );
}
