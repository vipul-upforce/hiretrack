import { configureStore } from "@reduxjs/toolkit";
import resumeReducer from "@/lib/redux/resumeSlice";
import settingsReducer from "@/lib/redux/settingsSlice";
import authReducer from "@/lib/redux/authSlice";

export const store = configureStore({
  reducer: {
    resume: resumeReducer,
    settings: settingsReducer,
    auth: authReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
