import { baseApi } from '@/lib/api/baseApi';

export interface Interviewer {
  _id: string;
  name: string;
  email: string;
}

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    fetchInterviewers: builder.query<Interviewer[], void>({
      query: () => '/users/interviewers',
      providesTags: ['Users'],
    }),
  }),
});

export const { useFetchInterviewersQuery } = userApi;
