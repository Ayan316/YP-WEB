import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUserProfile } from "@/services/profile.services";
import { USER_PROFILE_QUERY_KEY } from "./useUserProfile";

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserProfile,
    onSuccess: (data) => {
      // Merge the update response into the existing cache so that fields
      // not returned by the update endpoint (e.g. strengths_summary,
      // interests_summary) are preserved instead of being wiped out.
      queryClient.setQueryData(USER_PROFILE_QUERY_KEY, (old: any) => {
        if (!old) return data;
        return {
          ...old,
          ...data,
          data: { ...old.data, ...data?.data },
        };
      });
    },
  });
}
