"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

/* ---------- Types ---------- */
interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectDropdownProps {
  name: string;
  value: string;
  onChange: (e: { target: { name: string; value: string } }) => void;
  options: SelectOption[];
  placeholder?: string;
}

/* ---------- Component ---------- */
export default function CustomSelectDropdown({
  name,
  value,
  onChange,
  options,
  placeholder = "Select",
}: CustomSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] =
    useState<React.CSSProperties>({});

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  /* ---------- Close on outside click ---------- */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* ---------- Measure & position (AUTO) BEFORE paint ---------- */
  useLayoutEffect(() => {
    if (!isOpen || !buttonRef.current || !dropdownRef.current) return;

    const buttonRect = buttonRef.current.getBoundingClientRect();
    const dropdownRect = dropdownRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const margin = 8;

    const spaceBelow = viewportHeight - buttonRect.bottom;
    const spaceAbove = buttonRect.top;

    const top =
      spaceBelow >= dropdownRect.height || spaceBelow >= spaceAbove
        ? buttonRect.bottom + margin
        : Math.max(
            margin,
            buttonRect.top - dropdownRect.height - margin
          );

    setDropdownStyle({
      position: "absolute",
      top,
      left: buttonRect.left,
      width: buttonRect.width,
      zIndex: 9999,
    });
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
  };

  const handleSelect = (value: string) => {
    onChange({ target: { name, value } });
    setIsOpen(false);
  };

  const selectedLabel =
    options.find((o) => o.value === value)?.label || placeholder;

  /* ---------- Portal Dropdown ---------- */
  const dropdown =
    isOpen &&
    createPortal(
      <div
        ref={dropdownRef}
        style={dropdownStyle}
        className="dropdowm-select-bg absolute max-h-[280px] overflow-auto"
      >
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            className={`w-full text-left p-2.5 text-base text-white
              hover:bg-[#e0f2fe] dark:hover:bg-[#146d9c]
              ${
                value === option.value
                  ? "bg-[#e0f2fe] dark:bg-[#146d9c] text-white"
                  : "text-[#A0AEC0]"
              }

            `}
          >
            {option.label}
          </button>
        ))}
      </div>,
      document.body
    );

  /* ---------- Render ---------- */
  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        className="custom-select-btn group w-full flex items-center justify-between text-base"
      >
        <span className={value ? "text-white" : "text-[#A0AEC0]"} style={{lineHeight: "12px"}}>
          {selectedLabel}
        </span>
        <ChevronDown
          className={`w-5 h-5 transition-all duration-200 text-[#A0AEC0] group-hover:text-white ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {dropdown}
    </>
  );
}
