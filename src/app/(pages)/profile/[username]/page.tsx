// app/profile/page.tsx
"use client";

import ProfileInfoCard from "@/components/profile/ProfileInfoCard";
import ProfileLayout from "@/components/profile/ProfileLayout";
import EducationCard from "@/components/profile/EducationCard";
import SkillsCard from "@/components/profile/SkillsCard";
import ProfileImageCard from "@/components/profile/ProfileImageCard";
import AboutCard from "@/components/profile/AboutCard";

import { useQueryClient } from "@tanstack/react-query";
import {
  USER_PROFILE_QUERY_KEY,
  useUserProfile,
} from "@/app/hooks/useUserProfile";

import ProfileSkeleton from "@/components/commonUI/loaders/skeletons/ProfileSkeleton";
import SummaryCard from "@/components/profile/SummeryCard";
import ResumeUploader from "@/components/profile/resume/ResumeUploader";
import { getCareerStatusNameById } from "@/helpers/careerStatus";

export default function ProfilePage() {
  // Hits the same TanStack Query cache the rest of the app shares, so
  // back-navigation from a child page (edit modal, other-user profile) is
  // an instant cache read rather than a refetch.
  const { data: profileResponse, isLoading, isError } = useUserProfile();
  const queryClient = useQueryClient();

  const user = profileResponse?.data;

  // Local in-place updates from card actions write through to the same cache
  // entry so a re-render reflects the new values without a network round-trip.
  const updateUser = (next: any) => {
    queryClient.setQueryData(USER_PROFILE_QUERY_KEY, (prev: any) => {
      if (!prev) return prev;
      return {
        ...prev,
        data:
          typeof next === "function"
            ? next(prev.data)
            : { ...prev.data, ...next },
      };
    });
  };

  if (isError) {
    return (
      <div style={{ textAlign: "center", padding: "40px 20px", color: "#fff" }}>
        <h2>Failed to load profile</h2>
        <p style={{ color: "#A0AEC0", marginTop: "8px" }}>
          Something went wrong while fetching your profile. Please try again later.
        </p>
      </div>
    );
  }

  if (isLoading || !user) {
    return (
      <>
        <ProfileSkeleton />
      </>
    );
  }

  const userProfilePic = user?.profile_image_url || null;

  return (
    <>
      {/* <BackgroundComponents
        style={{
          background: "#040f1f",
          backdropFilter: "blur(10px)",
        }}
      > */}
      <ProfileLayout
        topLeft={
          <ProfileImageCard
            firstName={
              user?.first_name || user?.full_name?.split(" ")[0] || ""
            }
            lastName={
              user?.last_name ||
              user?.full_name?.split(" ").slice(1).join(" ") ||
              ""
            }
            imageSrc={userProfilePic}
            userId={user?.id}
            onImageUpdated={(newImg) =>
              updateUser({ profile_image_url: newImg })
            }
          />
        }
        topRight={
          <EducationCard
            dob={user?.dob || ""}
            university={user?.college || "Comobia University"}
            degree={user?.study_field || "Apprenticeship"}
            duration={
              user?.start_year && user?.end_year
                ? `${user.start_year.slice(-4)} - ${user.end_year.slice(-4)}`
                : "Not Provided"
            }
            careerStatus={getCareerStatusNameById(user?.career_status)}
            currentSituation={user?.current_situation || ""}
            onEducationUpdated={(updated: any) => updateUser(updated)}
          />
        }
        bottomLeft={
          <ProfileInfoCard
            firstName={
              user?.first_name || user?.full_name?.split(" ")[0] || "John"
            }
            lastName={
              user?.last_name ||
              user?.full_name?.split(" ").slice(1).join(" ") ||
              "Doe"
            }
            email={user?.email || ""}
            phone={user?.phone ?? ""}
            location={user?.location || "South East"}
            university={user?.college || "Unknown University"}
            dob={user?.dob || ""}
            gender={user?.gender || ""}
            onProfileUpdated={(updatedData) =>
              updateUser((prev: any) => ({ ...prev, ...updatedData }))
            }
          />
        }
        bottomRight={
          <SkillsCard
            skills={user?.skills || []}
            onSkillsUpdated={(updatedSkills) =>
              updateUser({ skills: updatedSkills })
            }
          />
        }
        down={
          <>
            <AboutCard
              about={user?.about || ""}
              careerStatus={getCareerStatusNameById(user?.career_status)}
              currentSituation={user?.current_situation || ""}
              onAboutUpdated={(about) => updateUser({ about })}
            />

            

            <SummaryCard />
            {/* <ResumeUploader user={user} onUpdated={(patch) => updateUser(patch)} /> */}
          </>
        }
      />
      {/* </BackgroundComponents> */}
    </>
  );
}