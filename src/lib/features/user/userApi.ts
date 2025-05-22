import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface Interviewer {
  _id: string;
  name: string;
  email: string;
}

export const userApi = createApi({
  reducerPath: "userApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  endpoints: (builder) => ({
    fetchInterviewers: builder.query<Interviewer[], void>({
      query: () => "/users/interviewers",
    }),
  }),
});

export const { useFetchInterviewersQuery } = userApi;
