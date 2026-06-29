"use client";

import { useState, useEffect } from "react";
import styles from "../../moduleCss/profile.module.css";
import { CustomModalForm, type FormField } from "../modals/CustomModalForm";
import { updateUserProfile } from "@/services/profile.services";
import { toast } from "react-toastify";
import { fetchSkills } from "@/services/options.services";
import { useQuery } from "@tanstack/react-query";
import { Option } from "../commonUI/Multiselect";
import MultiSelectDropdown from "../commonUI/Multiselect";
import { useTheme, themePreferenceToApi } from "@/context/ThemeContext";
import Tooltip from "../commonUI/ToolTip";
import { Info } from "lucide-react";
import { useAuthGate } from "@/app/hooks/useAuthGate";
import { isUnauthenticatedError } from "@/lib/authError";

type Props = {
  skills: string[] | string;
  onSkillsUpdated?: (updatedSkills: string[]) => void;
};

/** A skill entry as returned by the /alloptions/skills API. */
interface SkillApiItem {
  name: string;
}

export default function SkillsCard({ skills, onSkillsUpdated }: Props) {
  const [openModal, setOpenModal] = useState<string | null>(null);
  const [localSkills, setLocalSkills] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { preference } = useTheme();
  const { ensureAuthed, openGate, gateModal: authGateModal } = useAuthGate();

  const [skillsError, setSkillsError] = useState("");

  const [selectedSkillOptions, setSelectedSkillOptions] = useState<Option[]>(
    [],
  );

  useEffect(() => {
    if (openModal === "skills") {
      setSkillsError("");
    }
  }, [openModal]);

  // useEffect(() => {
  //   const cleanedSkills = Array.isArray(skills)
  //     ? skills
  //     : (skills ?? "")
  //         .split(",")
  //         .map((s: string) => s.trim())
  //         .filter(Boolean);

  //   setLocalSkills(cleanedSkills);

  //   setSelectedSkillOptions(cleanedSkills.map((s) => ({ label: s, value: s })));
  // }, [skills]);

  useEffect(() => {
    const cleanedSkills = Array.isArray(skills)
      ? skills
      : (skills ?? "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);

    setLocalSkills(cleanedSkills);

    // Create proper Option objects from cleaned skills
    const skillOptionObjects = cleanedSkills.map((s) => ({
      value: s,
      label: s,
    }));

    setSelectedSkillOptions(skillOptionObjects);
  }, [skills]);

  // Sync selectedSkillOptions when modal opens
  // Sync selectedSkillOptions when modal opens
  useEffect(() => {
    if (openModal === "skills") {
      setSelectedSkillOptions(
        localSkills.map((s) => ({
          value: s,
          label: s,
        })),
      );
      setSkillsError(""); // Clear error when modal opens
    }
  }, [openModal, localSkills]);

  const { data: skillsData, isLoading: skillsLoading } = useQuery({
    queryKey: ["skills"],
    queryFn: fetchSkills,
    staleTime: 1000 * 60 * 10,
  });

  const skills_options = skillsData?.data;

  const allSkills = skills_options?.skills;

  const skillOptions: Option[] =
    allSkills?.map((skill: SkillApiItem) => ({
      value: skill.name,
      label: skill.name,
    })) || [];

  const handleSkillsChange = (items: Option[]) => {
    setSelectedSkillOptions(items);

    const count = items.length;

    // Clear error when user makes valid changes
    if (count > 0 && count <= 10) {
      setSkillsError("");
    }

    // Show error if more than 10 selected
    if (count > 10) {
      setSkillsError("Maximum 10 skills allowed");
    }
  };

  // Get skill count message with appropriate color
  // const getSkillCountMessage = () => {
  //   const count = selectedSkillOptions.length;

  //   if (count === 0) {
  //     return {
  //       message: "No skills selected",
  //       color: "text-gray-400",
  //     };
  //   }

  //   if (count > 5) {
  //     return {
  //       message: `${count} skills selected (Maximum 5 allowed)`,
  //       color: "text-red-500",
  //     };
  //   }

  //   // 1-5 skills = green
  //   return {
  //     message: `${count} skill${count === 1 ? "" : "s"} selected`,
  //     color: "text-green-500",
  //   };
  // };

  const getSkillCountMessage = () => {
    const count = selectedSkillOptions.length;

    // ❗ Hide count message if there's an error
    if (skillsError) {
      return null;
    }

    if (count === 0) {
      return {
        message: "No skills selected",
        color: "text-gray-400!",
      };
    }

    if (count > 10) {
      return {
        message: `${count} skills selected (Maximum 10 allowed)`,
        color: "text-red-500!",
      };
    }

    return {
      message: `${count} skill${count === 1 ? "" : "s"} selected`,
      color: "text-green-500",
    };
  };

  const skillCountInfo = getSkillCountMessage();

  const modalFields: FormField[] = [
    {
      id: "skills",
      name: "skills",
      label: "Top Skills",
      labelInfo: (
        <Tooltip
          position="top-right"
          className="custom-onboarding-tooltip !text-white [&_*]:!text-white"
          content={
            <div>
              <p className="text-sm">
                Add up to 10 of your strongest skills. Search to pick from the list, or type your own to add a custom skill. <br />
                We use this to recommend relevant jobs, events and employers.
              </p>
            </div>
          }
        >
          <button
            type="button"
            tabIndex={0}
            className="flex items-center text-gray-400 hover:text-white"
          >
            <Info size={16} />
          </button>
        </Tooltip>
      ),
      type: "custom",
      render: (field) => (
        // <MultiSelectDropdown
        //   options={skillOptions}
        //   selectedItems={selectedSkillOptions}
        //   maxSelections={5}
        //   placeholder="Additional skills*"
        //   onChange={(items) => {
        //     setSelectedSkillOptions(items);
        //   }}
        //   customAddon
        // />
        <div className="flex flex-col gap-1">
          <MultiSelectDropdown
            options={skillOptions}
            selectedItems={selectedSkillOptions}
            maxSelections={10}
            placeholder="Select your top skills*"
            // onChange={handleSkillsChange}
            onChange={(items) => {
              setSelectedSkillOptions(items);

              // 🔥 THIS LINE FIXES EVERYTHING
              field.onChange?.(items.map((i) => i.value).join(","));

              handleSkillsChange(items);
            }}
            customAddon
          />

          <div className="mt-2 flex items-center justify-between">
            {skillCountInfo && (
              <p
                className={`text-sm ${skillCountInfo.color} font-medium mb-0! ml-2!`}
              >
                {skillCountInfo.message}
              </p>
            )}

            {selectedSkillOptions.length > 0 &&
              selectedSkillOptions.length <= 10 && (
                <p className="text-xs text-gray-400!">
                  {10 - selectedSkillOptions.length} remaining
                </p>
              )}
          </div>
          {skillsError && (
            <p className="text-red-500! text-sm mb-0! ml-2!">{skillsError}</p>
          )}
        </div>
      ),
      className: "overflow-visible",
    },
  ];

  const handleSubmit = async () => {
    ensureAuthed("update your profile", async () => {
      const skillValues = selectedSkillOptions.map((i) => i.value);

      if (skillValues.length === 0) {
        toast.error("Please enter at least 1 skill");
        setSkillsError("Please enter at least 1 skill");
        return;
      }

      if (skillValues.length > 10) {
        toast.error("Maximum 10 skills allowed");
        setSkillsError("Maximum 10 skills allowed");
        return;
      }

      try {
        setIsSubmitting(true);

        const skillsString = skillValues.join(", ");

        const payload = {
          skills: skillsString,
          additional_skills: skillsString,
          // Backend update-profile is full-replace; preserve theme so the
          // user's appearance choice doesn't silently revert to dark.
          theme_setting: themePreferenceToApi(preference),
        };

        const res = await updateUserProfile(payload);

        // The migrated service throws on failure (incl. UNAUTHENTICATED) and
        // otherwise resolves to { success: true, message, data }. Guard on the
        // success flag rather than the old (never-set) `status === "failed"`.
        if (!res || res.success === false) {
          toast.error(res?.message || "Failed to update skills");
          return;
        }

        toast.success(res.message || "Skills updated successfully!");

        // sync UI with modal selection
        setLocalSkills(skillValues);

        onSkillsUpdated?.(skillValues);

        setOpenModal(null);
      } catch (error: any) {
        if (isUnauthenticatedError(error)) openGate("update your profile");
        else toast.error(error.message || "Update failed!");
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  return (
    <div className={styles.skillsCard}>
      <div className="card_custom card_dark-bg">
        <div className={styles.profileInfo}>
          <div className={styles.nameWrapper}>
            <h2 className={styles.section_title}>Top Skills</h2>

            <button
              type="button"
              aria-label="Edit Top Skills"
              onClick={() => setOpenModal("skills")}
              className={styles.editBtn}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width={20}
                height={20}
                viewBox="0 0 27 27"
                fill="none"
              >
                <path
                  d="M7.875 19.125V14.625L19.125 3.375L23.625 7.875L12.375 19.125H7.875Z"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M3.375 23.625H23.625"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M15.75 6.75L20.25 11.25"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Edit
            </button>
          </div>
        </div>

        <div className={styles.skills}>
          {localSkills && localSkills.length > 0 ? (
            localSkills.map((skill: string, index: number) => (
              <span key={`${skill}-${index}`} className={styles.skillPill}>
                {skill}
              </span>
            ))
          ) : (
            <p className="text-gray-400">No skills added yet</p>
          )}
        </div>
      </div>

      <CustomModalForm
        maxHeight="min(480px, 85vh)"
        open={openModal === "skills"}
        onOpenChange={(open) => setOpenModal(open ? "skills" : null)}
        trigger={<button type="button" style={{ display: "none" }} />}
        title="Edit Top Skills"
        description="Add your skills (max 10)"
        fields={modalFields}
        onSubmit={handleSubmit}
        submitLabel="Save"
        cancelLabel="Cancel"
        submitButtonClassName="bg-black cursor-pointer"
        cancelButtonClassName="bg-black cursor-pointer"
        isSubmitting={isSubmitting}
        scrollAreaClassName="not-scrollable"
        contentClassName="backdrop-blur-xl border shadow-xl !rounded-xl bg-white border-gray-200 text-gray-900 [&_*]:text-gray-900 dark:bg-gradient-to-br dark:from-blue-600/20 dark:via-blue-500/15 dark:to-blue-700/20 dark:border-white/20 dark:text-white dark:[&_*]:text-white"
      />
      {authGateModal}
    </div>
  );
}
