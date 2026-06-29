"use client";

import Image from "next/image";
import styles from "../../moduleCss/profile.module.css";
import Cropper from "react-easy-crop";
import { useRef, useState, useEffect } from "react";
import { getCroppedImage } from "@/helpers/getCroppedImage";
import { uploadProfileImage } from "@/services/profile.services";
import { toast } from "react-toastify";
import QRCode from "react-qr-code";
import { useQueryClient } from "@tanstack/react-query";
import Avatar from "../commonUI/Avatar";
import QRLogoYP from "@/../public/images/qrYPLogo.png";
import { Trash2 } from "lucide-react";
import ToolTip from "../commonUI/ToolTip";
import { Tooltip } from "@mui/material";
import ProfileImagePreview from "../commonUI/ProfileImagePreview";
import ConfirmModal from "../commonUI/ConfirmModal";
import mainstyles from "../../_assets/style/style.module.css";
import { useAuthGate } from "@/app/hooks/useAuthGate";
import { isUnauthenticatedError } from "@/lib/authError";

type Props = {
  imageSrc: string;
  firstName?: string;
  lastName?: string;
  userId?: string;
  onImageUpdated?: (newImageUrl: string) => void;
};

export default function ProfileImageCard({
  imageSrc,
  onImageUpdated,
  firstName,
  lastName,
  userId,
}: Props) {
  const queryClient = useQueryClient();
  const { ensureAuthed, openGate, gateModal: authGateModal } = useAuthGate();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [loading, setLoading] = useState(false);

  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);

  // Remove photo confirmation state
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [removeLoading, setRemoveLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (typeof imageSrc === "string" && imageSrc.startsWith("blob:")) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [imageSrc]);

  const handleImageUpload = (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const ALLOWED_TYPES = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only JPG, PNG, WebP, and GIF images are allowed");
      e.target.value = "";
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error("Image size must be less than 5 MB");
      e.target.value = "";
      return;
    }

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

    setLoading(true);

    try {
      const croppedBlob: Blob = await getCroppedImage(
        cropSrc,
        croppedAreaPixels,
      );

      const file = new File([croppedBlob], "profile.jpg", {
        type: croppedBlob.type,
      });

      const formData = new FormData();
      formData.append("profile_image", file);

      try {
        await uploadProfileImage(formData);
        toast.success("Profile image updated!");

        const previewUrl = URL.createObjectURL(file);
        onImageUpdated?.(previewUrl);

        queryClient.invalidateQueries({ queryKey: ["user-profile"] });
      } catch (error: any) {
        if (isUnauthenticatedError(error)) {
          openGate("change your profile photo");
        } else {
          toast.error(error?.message || "Upload failed!");
        }
      } finally {
        setLoading(false);
        setShowCropper(false);
      }
    } catch (err) {
      toast.error("Cropping failed");
      console.error(err);
      setLoading(false);
    }
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setCropSrc(null);
    setCroppedAreaPixels(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Remove photo: send FormData with only the key, no value
  const handleRemovePhoto = async () => {
    setRemoveLoading(true);

    try {
      const formData = new FormData();
      formData.append("profile_image", "");

      await uploadProfileImage(formData);

      toast.success("Profile photo removed!");
      onImageUpdated?.("");
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    } catch (error: any) {
      if (isUnauthenticatedError(error)) {
        openGate("change your profile photo");
      } else {
        toast.error(error?.message || "Failed to remove photo!");
      }
    } finally {
      setRemoveLoading(false);
      setShowRemoveConfirm(false);
    }
  };

  return (
    <div className={styles.profileImageCard}>
      <div className={styles.imageseditedsection}>
        {/* Image card — click avatar to preview, only when an image exists */}
        <div className={`${styles.imageCard} group relative`}>
          <Avatar
            imageUrl={imageSrc || null}
            firstName={firstName}
            lastName={lastName}
            size={130}
            className="w-full h-full"
            onClick={() => setIsImagePreviewOpen(true)}
          />

          {/* Trash button — only visible on hover when image exists */}
          {imageSrc && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                ensureAuthed("change your profile photo", () =>
                  setShowRemoveConfirm(true),
                );
              }}
              aria-label="Remove profile photo"
              className="absolute bottom-1 right-1 flex items-center justify-center w-7 h-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{
                background: "rgba(220, 38, 38, 0.85)",
                backdropFilter: "blur(4px)",
                border: "1.5px solid rgba(255,255,255,0.25)",
                cursor: "pointer",
                zIndex: 10,
              }}
            >
              <Trash2 size={13} color="#fff" />
            </button>
          )}
        </div>

        <label className={styles.floatingEdit}>
          <button
            type="button"
            className={styles.profile_imageedit_button}
            onClick={() =>
              ensureAuthed("change your profile photo", () =>
                fileInputRef.current?.click(),
              )
            }
          >
            <span className={styles.profile_imageedit_icon}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 27 27"
                fill="none"
              >
                <path
                  d="M6.75 22.5C6.13125 22.5 5.60175 22.2799 5.1615 21.8396C4.72125 21.3994 4.50075 20.8695 4.5 20.25V18C4.5 17.6812 4.608 17.4142 4.824 17.199C5.04 16.9837 5.307 16.8757 5.625 16.875C5.943 16.8742 6.21037 16.9822 6.42712 17.199C6.64387 17.4157 6.7515 17.6827 6.75 18V20.25H20.25V18C20.25 17.6812 20.358 17.4142 20.574 17.199C20.79 16.9837 21.057 16.8757 21.375 16.875C21.693 16.8742 21.9604 16.9822 22.1771 17.199C22.3939 17.4157 22.5015 17.6827 22.5 18V20.25C22.5 20.8687 22.2799 21.3986 21.8396 21.8396C21.3994 22.2806 20.8695 22.5007 20.25 22.5H6.75ZM12.375 8.83123L10.2656 10.9406C10.0406 11.1656 9.77362 11.2736 9.46463 11.2646C9.15563 11.2556 8.88825 11.1382 8.6625 10.9125C8.45625 10.6875 8.34825 10.425 8.3385 10.125C8.32875 9.82498 8.43675 9.56248 8.6625 9.33748L12.7125 5.28748C12.825 5.17498 12.9469 5.09548 13.0781 5.04898C13.2094 5.00248 13.35 4.97886 13.5 4.97811C13.65 4.97736 13.7906 5.00098 13.9219 5.04898C14.0531 5.09698 14.175 5.17648 14.2875 5.28748L18.3375 9.33748C18.5625 9.56248 18.6705 9.82498 18.6615 10.125C18.6525 10.425 18.5445 10.6875 18.3375 10.9125C18.1125 11.1375 17.8455 11.2549 17.5365 11.2646C17.2275 11.2744 16.9601 11.1664 16.7344 10.9406L14.625 8.83123V16.875C14.625 17.1937 14.517 17.4611 14.301 17.6771C14.085 17.8931 13.818 18.0007 13.5 18C13.182 17.9992 12.915 17.8912 12.699 17.676C12.483 17.4607 12.375 17.1937 12.375 16.875V8.83123Z"
                  fill="currentColor"
                />
              </svg>
            </span>
            Upload new photo
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <p className="">
            At least 800X800 px recommended, <br /> JPG or PNG allowed
          </p>
        </label>
      </div>

      {/* ── Profile Image Preview Modal ─────────────────────────────────────── */}
      <ProfileImagePreview
        isOpen={isImagePreviewOpen}
        onClose={() => setIsImagePreviewOpen(false)}
        imageUrl={imageSrc || null}
        firstName={firstName}
        lastName={lastName}
      />

      {/* Crop Modal */}
      {showCropper && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
          <div className="crop-modal rounded-xl w-[90%] max-w-md p-4">
            <div className="relative w-full h-64 border-crop">
              <Cropper
                image={cropSrc!}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
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
                onClick={handleCropCancel}
                className="apply-btn"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={applyCrop}
                className={`${mainstyles.jobDetails_job_item_btns} btn-gradient px-2 py-1 crop-btn`}
                disabled={loading}
              >
                {loading ? "Saving..." : "Crop & Upload"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Photo Confirmation Modal */}
      <ConfirmModal
        isOpen={showRemoveConfirm}
        onClose={() => setShowRemoveConfirm(false)}
        onConfirm={handleRemovePhoto}
        title="Remove Profile Photo?"
        message="Your profile photo will be permanently removed. You can always upload a new one later."
        confirmText="Yes, Remove"
        cancelText="Cancel"
        isLoading={removeLoading}
        loadingText="Removing..."
      />

      {authGateModal}

      {/* {userId && (
        <div className={styles.qrWrapper}>
          <div
            style={{
              position: "relative",
              display: "inline-block",
              padding: "8px",
              background: "#ffffff",
              borderRadius: "12px",
            }}
          >
            <QRCode
              value={`ypapp://connect/${userId}`}
              size={120}
              level="M"
              bgColor="#ffffff"
              fgColor="#000000"
            />
            <img
              src={QRLogoYP.src}
              alt="YP Logo"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "30px",
                height: "30px",
                borderRadius: "100%",
                background: "#ffffff",
                padding: "2px",
              }}
            />
          </div>
        </div>
      )} */}
    </div>
  );
}
