// components/profile/EducationCard.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "../../moduleCss/profile.module.css";
import Image from "next/image";
import {
  CustomModalForm,
  SelectOption,
  type FormField,
} from "../modals/CustomModalForm";
import { toast } from "react-toastify";
import { updateUserProfile } from "@/services/profile.services";
import courseData from "@/data/courses.json";
import DummyUniversity from "../../../public/images/DummyUniversity.png";
import { fetchInstitutions } from "@/services/options.services";
import { useQuery } from "@tanstack/react-query";
import {
  CAREER_STATUS_OPTIONS,
  isContextualStatus,
  isEducationStatus,
  getAllowedCourseIds,
  getCareerStatusId,
} from "@/helpers/careerStatus";
import { useTheme, themePreferenceToApi } from "@/context/ThemeContext";
import { useAuthGate } from "@/app/hooks/useAuthGate";
import { isUnauthenticatedError } from "@/lib/authError";

type Props = {
  university?: string;
  degree?: string;
  duration?: string; // format: "YYYY - YYYY"
  dob?: string;
  careerStatus?: string;
  currentSituation?: string;
  onEducationUpdated?: (updatedEdu: any) => void;
};

export default function EducationCard({
  university,
  degree,
  duration,
  onEducationUpdated,
  dob,
  careerStatus,
  currentSituation,
}: Props) {
  const [openModal, setOpenModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { preference } = useTheme();
  const { ensureAuthed, openGate, gateModal: authGateModal } = useAuthGate();

  // Extract birth year from dob (handles both DD-MM-YYYY and YYYY-MM-DD)
  const getBirthYear = (): number | null => {
    if (!dob) return null;
    const parts = dob.split("-");
    if (parts.length !== 3) return null;
    if (parts[0].length === 2) return parseInt(parts[2]); // DD-MM-YYYY
    if (parts[0].length === 4) return parseInt(parts[0]); // YYYY-MM-DD
    return null;
  };

  // Build year options: current year down to 50 years ago, and up to current+10
  const currentYear = new Date().getFullYear();
  const startYearOptions = useMemo(
    () =>
      Array.from({ length: currentYear - 1970 + 1 }, (_, i) => {
        const y = currentYear - i;
        return { value: String(y), label: String(y) };
      }),
    [currentYear],
  );

  const careerStatusOptions = useMemo(
    () =>
      CAREER_STATUS_OPTIONS.map((opt) => ({
        label: opt.name,
        value: opt.name,
      })),
    [],
  );

  const [formValues, setFormValues] = useState({
    university: "",
    degree: "",
    customCourseName: "",
    startYear: "",
    endYear: "",
    careerStatus: "",
    currentSituation: "",
  });

  const filteredCourseOptions = useMemo(() => {
    const allowed = getAllowedCourseIds(formValues.careerStatus);
    const list = allowed
      ? courseData.courses.filter((c: any) => allowed.has(c.id))
      : courseData.courses;
    return list.map((course) => ({ label: course.name, value: course.name }));
  }, [formValues.careerStatus]);

  const { data: institutionsData } = useQuery({
    queryKey: ["institutions"],
    queryFn: fetchInstitutions,
    staleTime: 1000 * 60 * 10,
  });

  const institutionOptions = useMemo(
    () =>
      institutionsData?.data?.institutions?.map((inst: any) => ({
        id: inst.id,
        name: inst.name,
      })) || [],
    [institutionsData],
  );

  // Sync props → local display state
  useEffect(() => {
    let start = "";
    let end = "";
    if (duration && duration.includes("-")) {
      const parts = duration.split("-").map((v) => v.trim());
      start = parts[0];
      end = parts[1];
    }

    // If the saved degree isn't a known course, treat it as a custom "Other" entry
    const savedDegree = degree || "";
    const isKnownCourse =
      !savedDegree ||
      courseData.courses.some(
        (c) => c.name.toLowerCase() === savedDegree.toLowerCase(),
      );

    setFormValues({
      university: university || "",
      degree: isKnownCourse ? savedDegree : "Other",
      customCourseName: isKnownCourse ? "" : savedDegree,
      startYear: start,
      endYear: end,
      careerStatus: careerStatus || "",
      currentSituation: currentSituation || "",
    });
  }, [university, degree, duration, careerStatus, currentSituation]);

  const modalFields: FormField[] = [
    {
      id: "careerStatus",
      name: "careerStatus",
      label: "Current Status",
      type: "autoComplete",
      required: true,
      placeholder: "Select your current status",
      value: formValues.careerStatus,
      options: careerStatusOptions,
      searchPlaceholder: "Search status...",
      allowUserTyping: false,
      // When the user switches branches (Education ↔ Contextual), clear the
      // dependent fields so stale values don't bleed into the new branch's
      // payload. Returning an override object merges into the new formData.
      onChange: (value: any, _next: any, prev: any) => {
        const prevValue = prev?.careerStatus ?? "";
        const prevBranch = isEducationStatus(prevValue)
          ? "A"
          : isContextualStatus(prevValue)
            ? "B"
            : null;
        const nextBranch = isEducationStatus(value)
          ? "A"
          : isContextualStatus(value)
            ? "B"
            : null;
        const branchSwitched =
          prevBranch && nextBranch && prevBranch !== nextBranch;

        // Keep parent formValues in sync so the conditional labels, course
        // filter, and year ranges below re-derive against the new status.
        // Defer the parent setState — onChange runs inside CustomModalForm's
        // setFormData updater, so updating another component synchronously
        // would violate React's "no setState during render" rule.
        queueMicrotask(() => {
          setFormValues((p) => ({
            ...p,
            careerStatus: value,
            ...(branchSwitched
              ? {
                  university: "",
                  degree: "",
                  customCourseName: "",
                  startYear: "",
                  endYear: "",
                  currentSituation: "",
                }
              : {}),
          }));
        });

        if (branchSwitched) {
          return {
            university: "",
            degree: "",
            customCourseName: "",
            startYear: "",
            endYear: "",
            currentSituation: "",
          };
        }
        return undefined;
      },
    },
    {
      id: "university",
      name: "university",
      label: isContextualStatus(formValues.careerStatus)
        ? "Which institution did you attend?"
        : "Select University",
      type: "autoComplete",
      required: true,
      placeholder: isContextualStatus(formValues.careerStatus)
        ? "Which institution did you attend?*"
        : "Select university",
      value: formValues.university,
      options: institutionOptions,
      searchPlaceholder: "Search universities...",
      allowUserTyping: false,
    },
    {
      id: "degree",
      name: "degree",
      label: isContextualStatus(formValues.careerStatus)
        ? "Highest qualification"
        : "Education",
      placeholder: isContextualStatus(formValues.careerStatus)
        ? "Highest qualification*"
        : "Select education",
      type: "autoComplete",
      searchPlaceholder: "Search education...",
      required: true,
      value: formValues.degree,
      allowUserTyping: false,
      options: filteredCourseOptions,
    },
    {
      id: "customCourseName",
      name: "customCourseName",
      label: "Course Name",
      type: "text",
      placeholder: "Specify your education*",
      required: true,
      value: formValues.customCourseName,
      showIf: (data) => data.degree === "Other",
    },
    // {
    //   id: "startYear",
    //   name: "startYear",
    //   label: "Start Year",
    //   type: "custom",
    //   className: "md:col-span-1",
    //   required: true,
    //   value: formValues.startYear,
    //   // field.value and field.onChange are injected by CustomModalForm's renderField
    //   // — they read/write CustomModalForm's own internal formData state directly.
    //   render: (field) => (
    //     <CustomSelectDropdown
    //       name="startYear"
    //       value={field.value ?? ""}
    //       onChange={(e) => field.onChange?.(e.target.value)}
    //       options={yearOptions}
    //       placeholder="Start Year*"
    //     />
    //   ),
    // },
    // {
    //   id: "endYear",
    //   name: "endYear",
    //   label: "End Year",
    //   type: "custom",
    //   className: "md:col-span-1",
    //   required: true,
    //   value: formValues.endYear,
    //   render: (field) => (
    //     <CustomSelectDropdown
    //       name="endYear"
    //       value={field.value ?? ""}
    //       onChange={(e) => field.onChange?.(e.target.value)}
    //       options={yearOptions}
    //       placeholder="End Year*"
    //     />
    //   ),
    // },

    {
      id: "startYear",
      name: "startYear",
      label: "Start Year",
      type: "autocomplete_without_search",
      className: "md:col-span-1",
      required: true,
      value: formValues.startYear,
      placeholder: "Start Year*",
      // Branch B (gap year / finished education): cap start year at birth year.
      // Branch A keeps the original 1970→current range.
      options: (formData) => {
        const status = formData.careerStatus || "";
        const isBranchB = isContextualStatus(status);
        const min = isBranchB ? getBirthYear() ?? 1970 : 1970;
        const count = currentYear - min + 1;
        if (count <= 0) return [];
        return Array.from({ length: count }, (_, i) => {
          const y = currentYear - i;
          return { label: String(y), value: String(y) };
        });
      },
    },
    {
      id: "endYear",
      name: "endYear",
      label: "End Year",
      type: "autocomplete_without_search",
      className: "md:col-span-1",
      required: true,
      value: formValues.endYear,
      placeholder: "End Year*",
      // Branch A: start+1 → start+9 (degree window).
      // Branch B: start+1 → currentYear+9 (can extend further).
      options: (formData) => {
        const status = formData.careerStatus || "";
        const isBranchB = isContextualStatus(status);
        const startYear = Number(formData.startYear);

        if (isBranchB) {
          const max = currentYear + 9;
          const startBase = startYear || (getBirthYear() ?? 1970);
          const min = startBase + 1;
          if (max < min) return [];
          return Array.from({ length: max - min + 1 }, (_, i) => {
            const y = max - i;
            return { label: String(y), value: String(y) };
          });
        }

        if (!startYear) return startYearOptions;
        const endLimit = startYear + 9;
        const options: SelectOption[] = [];
        for (let y = startYear + 1; y <= endLimit; y++) {
          options.push({ label: String(y), value: String(y) });
        }
        return options;
      },
    },
    {
      id: "currentSituation",
      name: "currentSituation",
      label: "My Journey",
      type: "textarea",
      placeholder: "Please tell us about your current situation*",
      required: true,
      value: formValues.currentSituation,
      minLength: 10,
      maxLength: 500,
      rows: 4,
      // Cap height + internal scroll so a long entry can't grow the textarea
      // past the modal and cover the Save/Cancel footer. field-sizing-fixed
      // overrides the base Textarea's `field-sizing-content` auto-grow; the !
      // on max-h is needed because field-sizing:content otherwise lets the
      // intrinsic content height beat the cap. break-words wraps pathological
      // unbroken strings (e.g. "Hiiiiii...").
      inputClassName:
        "!max-h-32 overflow-y-auto resize-none field-sizing-fixed break-words",
      showIf: (data) => isContextualStatus(data.careerStatus || ""),
    },
  ];

  const handleSubmit = async (data: Record<string, any>) => {
    ensureAuthed("update your profile", async () => {
    if (!data.careerStatus || !String(data.careerStatus).trim()) {
      toast.error("Please select your current status");
      return;
    }

    const branchA = isEducationStatus(data.careerStatus);
    const branchB = isContextualStatus(data.careerStatus);

    // Branch A required fields
    if (branchA) {
      const requiredFields = ["university", "degree", "startYear", "endYear"];
      for (const f of requiredFields) {
        if (!data[f] || String(data[f]).trim() === "") {
          const label = f
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (s) => s.toUpperCase());
          toast.error(`${label} is required`);
          return;
        }
      }
    } else if (branchB) {
      if (!data.university || String(data.university).trim() === "") {
        toast.error("Please select the institution you attended");
        return;
      }
      if (!data.degree || String(data.degree).trim() === "") {
        toast.error("Please select your highest qualification");
        return;
      }
      if (!data.startYear || String(data.startYear).trim() === "") {
        toast.error("Start year is required");
        return;
      }
      if (!data.endYear || String(data.endYear).trim() === "") {
        toast.error("End year is required");
        return;
      }
      const sit = String(data.currentSituation || "").trim();
      if (!sit) {
        toast.error("Please describe your current situation");
        return;
      }
      if (sit.length < 10) {
        toast.error("Current situation must be at least 10 characters");
        return;
      }
      if (sit.length > 500) {
        toast.error("Current situation must be 500 characters or fewer");
        return;
      }
    }

    // Degree must be from the list
    const isValidDegree = courseData.courses.some(
      (course) => course.name.toLowerCase() === data.degree.toLowerCase(),
    );
    if (!isValidDegree) {
      toast.error("Please select a valid degree from the list");
      return;
    }

    // If "Other" selected, the user-typed course name is required
    if (
      data.degree === "Other" &&
      (!data.customCourseName || String(data.customCourseName).trim() === "")
    ) {
      toast.error("Please enter your course name");
      return;
    }

    const finalDegree =
      data.degree === "Other"
        ? String(data.customCourseName).trim()
        : data.degree;

    // DOB-based year validation (only when years are present)
    const birthYear = getBirthYear();
    if (data.startYear && data.endYear) {
      if (birthYear) {
        if (parseInt(data.startYear) < birthYear) {
          toast.error(
            `Start year cannot be before your birth year (${birthYear})`,
          );
          return;
        }
        if (parseInt(data.endYear) < birthYear) {
          toast.error(
            `End year cannot be before your birth year (${birthYear})`,
          );
          return;
        }
      }
      if (parseInt(data.endYear) < parseInt(data.startYear)) {
        toast.error("End year cannot be earlier than start year!");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, any> = {
        // Backend expects the numeric id (as a string), not the label.
        career_status: getCareerStatusId(data.careerStatus),
        // Backend update-profile is full-replace; preserve theme so the
        // user's appearance choice doesn't silently revert to dark.
        theme_setting: themePreferenceToApi(preference),
      };

      if (branchA) {
        payload.place_of_study = data.university;
        payload.education = finalDegree;
        payload.start_year = `${data.startYear}`;
        payload.end_year = `${data.endYear}`;
      } else {
        // Branch B — all education fields are required, so always append.
        payload.place_of_study = String(data.university).trim();
        payload.education = String(finalDegree).trim();
        payload.start_year = `${data.startYear}`;
        payload.end_year = `${data.endYear}`;
        payload.current_situation = String(data.currentSituation).trim();
      }

      const res = await updateUserProfile(payload);
      toast.success(res.message || "Education updated successfully!");

      setFormValues({
        university: data.university || "",
        degree: data.degree,
        customCourseName:
          data.degree === "Other" ? String(data.customCourseName).trim() : "",
        startYear: data.startYear || "",
        endYear: data.endYear || "",
        careerStatus: data.careerStatus,
        currentSituation: branchB
          ? String(data.currentSituation).trim()
          : "",
      });

      onEducationUpdated?.({
        college: data.university || "",
        study_field: finalDegree,
        start_year: data.startYear || "",
        end_year: data.endYear || "",
        career_status: data.careerStatus,
        current_situation: branchB
          ? String(data.currentSituation).trim()
          : "",
      });

      setOpenModal(false);
    } catch (err: any) {
      if (isUnauthenticatedError(err)) openGate("update your profile");
      else toast.error(err.message || "Failed to update education details!");
    } finally {
      setIsSubmitting(false);
    }
    });
  };

  return (
    <div className={styles.educationCard}>
      {authGateModal}
      <div className="card_custom card_dark-bg">
        <div className={styles.profileInfo}>
          <div className={`${styles.nameWrapper}`}>
            <h2 className={styles.section_title}>
              Education
            </h2>

            <CustomModalForm
              maxHeight="80vh"
              open={openModal}
              onOpenChange={(open) => setOpenModal(open)}
              trigger={
                <button
                  type="button"
                  aria-label="Edit Education"
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
              }
              title="Edit Education "
              fields={modalFields}
              onSubmit={handleSubmit}
              submitLabel="Save"
              cancelLabel="Cancel"
              isSubmitting={isSubmitting}
              submitButtonClassName="bg-black cursor-pointer"
              cancelButtonClassName="bg-black cursor-pointer"
              contentClassName="backdrop-blur-xl border shadow-2xl !rounded-xl bg-white border-gray-200 text-gray-900 [&_*]:text-gray-900 dark:bg-gradient-to-br dark:from-blue-600/20 dark:via-blue-500/15 dark:to-blue-700/20 dark:border-white/20 dark:text-white dark:[&_*]:text-white"
            />
          </div>

          {isContextualStatus(formValues.careerStatus) ? (
            <div className={styles.education_wrapper}>
              <div
                className={styles.university_Image_area}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "#FFFFFF",
                  borderRadius: 12,
                  width: 60,
                  height: 60,
                }}
                aria-hidden="true"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M12 3 1 9l11 6 9-4.91V17h2V9L12 3z"
                    fill="#3B82F6"
                  />
                  <path
                    d="M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"
                    fill="#3B82F6"
                  />
                </svg>
              </div>
              <div className={styles.educationItem_inner}>
                {formValues.university && (
                  <div className={styles.educationItem}>
                    <p className={styles.university_name}>
                      {formValues.university}
                    </p>
                  </div>
                )}
                {formValues.degree && (
                  <div className={styles.educationItem}>
                    <p className={styles.degree}>
                      {formValues.degree?.toLowerCase() === "other" &&
                      formValues.customCourseName?.trim()
                        ? formValues.customCourseName
                        : formValues.degree}
                    </p>
                  </div>
                )}
                {formValues.startYear && formValues.endYear && (
                  <div className={styles.educationItem}>
                    <p className={styles.duration}>
                      {`${formValues.startYear} - ${formValues.endYear}`}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.education_wrapper}>
              <div className={styles.university_Image_area}>
                <Image
                  src={DummyUniversity}
                  alt="University"
                  width={60}
                  height={60}
                />
              </div>

              <div className={styles.educationItem_inner}>
                <div className={styles.educationItem}>
                  <p className={styles.university_name}>
                    {formValues.university}
                  </p>
                </div>
                <div className={styles.educationItem}>
                  <p className={styles.degree}>
                    {formValues.degree?.toLowerCase() === "other" &&
                    formValues.customCourseName?.trim()
                      ? formValues.customCourseName
                      : formValues.degree}
                  </p>
                </div>
                <div className={styles.educationItem}>
                  <p className={styles.duration}>
                    {formValues.startYear && formValues.endYear
                      ? `${formValues.startYear} - ${formValues.endYear}`
                      : ""}
                  </p>
                </div>
              </div>
            </div>
          )}

          {formValues.careerStatus && formValues.careerStatus.trim() && (
            <div className={styles.current_situation_wrapper}>
              <hr className={styles.current_situation_divider} />
              <p className={styles.location_text} style={{ marginBottom: "7px" }}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M0 0h24v24H0z" fill="none" />
                  <path
                    fill="currentColor"
                    fillRule="evenodd"
                    d="M10.561 2.25h2.879c.113 0 .201 0 .285.005a2.75 2.75 0 0 1 2.385 1.72c.032.077.06.16.095.268l.032.097l.03.085c.177.49.613.83 1.068.875l.1.006c1.677.099 2.966.378 3.924 1.335c.748.749 1.08 1.698 1.238 2.87c.153 1.14.153 2.595.153 4.433v.112c0 1.838 0 3.294-.153 4.433c-.158 1.172-.49 2.121-1.238 2.87c-.749.748-1.698 1.08-2.87 1.238c-1.14.153-2.595.153-4.433.153H9.944c-1.838 0-3.294 0-4.433-.153c-1.172-.158-2.121-.49-2.87-1.238c-.748-.749-1.08-1.698-1.238-2.87c-.153-1.14-.153-2.595-.153-4.433v-.112c0-1.838 0-3.294.153-4.433c.158-1.172.49-2.121 1.238-2.87c.958-.957 2.248-1.236 3.924-1.335l.1-.006c.455-.044.892-.385 1.07-.875l.028-.085l.032-.097c.036-.107.064-.191.095-.269a2.75 2.75 0 0 1 2.385-1.719c.084-.005.172-.005.286-.005m-3.92 4.554q.068-.002.133-.008C7.647 6.75 8.697 6.75 10 6.75h4c1.303 0 2.353 0 3.226.046q.066.006.132.008c1.604.095 2.398.356 2.94.898a2.3 2.3 0 0 1 .477.7c-1.827 1.186-3.028 1.95-4.038 2.456A.75.75 0 0 0 15.25 11v.458c-2.12.64-4.38.64-6.5 0V11a.75.75 0 0 0-1.487-.142c-1.01-.505-2.21-1.27-4.038-2.457a2.3 2.3 0 0 1 .477-.7c.542-.541 1.336-.802 2.94-.897m-3.78 3.149c-.11.996-.111 2.286-.111 4.047c0 1.907.002 3.262.14 4.29c.135 1.005.389 1.585.812 2.008s1.003.677 2.009.812c1.028.138 2.382.14 4.289.14h4c1.907 0 3.262-.002 4.29-.14c1.005-.135 1.585-.389 2.008-.812s.677-1.003.812-2.009c.138-1.027.14-2.382.14-4.289c0-1.76-.001-3.05-.11-4.047c-1.887 1.223-3.181 2.032-4.39 2.552V13a.75.75 0 0 1-1.5.016a12.75 12.75 0 0 1-6.5 0A.75.75 0 0 1 7.25 13v-.495c-1.208-.52-2.503-1.33-4.39-2.552m12.131-4.702l-.971-.001H9.009a3 3 0 0 0 .174-.428l.003-.008l.026-.077a4 4 0 0 1 .07-.203a1.25 1.25 0 0 1 1.084-.782c.032-.002.072-.002.215-.002h2.838c.143 0 .183 0 .215.002c.482.03.904.334 1.085.782c.012.03.024.067.07.203l.028.085m.039.113q.058.163.136.316z"
                    clipRule="evenodd"
                  />
                </svg>
                Current Status
              </p>
              <p className={styles.profile_info} style={{ marginTop: "0px" }}>
                {formValues.careerStatus}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
