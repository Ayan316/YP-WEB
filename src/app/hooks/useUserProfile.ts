import { useQuery } from "@tanstack/react-query";
import { getUserProfile } from "@/services/profile.services";
import { useHasSession } from "@/app/hooks/useHasSession";

export const USER_PROFILE_QUERY_KEY = ["user-profile"];

// Subset of the user profile response surface the UI cares about. Loose
// because the backend response carries many other fields we don't strictly
// type here, but we want strong typing for the new career_status fields so
// downstream components (profile cards) get IDE help.
export interface UserProfileData {
  id?: string | number;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  phone_number?: string;
  location?: string;
  dob?: string;
  gender?: string;
  college?: string;
  study_field?: string;
  start_year?: string;
  end_year?: string;
  skills?: any[];
  about?: string;
  profile_image_url?: string;
  profile_completion_status?: string;
  // New career-status fields
  career_status?: string;
  current_situation?: string;
  [key: string]: any;
}

export interface UserProfileResponse {
  success?: boolean;
  message?: string;
  data?: UserProfileData;
}

export function useUserProfile() {
  // Only fetch the (gated) own-profile when a session cookie is present, so
  // logged-out visitors on public pages don't trigger 401 UNAUTHENTICATED.
  const { data: hasSession } = useHasSession();
  return useQuery({
    queryKey: USER_PROFILE_QUERY_KEY,
    queryFn: getUserProfile,
    enabled: hasSession === true,
    // staleTime: Infinity,
    // gcTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });
}
