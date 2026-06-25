import React from "react";
import companystyles from "@/moduleCss/comapnyDetails.module.css";
import Image from "next/image";
import { useRouter } from "next/navigation";
import DefaultJobs from "../../../public/images/company-logo-default.svg";
import { followCompany } from "@/services/company.services";
import { useAuthGate } from "@/app/hooks/useAuthGate";
import { isUnauthenticatedError } from "@/lib/authError";
import { fetchCompanyJobs } from "@/services/jobs.services";
import { toast } from "react-toastify";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ensureValidToken } from "@/lib/tokenManager";
import LogOutModal from "../commonUI/LogOutModal";
import { useState } from "react";
import ProfileImagePreview from "../commonUI/ProfileImagePreview";
import ConfirmModal from "../commonUI/ConfirmModal";
import { useTheme } from "@/context/ThemeContext";
import jobstyles from "@/moduleCss/jobs.module.css";
import BuildingIcon from "@/_assets/icons/header_icons/clarity_building-solid.svg";
import { LogoWithFallback } from "../commonUI/InitialAvatar";

type Props = {
  companyDetails: any;
};

const CompanyInfo = ({ companyDetails }: Props) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";

  const [showUnfollowModal, setShowUnfollowModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "follow" | "unfollow" | null
  >(null);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);

  console.log("Company Details ---------------->", companyDetails);

  // Fetch company jobs to check if opportunities exist
  const { data: companyJobsData } = useQuery({
    queryKey: ["company-jobs-check", companyDetails?.id],
    queryFn: () => fetchCompanyJobs({ limit: 1, page: 1, id: companyDetails?.id }),
    enabled: !!companyDetails?.id,
  });

  const hasOpportunities = (companyJobsData?.jobs?.length ?? 0) > 0;

  // Follow/Unfollow mutation with optimistic updates
  const followMutation = useMutation({
    // mutationFn: () => followCompany({
    //   company_id: companyDetails?.id
    // }),
    mutationFn: async () => {
      await ensureValidToken();
      return followCompany({
        company_id: companyDetails?.id,
      });
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ["company-details", companyDetails?.id],
      });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData([
        "company-details",
        companyDetails?.id,
      ]);

      // Get current follow status BEFORE toggling
      const currentFollowStatus = companyDetails?.follow_status;

      // Optimistically update the cache
      queryClient.setQueryData(
        ["company-details", companyDetails?.id],
        (old: any) => {
          if (!old) return old;

          return {
            ...old,
            data: {
              ...old.data,
              follow_status: !currentFollowStatus,
            },
          };
        },
      );

      return { previousData, currentFollowStatus };
    },
    onSuccess: (data, variables, context) => {
      // Use the captured follow status from onMutate
      const wasFollowing = context?.currentFollowStatus;
      toast.success(
        wasFollowing
          ? "Successfully unfollowed company"
          : "Successfully followed company",
      );
    },
    onError: (err, variables, context) => {
      if (isUnauthenticatedError(err)) openGate("follow this company");
      else toast.error("Failed to update follow status");
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          ["company-details", companyDetails?.id],
          context.previousData,
        );
      }
      console.error("Error following company:", err);
    },
    onSettled: () => {
      // Refetch after mutation settles
      queryClient.invalidateQueries({
        queryKey: ["company-details", companyDetails?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["companies-list"] });
    },
  });

  const isFollowing = companyDetails?.follow_status;
  const { ensureAuthed, openGate, gateModal: authGateModal } = useAuthGate();

  // Button Click Handler
  const handleFollowCompany = () => {
    ensureAuthed("follow this company", () => {
      if (isFollowing) {
        setPendingAction("unfollow");
        setShowUnfollowModal(true);
      } else {
        setPendingAction("follow");
        followMutation.mutate();
      }
    });
  };

  const confirmUnfollow = () => {
    followMutation.mutate();
    setShowUnfollowModal(false);
  };

  const cancelUnfollow = () => {
    setShowUnfollowModal(false);
    setPendingAction(null);
  };

  return (
    <>
      <section className={companystyles.companyInfo_area_main_section}>
        <div className={companystyles.companyInfo_area_container}>
          <div className={companystyles.companyInfo_area_wrapper}>
            <div
              className={companystyles.companyInfo_icon_area}
              // onClick={() => router.push(`/company/${companyDetails?.id}`)}
            >
              <LogoWithFallback
                src={companyDetails?.logo_url}
                name={companyDetails?.name || ''}
                size={100}
                borderRadius={10}
                alt="Company Info Icon"
              />
            </div>
            <div className={companystyles.companyInfo_content_area}>
              <h4
                className={companystyles.company_title}
                onClick={() => router.push(`/company/${companyDetails?.id}`)}
              >
                {companyDetails?.name}
              </h4>
              <div className={companystyles.companyInfo_lower_content}>
                {companyDetails?.address && (
                  <div className={companystyles.companyInfo_lower_content_left}>
                    <span className={companystyles.companyInfo_content_icon}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={12}
                        height={14}
                        viewBox="0 0 9 10"
                        fill="none"
                      >
                        <path
                          d="M4.0885 9.21565C5.14818 8.26701 5.9591 7.3571 6.52126 6.48592C7.08342 5.61474 7.3645 4.85171 7.3645 4.19683C7.3645 3.20938 7.05078 2.3976 6.42335 1.7615C5.79592 1.1254 5.01764 0.807354 4.0885 0.807354C3.15936 0.807354 2.38108 1.1254 1.75365 1.7615C1.12622 2.3976 0.8125 3.20938 0.8125 4.19683C0.8125 4.85171 1.09358 5.61474 1.65574 6.48592C2.2179 7.3571 3.02882 8.26701 4.0885 9.21565ZM4.0885 9.98847C3.98297 9.98847 3.87743 9.97028 3.7719 9.9339C3.66627 9.89742 3.57076 9.841 3.48535 9.76463C2.9993 9.31667 2.54443 8.85535 2.12076 8.38067C1.69718 7.90608 1.32898 7.43162 1.01617 6.9573C0.703264 6.48298 0.455677 6.01286 0.273406 5.54694C0.0911355 5.08092 0 4.63089 0 4.19683C0 2.94685 0.404309 1.93488 1.21293 1.16093C2.02164 0.386975 2.98016 0 4.0885 0C5.19684 0 6.15536 0.386975 6.96407 1.16093C7.77269 1.93488 8.177 2.94685 8.177 4.19683C8.177 4.63089 8.08587 5.08002 7.90359 5.54423C7.72132 6.00853 7.47464 6.47869 7.16354 6.95473C6.85235 7.43076 6.48497 7.90522 6.06139 8.37809C5.6378 8.85106 5.18294 9.31148 4.69679 9.75934C4.61265 9.83572 4.517 9.893 4.40984 9.93119C4.30277 9.96938 4.19566 9.98847 4.0885 9.98847ZM4.08945 5.07284C4.35893 5.07284 4.58932 4.97688 4.78061 4.78495C4.972 4.59302 5.0677 4.36231 5.0677 4.09283C5.0677 3.82335 4.97173 3.59292 4.7798 3.40153C4.58787 3.21023 4.35712 3.11458 4.08755 3.11458C3.81807 3.11458 3.58768 3.21055 3.39639 3.40248C3.205 3.59441 3.1093 3.82516 3.1093 4.09473C3.1093 4.36421 3.20527 4.5946 3.3972 4.7859C3.58913 4.97719 3.81988 5.07284 4.08945 5.07284Z"
                          fill="#A0AEC0"
                        />
                      </svg>
                      Location
                    </span>
                    {isLight ? (
                      <p
                        className={`${jobstyles.light_side_profile_location} mt-2`}
                      >
                        {companyDetails.address}
                      </p>
                    ) : (
                      <p className="location-badge-design mt-2">
                        {companyDetails.address}
                      </p>
                    )}
                  </div>
                )}
                {companyDetails?.industry_name && (
                  <div className={companystyles.companyInfo_lower_content_left}>
                    <span className={companystyles.companyInfo_content_icon}>
                      <Image
                        src={BuildingIcon}
                        alt="Industry"
                        width={12}
                        height={14}
                        style={
                          isLight
                            ? {
                                filter:
                                  "brightness(0) saturate(100%) invert(3%) sepia(15%) saturate(4962%) hue-rotate(186deg) brightness(97%) contrast(101%)",
                              }
                            : {
                                filter:
                                  "brightness(0) saturate(100%) invert(74%) sepia(6%) saturate(735%) hue-rotate(178deg) brightness(90%) contrast(88%)",
                              }
                        }
                      />
                      Industry
                    </span>
                    <p
                      className="mt-2"
                      style={{
                        color: isLight ? "#040F1F" : "#fff",
                        fontSize: "14px",
                      }}
                    >
                      {companyDetails.industry_name}
                    </p>
                  </div>
                )}
                {companyDetails?.email && (
                  <div
                    className={companystyles.companyInfo_lower_content_right}
                  >
                    <span className={companystyles.companyInfo_content_icon}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width={16}
                        height={16}
                        viewBox="0 0 19 17"
                        fill="none"
                      >
                        <path
                          d="M17.2162 15.7857H1.78273C0.797369 15.7857 0.00195312 14.9721 0.00195312 13.9642V3.03566C0.00195312 2.0278 0.797369 1.21423 1.78273 1.21423H17.2162C18.2015 1.21423 18.997 2.0278 18.997 3.03566V13.9642C18.997 14.9721 18.2015 15.7857 17.2162 15.7857ZM1.78273 2.42852C1.45032 2.42852 1.18914 2.69566 1.18914 3.03566V13.9642C1.18914 14.3042 1.45032 14.5714 1.78273 14.5714H17.2162C17.5486 14.5714 17.8098 14.3042 17.8098 13.9642V3.03566C17.8098 2.69566 17.5486 2.42852 17.2162 2.42852H1.78273Z"
                          fill="#A0AEC0"
                        />
                        <path
                          d="M9.50074 10.88C8.66971 10.88 7.90991 10.54 7.34006 9.92075L1.10732 3.14504C0.881758 2.90218 0.89363 2.51361 1.13107 2.2829C1.3685 2.05218 1.7484 2.06433 1.97397 2.30718L8.20671 9.0829C8.8834 9.82361 10.1181 9.82361 10.7948 9.0829L17.0275 2.31933C17.2531 2.07647 17.633 2.06433 17.8704 2.29504C18.1079 2.52575 18.1197 2.91432 17.8942 3.15718L11.6614 9.9329C11.0916 10.5522 10.3318 10.8922 9.50074 10.8922V10.88Z"
                          fill="#A0AEC0"
                        />
                      </svg>
                      Email
                    </span>
                    <p className={companystyles.companyInfo_lower_content_text}>
                      {companyDetails?.email}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={companystyles.connect_button_wrapper}>
            {companyDetails?.website ? (
              <a
                href={companyDetails.website.startsWith('http') ? companyDetails.website : `https://${companyDetails.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`${companystyles.website_btn} ${isLight ? companystyles.light_website_btn : ''}`}
              >
                Website
              </a>
            ) : (
              <button
                type="button"
                disabled
                aria-disabled="true"
                className={`${companystyles.website_btn} ${isLight ? companystyles.light_website_btn : ''}`}
                style={{ opacity: 0.5, cursor: 'not-allowed' }}
              >
                Website
              </button>
            )}
            {hasOpportunities && (
              <button
                onClick={() => {
                  const tabSection = document.getElementById('opportunities-section')
                  if (tabSection) tabSection.scrollIntoView({ behavior: 'smooth' })
                }}
                type="button"
                className={companystyles.opportunities_btn}
              >
                Opportunities
              </button>
            )}
            <button
              onClick={handleFollowCompany}
              type="button"
              disabled={followMutation.isPending}
              className={`${companystyles.follow_btn} ${
                isLight
                  ? isFollowing
                    ? "light-applied-btn"
                    : ""
                  : isFollowing
                    ? "apply-btn"
                    : ""
              }`}
            >
              {followMutation.isPending
                ? isFollowing
                  ? "Following..."
                  : "Unfollowing..."
                : isFollowing
                  ? "Unfollow"
                  : "Follow"}
            </button>
          </div>
        </div>
      </section>
      {companyDetails?.logo_url && (
        <ProfileImagePreview
          isOpen={isImagePreviewOpen}
          onClose={() => setIsImagePreviewOpen(false)}
          imageUrl={companyDetails?.logo_url}
          firstName={companyDetails?.name}
          lastName={""}
        />
      )}

      {/* Unfollow Modal */}
      {/* <LogOutModal
        isOpen={showUnfollowModal}
        onClose={cancelUnfollow}
        title="Unfollow Company?"
        onConfirm={confirmUnfollow}
        confirmText="Yes, Unfollow"
        cancelText="Cancel"
      >
        Are you sure you want to unfollow {companyDetails?.name}?
      </LogOutModal> */}

      {authGateModal}
      <ConfirmModal
        isOpen={showUnfollowModal}
        onClose={cancelUnfollow}
        title="Unfollow Company?"
        message={`Are you sure you want to unfollow ${companyDetails?.name}?`}
        onConfirm={confirmUnfollow}
        confirmText="Yes, Unfollow"
        cancelText="Cancel"
      />
    </>
  );
};

export default CompanyInfo;
