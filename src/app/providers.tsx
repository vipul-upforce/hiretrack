'use client';

import { Provider } from 'react-redux';
import { persistor, store } from '@/lib/store';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Toaster } from '@/components/ui/toaster';
import { CustomFieldsProvider } from '@/Custom_Fields/Context/CustomFieldsContext';
import { ThemeProvider } from '@/components/theme-provider';
import { PersistGate } from 'redux-persist/integration/react';
import React, { Suspense } from 'react';
import { DeferredRemarkProvider } from '@/contexts/deferred-remark-context';
import { UnifiedDialogChecklistJobProvider } from '@/contexts/unified-dialog-checklist-job-context';
import LoadingScreen from './loading-screen';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ThemeProvider defaultTheme="light" storageKey="hiretrack-theme">
        <DeferredRemarkProvider>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Provider store={store}>
              <PersistGate loading={null} persistor={persistor}>
                <UnifiedDialogChecklistJobProvider>
                  <CustomFieldsProvider>{children}</CustomFieldsProvider>
                </UnifiedDialogChecklistJobProvider>
              </PersistGate>
            </Provider>
          </LocalizationProvider>
          <Toaster />
        </DeferredRemarkProvider>
      </ThemeProvider>
    </Suspense>
  );
}
