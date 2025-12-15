import { runIfCookiePresent } from '@/lib/utils/queryGuards';
import { baseApi } from '@/lib/api/baseApi';

export interface Interviewer {
  _id: string;
  name: string;
  email: string;
}

export const userApi = baseApi.injectEndpoints({
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
