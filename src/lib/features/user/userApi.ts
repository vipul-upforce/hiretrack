import { runIfCookiePresent } from '@/lib/utils/queryGuards';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export interface Interviewer {
  _id: string;
  name: string;
  email: string;
}

export const userApi = createApi({
  reducerPath: 'userApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    fetchInterviewers: builder.query<Interviewer[], void>({
      queryFn: (_arg, _api, _extraOptions, baseQuery) => runIfCookiePresent<Interviewer[]>(
        baseQuery,
        () => ({
          url: '/users/interviewers',
          method: 'GET',
        }),
        { emptyResponse: [] },
      ),
    }),
  }),
});

export const { useFetchInterviewersQuery } = userApi;
