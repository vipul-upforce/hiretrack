import { baseApi } from '@/lib/api/baseApi';

export interface User {
  organizationId: string | object;
  _id: string;
  id: string;
  name: string;
  email: string;
  role: 'hr' | 'interviewer' | 'admin' | 'candidate' | 'system';
  createdAt: string;
  isDeleted?: boolean;
}

export interface UserEdit {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
}

export const usersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<User[], void>({
      query: () => '/users',
      providesTags: ['Users'],
    }),
    getUserById: builder.query<User, string>({
      query: (id) => `/users/${id}`,
      providesTags: ['Users'],
    }),
    deleteUser: builder.mutation<void, string>({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Users'],
    }),
    updateUser: builder.mutation<void, UserEdit>({
      query: ({ id, ...userData }) => ({
        url: `/users/${id}`,
        method: 'PUT',
        body: { ...userData },
      }),
      invalidatesTags: ['Users'],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetUsersQuery,
  useGetUserByIdQuery,
  useDeleteUserMutation,
  useUpdateUserMutation,
} = usersApi;
