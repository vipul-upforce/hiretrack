import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { ILane } from "@/lib/models/Lane";

export const laneApi = createApi({
  reducerPath: "laneApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  tagTypes: ["Lane"],
  endpoints: (builder) => ({
    getLanes: builder.query({
      query: (userId) => (userId ? `lanes?userId=${userId}` : "lanes"),
      providesTags: ["Lane"],
    }),
    updateLanes: builder.mutation<ILane, { userId: string; lanes: string[] }>({
      query: (data) => ({
        url: "lanes",
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Lane"],
    }),
    editLane: builder.mutation<
      ILane,
      { organizationId: string; prevLaneId: string; newLaneId: string }
    >({
      query: (data) => ({
        url: `lanes/${data.prevLaneId || ""}`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Lane"],
    }),
    deleteLane: builder.mutation<
      void,
      { laneId: string; organizationId: string | object }
    >({
      query: ({ organizationId, laneId }) => {
        return {
          url: `lanes/${laneId}`,
          method: "DELETE",
          body: { organizationId },
        };
      },
      invalidatesTags: ["Lane"],
    }),
  }),
});

export const {
  useGetLanesQuery,
  useUpdateLanesMutation,
  useEditLaneMutation,
  useDeleteLaneMutation,
} = laneApi;
