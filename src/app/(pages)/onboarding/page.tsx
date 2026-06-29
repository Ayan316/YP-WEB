"use client";
import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  ChevronRight,
  ChevronLeft,
  User,
  GraduationCap,
  Image,
  Upload,
} from "lucide-react";
import mainstyles from "../../../_assets/style/style.module.css";
import { useRouter } from "next/navigation";
import { fileToBase64 } from "@/helpers/fileToBase64";
import { toast } from "react-toastify";

import Cropper from "react-easy-crop";
import { getCroppedImage } from "@/helpers/getCroppedImage";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import AuthBackground from "@/components/authentication/AuthBackground";
import AuthCard from "@/components/authentication/AuthCard";
import CustomSelectDropdown from "../../../components/commonUI/Dropdown";
import { Calendar } from "@/components/ui/calendar";
import schoolsData from "@/data/schools.json";
import courseData from "@/data/courses.json";
import locationData from "@/data/locations.json";
import {
  CAREER_STATUS_OPTIONS,
  isEducationStatus,
  isContextualStatus,
  getCareerStatusId,
  getAllowedCourseIds,
} from "@/helpers/careerStatus";
import Autocomplete from "../../../components/commonUI/Autocomplete";
import PhoneInputWithIP from "../../../components/commonUI/PhoneInputWithIP";
import MultiSelectDropdown from "@/components/commonUI/Multiselect";
import { Option } from "@/components/commonUI/Multiselect";

import SkillsInput from "@/components/commonUI/TagInputChip";

import { useUserProfile } from "@/app/hooks/useUserProfile";

import { createProfile, checkPhoneAvailability } from "@/services/profile.services";
import { is } from "date-fns/locale";
// import { uploadProfileImage } from "@/services/profile.services";
import Tooltip from "@/components/commonUI/ToolTip";
import { Info } from "lucide-react";

import { fetchLocations } from "@/services/options.services";
import { fetchInstitutions } from "@/services/options.services";
import { fetchSkills } from "@/services/options.services";
import { useQuery } from "@tanstack/react-query";

import { MapPin } from "lucide-react";

type ValidationResult = {
  valid: boolean;
  message?: string;
};

