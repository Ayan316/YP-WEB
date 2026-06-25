"use client";

import { cn } from "@/lib/utils";
import { set } from "date-fns";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  KeyboardEvent,
} from "react";
import { toast } from "react-toastify";

type Option = {
  id: number | string;
  name: string;
  color?: string;
  icon?: React.ReactNode;
};

type AutocompleteProps = {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minChars?: number;
  limit?: number;
  customClassDropdown?: string;
  className?: string;
  dropdownClassName?: string;
  customAddon?: boolean;
  dropdownSearchPlaceholder?: string;
  showDropdownSearch?: boolean;
  allowTyping?: boolean;
};

export default function Autocomplete({
  options,
  value,
  onChange,
  placeholder = "Start typing...",
  minChars = 2,
  limit = 15,
  className = "",
  dropdownClassName = "",
  customClassDropdown = "",
  customAddon = false,
  allowTyping = false,
  dropdownSearchPlaceholder = "Search...",
  showDropdownSearch = true,
}: AutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [isTyping, setIsTyping] = useState(false);

  // 🔹 NEW: search inside dropdown
  const [dropdownSearch, setDropdownSearch] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* -----------------------------
     Sync external value
  ----------------------------- */
  useEffect(() => {
    setQuery(value);
  }, [value]);

  /* -----------------------------
     Reset dropdown search when closed
  ----------------------------- */
  useEffect(() => {
    if (!open) setDropdownSearch("");
  }, [open]);

  /* -----------------------------
     Outside click close
  ----------------------------- */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setHighlightIndex(-1);
        setIsTyping(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* -----------------------------
     Filter using dropdown search
  ----------------------------- */
  const filteredOptions = useMemo(() => {
    const search = dropdownSearch.toLowerCase();

    if (!search) return options.slice(0, limit);

    return options
      .filter((o) => o.name.toLowerCase().includes(search))
      .slice(0, limit);
  }, [dropdownSearch, options, limit]);

  /* -----------------------------
     Detect exact match for Add option
  ----------------------------- */
  const showAddOption =
    customAddon &&
    dropdownSearch.trim().length >= minChars &&
    !filteredOptions.some(
      (o) => o.name.toLowerCase() === dropdownSearch.toLowerCase(),
    );

  /* -----------------------------
     Keyboard navigation
  ----------------------------- */
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || filteredOptions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev < filteredOptions.length - 1 ? prev + 1 : 0,
      );
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) =>
        prev > 0 ? prev - 1 : filteredOptions.length - 1,
      );
    }

    if (e.key === "Enter") {
      if (highlightIndex >= 0) {
        selectOption(filteredOptions[highlightIndex].name);
      } else if (customAddon && showAddOption) {
        selectOption(dropdownSearch);
      }
    }

    if (e.key === "Escape") {
      setOpen(false);
      setHighlightIndex(-1);
      setIsTyping(false);
    }
  };

  /* -----------------------------
     Select option
  ----------------------------- */
  const selectOption = (name: string) => {
    // Block custom add if exceeds 50 characters
    if (customAddon && name.trim().length > 50) {
      toast.error("Custom option cannot exceed 50 characters");
      return;
    }

    // BLOCK FREE TEXT when customAddon is false (added 30th jan)
    if (!allowTyping) {
      const isValid = options.some(
        (o) => o.name.toLowerCase() === name.toLowerCase(),
      );

      if (!isValid) {
        setQuery(value);
      }
    }

    onChange(name);
    setQuery(name);
    setOpen(false);
    setHighlightIndex(-1);
    setIsTyping(false);
  };

  /* -----------------------------
     Clear input
  ----------------------------- */
  const clearValue = () => {
    setQuery("");
    onChange("");
    setOpen(false);
    setHighlightIndex(-1);
    setIsTyping(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="custom-dropdown-autocomplete relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          placeholder={placeholder}
          readOnly={!allowTyping}
          className={`w-full pl-6 pr-15 py-3 border-2 rounded-xl ${allowTyping ? "cursor-pointer" : ""} ${className}`}
          onChange={(e) => {
            if (!allowTyping) return;
            setQuery(e.target.value);
            onChange(e.target.value);
            setIsTyping(true);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setIsTyping(false);
          }}
          onClick={() => {
            // Reopen on click even if input is already focused (e.g. after
            // clearValue() steals focus back from the X button — without this,
            // the next click on an already-focused input fires no `focus`
            // event and the dropdown stays closed).
            setOpen(true);
            setIsTyping(false);
          }}
          onPaste={(e) => {
            // For readOnly inputs (allowTyping=false), the browser blocks
            // paste outright. Intercept it so users can paste into the
            // dropdown search instead — works as a filter for fixed lists,
            // and as a custom-add seed when customAddon is enabled.
            if (allowTyping) return;
            e.preventDefault();
            const text = e.clipboardData.getData("text");
            if (!text) return;
            setOpen(true);
            setDropdownSearch(text.slice(0, 50));
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />

        {/* Dropdown Arrow */}
        <button
          type="button"
          className="autocomplete-arrow-btn absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
          onClick={() => setOpen(!open)}
          tabIndex={-1}
        >
          {open ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        {/* Clear button */}
        {!open && query && (
          <button
            type="button"
            onClick={clearValue}
            className="autocomplete-arrow-btn absolute right-10 top-1/2 -translate-y-1/2 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ---------------- DROPDOWN ---------------- */}
      {open && (
        <ul
          className={cn("absolute z-50 mt-1 w-full bg-white border rounded-xl shadow-lg max-h-72 overflow-hidden dropdowm-select-bg", customClassDropdown)}
          // className={cn(
          //   "absolute z-50 mt-1 w-full bg-white border rounded-xl shadow-lg max-h-72 overflow-hidden dropdowm-select-bg",
          //   dropdownClassName,
          // )}
        >
          {/* SEARCH BAR INSIDE DROPDOWN */}
          {showDropdownSearch && (
            <div className="p-2 border-b">
              <input
                type="text"
                value={dropdownSearch}
                placeholder={dropdownSearchPlaceholder}
                className="w-full px-3 py-2 border rounded-lg text-sm multi-select-search-input outline-none"
                onChange={(e) => {
                  if (customAddon && e.target.value.length > 50) return;
                  setDropdownSearch(e.target.value);
                }}
              />

              {customAddon && dropdownSearch.length > 0 && (
                <p
                  className={`text-xs mt-1 text-right ${
                    dropdownSearch.length > 45
                      ? "text-red-400"
                      : "text-gray-400"
                  }`}
                >
                  {dropdownSearch.length}/50
                </p>
              )}
            </div>
          )}

          {/* <div className="max-h-22 overflow-y-auto"> */}
          <div className={cn("max-h-22 overflow-y-auto", dropdownClassName)}>
            {filteredOptions.map((option, index) => (
              <li
                key={option.id}
                onClick={() => selectOption(option.name)}
                className={`flex items-center gap-3 p-3 cursor-pointer transition
                ${
                  index === highlightIndex
                    ? "bg-[#20BDFF] text-white"
                    : "hover:bg-[#e0f2fe] dark:hover:bg-[#FFFFFF1A]"
                }
              `}
              >
                {option.icon && (
                  <span className="text-lg flex items-center">
                    {option.icon}
                  </span>
                )}

                {option.color && !option.icon && (
                  <span
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: option.color }}
                  />
                )}

                <span>{option.name}</span>
              </li>
            ))}

            {/* ADD NEW OPTION */}
            {showAddOption && (
              <li
                onClick={() => selectOption(dropdownSearch)}
                className="p-3 cursor-pointer text-indigo-600  font-medium"
              >
                Add "{dropdownSearch}"
              </li>
            )}

            {/* EMPTY STATE */}
            {filteredOptions.length === 0 && !showAddOption && (
              <li className="p-3 text-gray-500 dark:text-white text-center">No results found</li>
            )}
          </div>
        </ul>
      )}
    </div>
  );
}