import { apiSlice } from "../api/apiSlice";

export interface User {
  organizationId: string | object;
  _id: string;
  id: string;
  name: string;
  email: string;
  role: "hr" | "interviewer" | "admin" | "candidate" | "system";
  createdAt: string;
  isDeleted?: boolean;
}

export interface UserEdit {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
}

export const usersApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<User[], void>({
      query: () => "/api/users",
      providesTags: ["Users"],
    }),
    getUserById: builder.query<User, string>({
      query: (id) => `/api/users/${id}`,
      providesTags: ["Users"],
    }),
    deleteUser: builder.mutation<void, string>({
      query: (id) => ({
        url: `/api/users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Users"],
    }),
    updateUser: builder.mutation<void, UserEdit>({
      query: ({ id, ...userData }) => ({
        url: `/api/users/${id}`,
        method: "PUT",
        body: { ...userData },
      }),
      invalidatesTags: ["Users"],
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