export default function StepperForm() {
  const PASSWORD_RULES = [
    "You must be at least 14 years old to create a profile on Young Pro.",
  ];

  const { data: session } = useSession();

  console.log("Social Login Session:", session);

  const today = new Date();

  const maxDobDate = new Date(
    today.getFullYear() - 14,
    today.getMonth(),
    today.getDate(),
  );

  const [displayMonth, setDisplayMonth] = useState<Date>(maxDobDate);

  const [location, setLocation] = useState("");
  const [institution, setInstitution] = useState("");
  const [skills, setSkills] = useState("");

  const [skillsError, setSkillsError] = useState("");

  const router = useRouter();

  const { data: userProfile, isLoading: userProfileLoading } = useUserProfile();

  useEffect(() => {
    if (session === undefined || userProfileLoading) return;

    if (session === null) {
      router.replace("/auth");
      return;
    }

    const profileStatus =
      userProfile?.data?.profile_completion_status ??
      session?.user?.profile_completion_status;

    if (profileStatus === "1" || profileStatus === 1) {
      router.replace("/home");
    }
  }, [session, userProfileLoading, userProfile, router]);

  const { data: locationsData, isLoading: locationsLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: fetchLocations,
    staleTime: 1000 * 60 * 10,
  });

  const { data: institutionsData, isLoading: institutionsLoading } = useQuery({
    queryKey: ["institutions"],
    queryFn: fetchInstitutions,
    staleTime: 1000 * 60 * 10,
  });

  const { data: skillsData, isLoading: skillsLoading } = useQuery({
    queryKey: ["skills"],
    queryFn: fetchSkills,
    staleTime: 1000 * 60 * 10,
  });

  const locations = locationsData?.data;

  const allLocations = locations?.location;

  const institutions = institutionsData?.data;

  const allInstitutions = institutions?.institutions;

  const skills_options = skillsData?.data;

  const allSkills = skills_options?.skills;

  const locationOptions = useMemo(
    () =>
      allLocations?.map((loc: any) => ({
        id: loc.id,
        name: loc.name,
        icon: <MapPin size={16} className="text-[#20BDFF]" />,
      })) || [],
    [allLocations],
  );

  const institutionOptions = useMemo(
    () =>
      allInstitutions?.map((inst: any) => ({
        id: inst.id,
        name: inst.name,
        icon: <GraduationCap size={16} className="text-[#20BDFF]" />,
      })) || [],
    [allInstitutions],
  );

  const skillOptions: Option[] = useMemo(
    () =>
      allSkills?.map((skill: any) => ({
        value: skill.name,
        label: skill.name,
      })) || [],
    [allSkills],
  );

  const careerStatusOptions = useMemo(
    () =>
      CAREER_STATUS_OPTIONS.map((opt) => ({
        id: opt.id,
        name: opt.name,
      })),
    [],
  );

  console.log("All fetched locations: ", locations);
  console.log("All fetched all locations: ", allLocations);

  console.log("All fetched institutions: ", institutions);
  console.log("All fetched all institutions: ", allInstitutions);

  console.log("All fetched skills: ", skills_options);
  console.log("All fetched all skills: ", allSkills);


  const [isPhoneValid, setIsPhoneValid] = useState(true);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const onboardingRootRef = useRef<HTMLFormElement | null>(null);

  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarPosition, setCalendarPosition] = useState<"top" | "bottom">(
    "bottom",
  );
  const calendarRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();

  // const [selected, setSelected] = useState<Option[]>([]);

  const [selected, setSelected] = useState<string[]>([]);

  const options = [
    { value: "react", label: "React" },
    { value: "vue", label: "Vue" },
    { value: "angular", label: "Angular" },
    { value: "svelte", label: "Svelte" },
    { value: "nextjs", label: "Next.js" },
  ];

  // const skillOptions: Option[] = [
  //   { value: "react", label: "React" },
  //   { value: "vue", label: "Vue" },
  //   { value: "angular", label: "Angular" },
  //   { value: "svelte", label: "Svelte" },
  //   { value: "nextjs", label: "Next.js" },
  // ];

  const openCalendar = () => {
    if (!inputRef.current) return;

    const rect = inputRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;

    // approx calendar height ~320px
    if (spaceBelow < 320 && spaceAbove > spaceBelow) {
      setCalendarPosition("top");
    } else {
      setCalendarPosition("bottom");
    }

    setShowCalendar(true);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [cookieUser, setCookieUser] = useState<any>(null);

  const [skillInput, setSkillInput] = useState("");

  const [isSubmitted, setIsSubmitted] = useState(false);

  const [currentStep, setCurrentStep] = useState(0);
  const [havingSkills, setHavingSkills] = useState(false);

  // Browser autofill extensions (LastPass, password managers, etc.) inject
  // `fdprocessedid` attributes onto form inputs before React hydrates, which
  // causes a hydration mismatch. Gate the form on a post-mount flag so the
  // inputs only render on the client, after hydration.
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const genderOptions = [
    { value: "Male", label: "Male" },
    { value: "Female", label: "Female" },
    { value: "Other", label: "Other" },
    { value: "Prefer not to say", label: "Prefer not to say" },
  ];

  const validateStepData = (step: number, formData: any): ValidationResult => {
    /* ---------- STEP 0: ABOUT YOU ---------- */
    if (step === 0) {
      // if (!formData.firstName.trim())
      //   return { valid: false, message: 'First name is required' }

      // if (!formData.lastName.trim())
      //   return { valid: false, message: 'Last name is required' }
      if (!formData.firstName.trim())
        return { valid: false, message: "First name is required" };
      if (formData.firstName.trim().length < 2)
        return {
          valid: false,
          message: "First name must be at least 2 characters",
        };
      if (!/^[A-Za-z]+( [A-Za-z]+)*$/.test(formData.firstName.trim()))
        return {
          valid: false,
          message: "First name must contain only letters and spaces",
        };
      if (!formData.lastName.trim())
        return { valid: false, message: "Last name is required" };
      if (formData.lastName.trim().length < 2)
        return {
          valid: false,
          message: "Last name must be at least 2 characters",
        };
      if (!/^[A-Za-z]+( [A-Za-z]+)*$/.test(formData.lastName.trim()))
        return { valid: false, message: "Last name must contain only letters and spaces" };

      if (!formData.email.trim())
        return { valid: false, message: "Email is required" };

      // if (!formData.phone.trim())
      //   return { valid: false, message: "Phone number is required" };

      if (!formData.location.trim())
        return { valid: false, message: "Location is required" };

      if (!formData.dob)
        return { valid: false, message: "Date of birth is required" };

      if (!formData.gender)
        return { valid: false, message: "Gender is required" };

      if (formData.phone.trim() && !isPhoneValid) {
        return { valid: false, message: "Please enter a valid phone number" };
      }

      return { valid: true };
    }

    /* ---------- STEP 1: EDUCATION ---------- */
    if (step === 1) {
      if (!formData.careerStatus || !formData.careerStatus.trim())
        return { valid: false, message: "Please select your career status" };

      const branchA = isEducationStatus(formData.careerStatus);
      const branchB = isContextualStatus(formData.careerStatus);

      if (branchA) {
        if (!formData.institution.trim())
          return { valid: false, message: "Institution is required" };

        if (!formData.fieldOfStudy.trim())
          return { valid: false, message: "Field of study is required" };

        if (
          formData.fieldOfStudy === "Other" &&
          !formData.customFieldOfStudy.trim()
        )
          return { valid: false, message: "Please enter your course name" };

        if (!formData.startYear)
          return { valid: false, message: "Start year is required" };

        if (!formData.endYear)
          return { valid: false, message: "End year is required" };

        // DOB-based validation
        if (formData.dob) {
          const birthYear = new Date(formData.dob).getFullYear();

          if (Number(formData.startYear) < birthYear)
            return {
              valid: false,
              message: "Start year cannot be before your birth year",
            };

          if (Number(formData.endYear) < birthYear)
            return {
              valid: false,
              message: "End year cannot be before your birth year",
            };
        }

        if (Number(formData.endYear) <= Number(formData.startYear))
          return {
            valid: false,
            message: "End year must be greater than start year",
          };

        if (Number(formData.endYear) == Number(formData.startYear))
          return {
            valid: false,
            message: "End year and start year must be different",
          };
      } else if (branchB) {
        // Branch B — all education fields are now REQUIRED.
        if (!formData.institution.trim())
          return {
            valid: false,
            message: "Please select the institution you attended",
          };

        if (!formData.fieldOfStudy.trim())
          return {
            valid: false,
            message: "Please select your highest qualification",
          };

        if (!formData.startYear)
          return { valid: false, message: "Start year is required" };

        if (!formData.endYear)
          return { valid: false, message: "End year is required" };

        // DOB-based validation
        if (formData.dob) {
          const birthYear = new Date(formData.dob).getFullYear();
          if (Number(formData.startYear) < birthYear)
            return {
              valid: false,
              message: "Start year cannot be before your birth year",
            };
          if (Number(formData.endYear) < birthYear)
            return {
              valid: false,
              message: "End year cannot be before your birth year",
            };
        }

        if (Number(formData.endYear) <= Number(formData.startYear))
          return {
            valid: false,
            message: "End year must be greater than start year",
          };

        const situation = formData.currentSituation.trim();
        if (!situation)
          return {
            valid: false,
            message: "Please describe your current situation",
          };
        if (situation.length < 10)
          return {
            valid: false,
            message: "Current situation must be at least 10 characters",
          };
        if (situation.length > 500)
          return {
            valid: false,
            message: "Current situation must be 500 characters or fewer",
          };
      }

      if (formData.additionalSkills.length == 0)
        return { valid: false, message: "Add at least 5 skills" };

      return { valid: true };
    }

    /* ---------- STEP 2: PROFILE IMAGE ---------- */
    // if (step === 2) {
    //   if (!formData.profileImage)
    //     return {
    //       valid: false,
    //       message: "Please upload a profile image",
    //     };

    //   return { valid: true };
    // }

    return { valid: true };
  };

  const [formData, setFormData] = useState({
    // Step 1: About You
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    fullName: "",
    location: "",
    dob: "",
    gender: "",

    // Step 2 (Education)
    careerStatus: "",
    currentSituation: "",
    degree: "",
    institution: "",
    fieldOfStudy: "",
    customFieldOfStudy: "",
    startYear: "",
    endYear: "",
    grade: "",
    certificate: null as File | null,
    additionalSkills: [] as string[],

    // Step 3: Profile Image
    profileImage: null as File | null,
    imagePreview: null as string | null,
  });

  // Filter the course list to only the entries allowed for the currently
  // selected career status. See getAllowedCourseIds for the per-status map.
  const filteredCourseOptions = useMemo(() => {
    const allowed = getAllowedCourseIds(formData.careerStatus);
    if (!allowed) return courseData.courses;
    return courseData.courses.filter((c: any) => allowed.has(c.id));
  }, [formData.careerStatus]);

  const steps = [
    { id: 0, title: "About", icon: User },
    { id: 1, title: "Education", icon: GraduationCap },
    { id: 2, title: "Profile Photo", icon: Image },
  ];

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/get-user");
      const json = await res.json();
      if (json?.user) {
        console.log("User found:", json.user);
        setCookieUser(json.user);
      }
    })();
  }, []);

  // const [shouldRedirect, setShouldRedirect] = useState(false);

  // useEffect(() => {
  //   if (!shouldRedirect) return;

  //   const timer = setTimeout(() => {
  //     router.replace("/home");
  //   }, 3000);

  //   return () => clearTimeout(timer);
  // }, [shouldRedirect, router]);

  // const { data: userProfile, isLoading: userProfileLoading } = useUserProfile();

  // console.log("User profile:", userProfile?.data);



  const currentYear = new Date().getFullYear();

  const startYearOptions = useMemo(
    () =>
      Array.from({ length: currentYear - 1970 + 1 }, (_, i) => {
        const y = currentYear - i;
        return { value: String(y), label: String(y) };
      }),
    [currentYear],
  );

  const endYearOptions = useMemo(
    () =>
      formData.startYear
        ? Array.from({ length: 9 }, (_, i) => {
            const year = String(Number(formData.startYear) + i + 1);
            return { value: year, label: year };
          })
        : startYearOptions,
    [formData.startYear, startYearOptions],
  );

  // Branch B (Taking a gap year / Finished education) year ranges:
  //  - Start Year: from birth year (derived from dob) up to current year
  //  - End Year:   from (start year + 1, or birth year + 1) up to current year + 9
  const branchBBirthYear = useMemo(() => {
    if (!formData.dob) return null;
    const y = new Date(formData.dob).getFullYear();
    return Number.isFinite(y) ? y : null;
  }, [formData.dob]);

  const branchBStartYearOptions = useMemo(() => {
    const min = branchBBirthYear ?? 1970;
    const count = currentYear - min + 1;
    if (count <= 0) return [];
    return Array.from({ length: count }, (_, i) => {
      const y = currentYear - i;
      return { value: String(y), label: String(y) };
    });
  }, [branchBBirthYear, currentYear]);

  const branchBEndYearOptions = useMemo(() => {
    const max = currentYear + 9;
    const startBase = formData.startYear
      ? Number(formData.startYear)
      : branchBBirthYear ?? 1970;
    const min = startBase + 1;
    if (max < min) return [];
    return Array.from({ length: max - min + 1 }, (_, i) => {
      const y = max - i;
      return { value: String(y), label: String(y) };
    });
  }, [formData.startYear, branchBBirthYear, currentYear]);

  // const handleInputChange = (e: any) => {
  //   const { name, value } = e.target

  //   // Real-time validation for End Year
  //   if (name === 'endYear') {
  //     if (formData.startYear && Number(value) <= Number(formData.startYear)) {
  //       toast.error('End year cannot be grater than start year')

  //       // Clear end year field if invalid
  //       setFormData(prev => ({
  //         ...prev,
  //         endYear: ''
  //       }))

  //       return // Stop normal update
  //     }
  //   }

  //   // Normal update
  //   setFormData(prev => ({ ...prev, [name]: value }))
  // }

  const handleInputChange = (e: any) => {
    const { name, value } = e.target;

    const birthYear = formData.dob
      ? new Date(formData.dob).getFullYear()
      : null;

    // Real-time validation for Start Year
    if (name === "startYear") {
      // Check against birth year
      if (birthYear && Number(value) < birthYear) {
        toast.error("Start year cannot be before your birth year");
        setFormData((prev) => ({ ...prev, startYear: "" }));
        return;
      }

      // Clear end year only if the new start year invalidates it. Upper
      // bound is branch-specific so it matches what the corresponding
      // end-year dropdown actually offers:
      //  - Branch A (school/university): start+1 … start+9
      //  - Branch B (gap year / finished education): start+1 … currentYear+9
      if (formData.endYear) {
        const newStart = Number(value);
        const currentEnd = Number(formData.endYear);
        const isBranchA = isEducationStatus(formData.careerStatus);
        const upperBound = isBranchA ? newStart + 9 : currentYear + 9;
        if (currentEnd <= newStart || currentEnd > upperBound) {
          setFormData((prev) => ({ ...prev, startYear: value, endYear: "" }));
          return;
        }
      }
    }

    // Real-time validation for End Year
    if (name === "endYear") {
      // Check against birth year
      if (birthYear && Number(value) < birthYear) {
        toast.error("End year cannot be before your birth year");
        setFormData((prev) => ({ ...prev, endYear: "" }));
        return;
      }
      if (formData.startYear && Number(value) <= Number(formData.startYear)) {
        toast.error("End year must be greater than start year");

        // Clear end year field if invalid
        setFormData((prev) => ({
          ...prev,
          endYear: "",
        }));

        return; // Stop normal update
      }
    }

    // Normal update
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleChangeGender = (e: {
    target: { name: string; value: string };
  }) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageUpload = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setCropSrc(reader.result as string);
      setShowCropper(true);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = (_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  };

  const applyCrop = async () => {
    if (!cropSrc || !croppedAreaPixels) return;

    const croppedBlob = await getCroppedImage(cropSrc, croppedAreaPixels);
    const croppedFile = new File([croppedBlob], "profile.jpg", {
      type: "image/jpeg",
    });

    setFormData((prev) => ({
      ...prev,
      profileImage: croppedFile,
      imagePreview: URL.createObjectURL(croppedFile),
    }));

    setShowCropper(false);
  };

  const handleNext = async () => {
    const result = validateStepData(currentStep, formData);

    if (!result.valid) {
      toast.error(result.message);
      return;
    }

    // About → Education: if a phone is filled, always verify availability.
    if (currentStep === 0) {
      const phone = formData.phone?.trim() || "";

      if (phone && isPhoneValid) {
        try {
          setIsCheckingPhone(true);
          const response = await checkPhoneAvailability(phone);
          if (response?.data?.available !== true) {
            toast.error(
              response?.message || "Phone number is already in use",
            );
            return;
          }
        } catch (err: any) {
          toast.error(err?.message || "Failed to verify phone number");
          return;
        } finally {
          setIsCheckingPhone(false);
        }
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };


  const handleSaveAndContinue = () => {
    console.log("Saved data:", formData);

    // console.log("Selected skills:", selected.map((s) => s.label).join(", "));

    console.log("Selected skills:", selected.join(", "));

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    console.log("Selected skills", selected);
    try {
      setIsSubmitted(true);
      // setCurrentStep(steps.length - 1);

      // let profileImageBase64 = ''

      // if (formData.profileImage) {
      //   profileImageBase64 = await fileToBase64(formData.profileImage)
      // }

      // const payload = {
      //   first_name: formData.firstName,
      //   last_name: formData.lastName,

      //   email: formData.email,
      //   ...(formData.phone && { phone_number: formData.phone }),
      //   // phone_number: formData.phone,
      //   location: formData.location,

      //   dob: formData.dob
      //     ? formData.dob.split('-').reverse().join('-') // Convert YYYY-MM-DD → DD-MM-YYYY
      //     : '',

      //   gender: formData.gender,

      //   place_of_study: formData.institution,
      //   education: formData.degree,
      //   degree: formData.fieldOfStudy, // added because backend expects degree separately
      //   start_year: formData.startYear ? `01-01-${formData.startYear}` : '',
      //   end_year: formData.endYear ? `01-01-${formData.endYear}` : '',

      //   profile_image: profileImageBase64 || '',

      //   additional_skills: formData.additionalSkills.join(', '),
      //   skills: formData.additionalSkills.join(', '),

      //   cgpa: '8.1' // optional (if exists)
      // }

      const form = new FormData();

      form.append("first_name", formData.firstName);
      form.append("last_name", formData.lastName);
      form.append("email", formData.email);

      if (formData.phone) {
        form.append("phone_number", formData.phone);
      }

      form.append("location", formData.location);

      if (formData.dob) {
        form.append("dob", formData.dob.split("-").reverse().join("-"));
      }

      form.append("gender", formData.gender);

      // Career status is always required — backend expects the numeric id
      // (as a string), not the human-readable label.
      form.append("career_status", getCareerStatusId(formData.careerStatus));

      const educationValue =
        formData.fieldOfStudy === "Other"
          ? formData.customFieldOfStudy.trim()
          : formData.fieldOfStudy;

      const branchA = isEducationStatus(formData.careerStatus);

      if (branchA) {
        // Branch A — formal education. Send full education set.
        form.append("place_of_study", formData.institution);
        form.append("education", educationValue);
        form.append("degree", educationValue);

        if (formData.startYear) {
          form.append("start_year", `${formData.startYear}`);
        }
        if (formData.endYear) {
          form.append("end_year", `${formData.endYear}`);
        }
      } else {
        // Branch B — contextual. All education fields are now required, so
        // we always append place_of_study/education/start_year/end_year along
        // with the mandatory current_situation.
        form.append("place_of_study", formData.institution.trim());
        form.append("education", educationValue.trim());
        form.append("degree", educationValue.trim());
        form.append("start_year", `${formData.startYear}`);
        form.append("end_year", `${formData.endYear}`);
        form.append(
          "current_situation",
          formData.currentSituation.trim(),
        );
      }

      form.append("skills", formData.additionalSkills.join(", "));
      // form.append("additional_skills", formData.additionalSkills.join(", "));

      if (formData.profileImage) {
        form.append("profile_image", formData.profileImage);
      }

      console.log("Profile data:", form);

      await createProfile(form);
      toast.success("Profile created successfully!");

      window.location.replace("/api/profile-complete");

      // Force session refresh before redirecting
      // setTimeout(async () => {
      //   window.location.replace("/home");
      // }, 1500);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Something went wrong while submitting.");
      setIsSubmitted(false);
    }
  };

  const addSkill = () => {
    const skill = skillInput.trim();
    if (!skill) return;

    // prevent duplicates
    if (formData.additionalSkills.includes(skill)) return;

    setFormData((prev) => ({
      ...prev,
      additionalSkills: [...prev.additionalSkills, skill],
    }));

    setSkillInput("");
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      additionalSkills: prev.additionalSkills.filter(
        (skill) => skill !== skillToRemove,
      ),
    }));
  };

  const selectedSkillOptions: Option[] = skillOptions.filter((opt) =>
    formData.additionalSkills.includes(opt.value),
  );

  const validateStep = (step: number) => {
    if (step === 0) {
      return (
        formData.firstName.trim() &&
        formData.lastName.trim() &&
        formData.email.trim() &&
        // formData.phone.trim() &&
        // isPhoneValid &&
        formData.location.trim() &&
        formData.dob &&
        formData.gender &&
        (formData.phone.trim() ? isPhoneValid : true)
      );
    }

    if (step === 1) {
      if (!formData.careerStatus.trim()) return false;
      if (formData.additionalSkills.length === 0) return false;

      if (isEducationStatus(formData.careerStatus)) {
        return Boolean(
          formData.institution.trim() &&
            formData.fieldOfStudy.trim() &&
            (formData.fieldOfStudy !== "Other" ||
              formData.customFieldOfStudy.trim()) &&
            formData.startYear &&
            formData.endYear,
        );
      }

      // Branch B — all education fields are required.
      const situation = formData.currentSituation.trim();
      return Boolean(
        formData.institution.trim() &&
          formData.fieldOfStudy.trim() &&
          formData.startYear &&
          formData.endYear &&
          situation.length >= 10 &&
          situation.length <= 500,
      );
    }

    if (step === 2) {
      return true;
    }

    return false;
  };

  const handleChangeImageClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setCropSrc(null);
    setCroppedAreaPixels(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);

    // reset file input so same image can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isStepValid = validateStep(currentStep);

  // Bulletproof Enter-to-advance: listen at the form node so we still catch
  // Enter even if a child input (e.g. PhoneInput, Autocomplete) stops the
  // native submit from firing.
  useEffect(() => {
    const node = onboardingRootRef.current;
    if (!node) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "TEXTAREA" || tag === "BUTTON") return;
      if (target?.isContentEditable) return;
      // Don't hijack Enter when an autocomplete / select dropdown is open —
      // the user is selecting an option, not submitting.
      if (document.querySelector('[data-state="open"]')) return;
      if (!isStepValid) return;
      e.preventDefault();
      if (currentStep === 0) {
        if (isCheckingPhone) return;
        handleNext();
      } else if (currentStep < steps.length - 1) {
        handleSaveAndContinue();
      } else {
        handleSubmit();
      }
    };

    node.addEventListener("keydown", handler);
    return () => node.removeEventListener("keydown", handler);
  }, [currentStep, isStepValid, isCheckingPhone]);

  const progressPercentage = isSubmitted
    ? 100
    : (currentStep / steps.length) * 100;

  const roundedProgress = Math.round(progressPercentage);

  const resolveUserData = () => {
    const sessionUser: any = session?.user;
    const cookie = cookieUser;

    console.log("Session user:", sessionUser);
    console.log("Cookie user:", cookie);

    return {
      fullName: sessionUser?.name || cookie?.full_name || "",

      email: sessionUser?.email || cookie?.email || "",

      phone: cookie?.phone_number || "",
    };
  };

  useEffect(() => {
    const { fullName, email, phone } = resolveUserData();

    if (fullName) {
      const [firstName = "", ...rest] = fullName.trim().split(" ");
      const lastName = rest.join(" ");

      setFormData((prev) => ({
        ...prev,
        firstName,
        lastName,
      }));
    }

    if (email) {
      setFormData((prev) => ({
        ...prev,
        email,
      }));
    }

    if (phone) {
      setFormData((prev) => ({
        ...prev,
        phone,
      }));
    }
  }, [session, cookieUser]);

  useEffect(() => {
    if (formData.additionalSkills.length >= 10) {
      setSkillsError("You can only add up to 10 skills");
    } else {
      setSkillsError("");
    }
  }, [formData.additionalSkills]);

  // const isNameLocked = !!(session?.user?.name || cookieUser?.full_name);
  const isNameLocked = false;
  const isEmailLocked = !!(session?.user?.email || cookieUser?.email);
  const isPhoneLocked = !!cookieUser?.phone_number;

  return (
    <AuthBackground>
      <AuthCard>
        <form
          ref={onboardingRootRef}
          className="form-onbording"
          onSubmit={(e) => {
            e.preventDefault();
            if (!isStepValid) return;
            if (currentStep === 0) {
              if (isCheckingPhone) return;
              handleNext();
            } else if (currentStep < steps.length - 1) {
              handleSaveAndContinue();
            } else {
              handleSubmit();
            }
          }}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            const target = e.target as HTMLElement;
            const tag = target.tagName;
            // Allow Enter inside textarea / contenteditable / buttons
            if (tag === "TEXTAREA" || tag === "BUTTON") return;
            if ((target as HTMLElement).isContentEditable) return;
            e.preventDefault();
            if (!isStepValid) return;
            if (currentStep === 0) {
              if (isCheckingPhone) return;
              handleNext();
            } else if (currentStep < steps.length - 1) {
              handleSaveAndContinue();
            } else {
              handleSubmit();
            }
          }}
        >
          <div className="form-title-area  ">
            <h1 className="form-title">
              <span className="title-large">YOUNG</span>
              <span className="title-small">PRO</span>
            </h1>
          </div>

          {/* Step Headers */}
          <div className="social-login-wrapper my-6">
            {steps.map((step, index) => {
              const StepIcon = step.icon;

              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div
                  key={step.id}
                  className={`social-media-btn btn-borderd-normal transition-all duration-300
                          ${
                            isActive
                              ? "bg-[#FFFFFF2B] text-white"
                              : isCompleted
                                ? "bg-[#FFFFFF1A] text-white"
                                : "bg-transparent text-[#A0AEC0]"
                          }
                        `}
                >
                  <span className="relative z-10">{step.title}</span>
                </div>
              );
            })}
          </div>

          {/* Progress Bar with Fire Icon */}
          <div className="relative">
            <div className="w-full progress-bar-track rounded-full h-2">
              <div
                className="bar-bg-progress h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            {/* Fire icon at progress position */}
            <div
              className="absolute transition-all duration-300"
              style={{
                left: `${progressPercentage}%`,
                top: "0%",
                transform: "translate(-50%, -50%)",
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34" fill="none">
                <path d="M17 20.1481V14.4814H18.8889L23.9259 21.4074L21.4074 26.4444L17 27.7037L13.2222 23.9259L17 20.1481Z" fill="#20BDFF"/>
                <g filter="url(#filter0_d_1268_170)">
                  <path d="M25.0183 15.8667C24.6925 15.4417 24.2958 15.0733 23.9275 14.705C22.9783 13.855 21.9017 13.2458 20.995 12.3533C18.8842 10.285 18.4167 6.87083 19.7625 4.25C18.4167 4.57583 17.2408 5.3125 16.235 6.12C12.5658 9.06667 11.1208 14.2658 12.8492 18.7283C12.9058 18.87 12.9625 19.0117 12.9625 19.1958C12.9625 19.5075 12.75 19.7908 12.4667 19.9042C12.1408 20.0458 11.8008 19.9608 11.5317 19.7342C11.4513 19.6668 11.384 19.5852 11.3333 19.4933C9.73251 17.4675 9.47751 14.5633 10.5542 12.24C8.18834 14.1667 6.89918 17.425 7.08334 20.4992C7.16834 21.2075 7.25334 21.9158 7.49418 22.6242C7.69251 23.4742 8.07501 24.3242 8.50001 25.075C10.03 27.5258 12.6792 29.2825 15.5267 29.6367C18.5583 30.0192 21.8025 29.4667 24.1258 27.37C26.7183 25.0183 27.625 21.25 26.2933 18.02L26.1092 17.6517C25.8117 17 25.0183 15.8667 25.0183 15.8667ZM20.5417 24.7917C20.145 25.1317 19.4933 25.5 18.9833 25.6417C17.3967 26.2083 15.81 25.415 14.875 24.48C16.5608 24.0833 17.5667 22.8367 17.8642 21.5758C18.105 20.4425 17.6517 19.5075 17.4675 18.4167C17.2975 17.3683 17.3258 16.4758 17.7083 15.4983C17.9775 16.0367 18.2608 16.575 18.6008 17C19.6917 18.4167 21.4058 19.04 21.7742 20.9667C21.8308 21.165 21.8592 21.3633 21.8592 21.5758C21.9017 22.7375 21.3917 24.0125 20.5417 24.7917Z" fill="#5433FF"/>
                </g>
                <defs>
                  <filter id="filter0_d_1268_170" x="7.06598" y="4.25" width="21.837" height="27.4995" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                    <feOffset dx="1" dy="1"/>
                    <feGaussianBlur stdDeviation="0.5"/>
                    <feComposite in2="hardAlpha" operator="out"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"/>
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1268_170"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1268_170" result="shape"/>
                  </filter>
                </defs>
              </svg>
            </div>
            <div className="text-right mt-2.5">
              <p className="text-normal text-right text-[#A0AEC0]">
                {roundedProgress}% completed
              </p>
            </div>
          </div>

          {/* Form Content */}
          {isMounted && currentStep === 0 && (
            <div className="">
              <h4 className="form-subtitle mt-2.5">About You</h4>
              <p className="text-center form-details-text">
                Make a Young Pro profile for your job hunt
              </p>
              <div className="lg:space-y-[15px] space-y-2.5 form-area mt-4">
                <div className="grid grid-cols-2 gap-2.5 mb-px">
                  <div className="form-input-custom">
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      readOnly={isNameLocked}
                      className="w-full pl-6 pr-4 py-3 border-2 rounded-xl"
                      placeholder="First Name*"
                    />
                  </div>

                  <div className="form-input-custom">
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      readOnly={isNameLocked}
                      onChange={handleInputChange}
                      className="w-full pl-6 pr-4 py-3 border-2 rounded-xl"
                      placeholder="Last Name*"
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="form-input-custom">
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    readOnly={isEmailLocked}
                    className="w-full pl-6 pr-4 py-3 border-2 rounded-xl"
                    placeholder="Email*"
                  />
                </div>

                {/* Phone Number */}
                <div className="form-input-custom">
                  <PhoneInputWithIP
                    value={formData.phone}
                    disabled={isPhoneLocked}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, phone: value }))
                    }
                    onValidationChange={(valid) => {
                      // If phone is locked (from backend), always treat as valid
                      if (isPhoneLocked) {
                        setIsPhoneValid(true);
                        return;
                      }

                      setIsPhoneValid(valid);
                    }}
                  />
                </div>

                {/* Location */}
                <div className="form-input-custom onboarding-location-dropdown-area">
                  <Autocomplete
                    // options={locationData.locations}
                    // options={allLocations}
                    options={locationOptions}
                    value={formData.location}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, location: value }))
                    }
                    placeholder="Location*"
                    dropdownClassName=" overflow-y-auto custom-onboarding-dropdown"
                    dropdownSearchPlaceholder="Search Locations..."
                    customAddon
                    allowTyping={false}
                  />
                </div>

                {/* DOB & Gender */}
                <div className="grid grid-cols-2 gap-2.5 mb-0">
                  <div className="relative form-input-custom">
                    {/* Input */}
                    <input
                      ref={inputRef}
                      type="text"
                      readOnly
                      value={
                        selectedDate
                          ? selectedDate
                              .toLocaleDateString("en-GB")
                              .replaceAll("/", "-")
                          : ""
                      }
                      placeholder="DOB*"
                      onClick={openCalendar}
                      className="w-full pl-6 pr-8 py-3 border-2 rounded-xl cursor-pointer"
                    />

                    {/* Calendar */}
                    {showCalendar && (
                      <div
                        ref={calendarRef}
                        className={`absolute z-50 dropdowm-select-bg text-white overflow-hidden
                              ${
                                calendarPosition === "top"
                                  ? "bottom-full mb-2"
                                  : "top-full mt-2"
                              }
                            `}
                      >
                        {/* <Calendar
                          mode="single"
                          selected={selectedDate}
                          className="rounded-lg border bg-black/50 backdrop-blur-lg border-white/20 text-white"
                          captionLayout="dropdown"
                          onSelect={(date) => {
                            setSelectedDate(date);
                            setFormData((prev) => ({
                              ...prev,
                              dob: date ? date.toISOString().split("T")[0] : "",
                            }));
                            setShowCalendar(false);
                          }}
                          disabled={(date) => date > new Date()}
                        /> */}

                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          captionLayout="dropdown"
                          defaultMonth={maxDobDate}
                          startMonth={new Date(1970, 0)}
                          endMonth={maxDobDate}
                          className="rounded-lg border bg-black/50 backdrop-blur-lg border-white/20 text-white"
                          // onSelect={(date) => {
                          //   if (!date) return;
                          //   setSelectedDate(date);
                          //   setFormData((prev) => ({
                          //     ...prev,
                          //     dob: date.toISOString().split("T")[0],
                          //   }));
                          //   setShowCalendar(false);
                          // }}
                          onSelect={(date) => {
                            if (!date) return;
                            setSelectedDate(date);
                            const localDate = `${date.getFullYear()}-${String(
                              date.getMonth() + 1,
                            ).padStart(2, "0")}-${String(
                              date.getDate(),
                            ).padStart(2, "0")}`;
                            setFormData((prev) => ({
                              ...prev,
                              dob: localDate,
                            }));
                            setShowCalendar(false);
                          }}
                          /** Unified month/year handler */
                          onMonthChange={(viewMonth) => {
                            setSelectedDate((prev) => {
                              if (!prev) return prev; // No date selected yet, do nothing

                              const prevYear = prev.getFullYear();
                              const prevMonth = prev.getMonth();
                              const viewYear = viewMonth.getFullYear();
                              const viewMonthIndex = viewMonth.getMonth();

                              // Preserve day number; if invalid day (31 in Feb), fallback gracefully
                              const day = Math.min(prev.getDate(), 28);

                              if (prevMonth !== viewMonthIndex) {
                                // Month changed — preserve year & day
                                return new Date(prevYear, viewMonthIndex, day);
                              }

                              if (prevYear !== viewYear) {
                                // Year changed — preserve month & day
                                return new Date(viewYear, prevMonth, day);
                              }

                              return prev;
                            });
                          }}
                          disabled={(date) => date > maxDobDate}
                        />
                      </div>
                    )}

                    <Tooltip
                      position="top-right"
                      className="custom-onboarding-tooltip"
                      content={
                        <div>
                          <p className="font-semibold mb-1">Age Requirement:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {PASSWORD_RULES.map((rule) => (
                              <li key={rule}>{rule}</li>
                            ))}
                          </ul>
                        </div>
                      }
                    >
                      <button
                        type="button"
                        tabIndex={0}
                        className="absolute right-3 top-[-5px] -translate-y-1/2 text-gray-400 hover:text-white"
                      >
                        <Info size={20} />
                      </button>
                    </Tooltip>
                  </div>

                  <div className="form-input-custom">
                    <CustomSelectDropdown
                      name="gender"
                      value={formData.gender}
                      onChange={handleChangeGender}
                      options={genderOptions}
                      placeholder="Gender*"
                      
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="">
              <h2 className="form-subtitle mt-2.5">
                {isContextualStatus(formData.careerStatus)
                  ? "Education"
                  : "Education"}
              </h2>
              <p className="text-center form-details-text">
                {isContextualStatus(formData.careerStatus)
                  ? "Mention your education background"
                  : "Mention your education background"}
              </p>

              {/* Degree / Course */}
              <div className="lg:space-y-[15px] space-y-2.5 form-area mt-3">
                {/* Career Status (always first) */}
                <div className="form-input-custom">
                  <Autocomplete
                    options={careerStatusOptions}
                    value={formData.careerStatus}
                    onChange={(value) =>
                      setFormData((prev) => {
                        // When the user switches branches (Education ↔
                        // Contextual), clear all the dynamic fields that
                        // depend on the previous branch so stale values
                        // don't leak into the new payload.
                        const prevBranch = isEducationStatus(prev.careerStatus)
                          ? "A"
                          : isContextualStatus(prev.careerStatus)
                            ? "B"
                            : null;
                        const nextBranch = isEducationStatus(value)
                          ? "A"
                          : isContextualStatus(value)
                            ? "B"
                            : null;
                        if (prevBranch && nextBranch && prevBranch !== nextBranch) {
                          return {
                            ...prev,
                            careerStatus: value,
                            institution: "",
                            fieldOfStudy: "",
                            customFieldOfStudy: "",
                            startYear: "",
                            endYear: "",
                            currentSituation: "",
                          };
                        }
                        return { ...prev, careerStatus: value };
                      })
                    }
                    placeholder="Current Status*"
                    dropdownClassName="max-h-[250px]"
                    dropdownSearchPlaceholder="Search Status..."
                    allowTyping={false}
                  />
                </div>

                {isEducationStatus(formData.careerStatus) && (
                  <>
                    {/* Institution / College */}
                    <div className="form-input-custom">
                      <Autocomplete
                        limit={100000}
                        dropdownClassName="max-h-[250px]"
                        options={institutionOptions}
                        value={formData.institution}
                        onChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            institution: value,
                          }))
                        }
                        placeholder="Place of Study*"
                        allowTyping={false}
                        dropdownSearchPlaceholder="Search Institutions..."
                      />
                    </div>

                    {/* Field of Study */}
                    <div className="form-input-custom">
                      <Autocomplete
                        options={filteredCourseOptions}
                        dropdownClassName="max-h-[250px]"
                        value={formData.fieldOfStudy}
                        onChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            fieldOfStudy: value,
                            customFieldOfStudy:
                              value === "Other" ? prev.customFieldOfStudy : "",
                          }))
                        }
                        placeholder="Education*"
                        allowTyping={false}
                        dropdownSearchPlaceholder="Search Educations..."
                      />
                    </div>

                    {/* Custom Course Name (visible only when "Other" selected) */}
                    {formData.fieldOfStudy === "Other" && (
                      <div className="form-input-custom">
                        <input
                          type="text"
                          name="customFieldOfStudy"
                          value={formData.customFieldOfStudy}
                          onChange={handleInputChange}
                          className="w-full pl-6 pr-4 py-3 border-2 rounded-xl"
                          placeholder="Specify your education*"
                        />
                      </div>
                    )}

                    {/* Start Year & End Year */}
                    <div className="grid grid-cols-2 gap-2.5 mb-0">
                      <div className="form-input-custom">
                        <CustomSelectDropdown
                          name="startYear"
                          value={formData.startYear}
                          onChange={handleInputChange}
                          options={startYearOptions}
                          placeholder="Start Year*"
                        />
                      </div>
                      <div className="form-input-custom">
                        <CustomSelectDropdown
                          name="endYear"
                          value={formData.endYear}
                          onChange={handleInputChange}
                          options={endYearOptions}
                          placeholder="End Year*"
                        />
                      </div>
                    </div>
                  </>
                )}

                {isContextualStatus(formData.careerStatus) && (
                  <>
                    {/* Institution attended (required) */}
                    <div className="form-input-custom">
                      <Autocomplete
                        limit={100000}
                        dropdownClassName="max-h-[250px]"
                        options={institutionOptions}
                        value={formData.institution}
                        onChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            institution: value,
                          }))
                        }
                        placeholder="Which institution did you attend?*"
                        allowTyping={false}
                        dropdownSearchPlaceholder="Search Institutions..."
                      />
                    </div>

                    {/* Highest qualification (required, maps to education) */}
                    <div className="form-input-custom">
                      <Autocomplete
                        options={filteredCourseOptions}
                        dropdownClassName="max-h-[250px]"
                        value={formData.fieldOfStudy}
                        onChange={(value) =>
                          setFormData((prev) => ({
                            ...prev,
                            fieldOfStudy: value,
                            customFieldOfStudy:
                              value === "Other" ? prev.customFieldOfStudy : "",
                          }))
                        }
                        placeholder="Highest qualification*"
                        allowTyping={false}
                        dropdownSearchPlaceholder="Search Qualifications..."
                      />
                    </div>

                    {/* Start/End Year (required) */}
                    <div className="grid grid-cols-2 gap-2.5 mb-0">
                      <div className="form-input-custom">
                        <CustomSelectDropdown
                          name="startYear"
                          value={formData.startYear}
                          onChange={handleInputChange}
                          options={branchBStartYearOptions}
                          placeholder="Start Year*"
                        />
                      </div>
                      <div className="form-input-custom">
                        <CustomSelectDropdown
                          name="endYear"
                          value={formData.endYear}
                          onChange={handleInputChange}
                          options={branchBEndYearOptions}
                          placeholder="End Year*"
                        />
                      </div>
                    </div>

                  </>
                )}

                {/* Additional Skills — only after a Current Status is chosen */}
                {formData.careerStatus && (
                <div className="form-input-custom">
                  {/* <MultiSelectDropdown
                    options={skillOptions}
                    selectedItems={selectedSkillOptions}
                    maxSelections={5}
                    placeholder="Additional skills*"
                    onChange={(items) =>
                      setFormData((prev) => ({
                        ...prev,
                        additionalSkills: items.map((i) => i.value),
                      }))
                    }
                    searchPlaceholder="Search Skills..."
                    customAddon
                  /> */}

                  <div className="relative">
                    <MultiSelectDropdown
                      options={skillOptions}
                      selectedItems={formData.additionalSkills.map((skill) => ({
                        value: skill,
                        label: skill,
                      }))}
                      maxSelections={10}
                      placeholder="Select your top skills*"
                      onChange={(items) => {
                        console.log("Skills changed:", items); // Debug log
                        setFormData((prev) => ({
                          ...prev,
                          additionalSkills: items.map((i) => i.value),
                        }));
                      }}
                      searchPlaceholder="Search top skills..."
                      customAddon
                    />

                    {/* Info icon — sits in the right gutter, outside the box,
                        vertically centered to the field at any height (it grows
                        as skill chips wrap). Field width/alignment is unchanged. */}
                    <div className="absolute top-1/2 -translate-y-1/2 left-full ml-3 z-10">
                      <Tooltip
                        position="top-right"
                        className="custom-onboarding-tooltip "
                        content={
                          <div>
                            <p className="font-semibold mb-1">
                               Add up to 10 of your strongest skills. Search to pick from the list, or type your own to add a custom skill. <br />
                We use this to recommend relevant jobs, events and employers.
                            </p>
                           
                          </div>
                        }
                      >
                        <button
                          type="button"
                          tabIndex={0}
                          className="flex items-center text-gray-400 hover:text-white shrink-0 info-button cursor-pointer"
                        >
                          <Info size={16} />
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Error Message Display */}
                  {skillsError && (
                    <p className="text-red-500 text-sm mt-2">{skillsError}</p>
                  )}

                  {/* Success Message - Skills Count */}
                  {formData.additionalSkills.length > 0 && !skillsError && (
                    <p className="text-green-500 text-sm mt-2">
                      {formData.additionalSkills.length} skill(s) selected
                    </p>
                  )}
                </div>
                )}

                {/* Current situation textarea (required, contextual branch only) */}
                {isContextualStatus(formData.careerStatus) && (
                  <div className="form-input-custom">
                    <textarea
                      name="currentSituation"
                      value={formData.currentSituation}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          currentSituation: e.target.value,
                        }))
                      }
                      minLength={10}
                      maxLength={500}
                      rows={4}
                      className="w-full pl-6 pr-4 py-3 resize-none"
                      placeholder="Please tell us about your current situation*"
                    />
                    <p className="text-xs text-[#A0AEC0] mt-1 text-right">
                      {formData.currentSituation.trim().length}/500
                    </p>
                  </div>
                )}

                {/* Skills Input */}
                {/* <div className="form-input-custom">
                  <SkillsInput
                    skills={formData.additionalSkills}
                    setSkills={(skills) =>
                      setFormData((prev) => ({
                        ...prev,
                        additionalSkills: skills,
                      }))
                    }
                    maxSkills={5}
                    placeholder="Additional skills*"
                    className="bg-transparent text-white"
                  />
                </div> */}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="mt-6">
              <h2 className="form-subtitle mt-2.5">Profile Photo</h2>
              <p className="text-center form-details-text">
                Add a profile photo (optional)
              </p>
              <div className="custom-input-box-field">
                <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  {formData.imagePreview ? (
                    <img
                      src={formData.imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover absolute inset-0"
                    />
                  ) : (
                    <Upload className="w-16 h-16 text-gray-400" />
                  )}
                  <button
                    type="button"
                    onClick={handleChangeImageClick}
                    className={`px-4 py-2 text-sm bg-black/60 text-white rounded-lg hover:bg-black/80 transition ${formData.imagePreview ? "absolute bottom-3 left-1/2 -translate-x-1/2" : ""}`}
                  >
                    {formData.imagePreview ? "Change Photo" : "Upload Here"}
                  </button>
                </label>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}

          <div className="flex justify-between items-center form-area gap-2.5">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="btn-gradient w-full cursor-pointer mt-5 flex items-center justify-center"
              >
                <ChevronLeft className="w-5 h-5 mr-1" />
                Back
              </button>
            )}

            {/* RIGHT SIDE BUTTONS */}
            <div className="w-full">
              {/* Step 0 → Only Next */}
              {isMounted && currentStep === 0 && (
                <button
                  type="submit"
                  disabled={!isStepValid || isCheckingPhone}
                  className={`btn-gradient w-full mt-5 flex items-center justify-center
                    transition-all duration-300
                    ${
                      !isStepValid || isCheckingPhone
                        ? "opacity-50 cursor-not-allowed"
                        : "opacity-100 cursor-pointer"
                    }
                  `}
                >
                  {isCheckingPhone ? "Checking…" : "Next"}
                </button>
              )}

              {/* Step 1 & 2 → Skip + Save & Continue */}
              {currentStep > 0 && currentStep < steps.length && (
                <>
                  {currentStep < steps.length - 1 ? (
                    <button
                      type="submit"
                      disabled={!isStepValid}
                      className={`btn-gradient w-full cursor-pointer mt-5 flex items-center justify-center
                        transition-all duration-300
                        ${
                          !isStepValid
                            ? "opacity-50 cursor-not-allowed"
                            : "opacity-100 cursor-pointer"
                        }
                        `}
                    >
                      Save & Continue
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!isStepValid}
                      className={`btn-gradient w-full cursor-pointer mt-5 flex items-center justify-center
                        transition-all duration-300
                        ${
                          !isStepValid
                            ? "opacity-50 cursor-not-allowed"
                            : "opacity-100 cursor-pointer"
                        }
                      `}
                    >
                      Save & Continue
                      {/* <Check className="w-5 h-5 ml-1" /> */}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {showCropper && (
            <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
              <div className="crop-modal rounded-xl w-[90%] max-w-md p-4">
                <div className="relative w-full h-64 bg-black">
                  <Cropper
                    image={cropSrc!}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    cropShape="round"
                    onCropChange={setCrop}
                    onZoomChange={setZoom}
                    onCropComplete={onCropComplete}
                  />
                </div>

                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full mt-4"
                />

                <div className="flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={handleCropCancel}
                    className="apply-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={applyCrop}
                    className={`${mainstyles.jobDetails_job_item_btns} btn-gradient px-2 py-1 crop-btn`}
                  >
                    Crop & Save
                  </button>
                  
                </div>
              </div>
            </div>
          )}
        </form>
      </AuthCard>
    </AuthBackground>
  );
}
