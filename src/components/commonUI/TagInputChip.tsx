"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useRef } from "react";

interface SkillsInputProps {
  skills: string[];
  setSkills: (skills: string[]) => void;
  maxSkills?: number;
  placeholder?: string;
  className?: string;
}

export default function SkillsInput({
  skills,
  setSkills,
  maxSkills = 5,
  placeholder = "Add a skill...",
  className = "",
}: SkillsInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addSkill = () => {
    const value = inputRef.current?.value.trim() || "";
    if (!value) return;
    if (skills.includes(value)) return alert("Skill already added");

    if (skills.length >= maxSkills)
      return alert(`Max ${maxSkills} skills allowed`);

    setSkills([...skills, value]);
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((skill) => skill !== skillToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  const isMaxReached = skills.length >= maxSkills;

  return (
    <div className={cn("w-full", className)}>
      {/* <label className="block text-sm font-medium text-gray-200 mb-2">
        Skills ({skills.length}/{maxSkills})
      </label> */}

      <div className={cn(
        "flex flex-wrap items-center gap-2  tag-input-chip-wrapper",
        "border border-white text-gray-400 bg-transparent focus-within:ring-2 focus-within:ring-primary"
      )}>
        {skills.map((skill) => (
          <span
            key={skill}
            className="bg-[color-mix(in_oklab,lab(92_-0.01_-3.22)_20%,transparent)] text-white px-3 py-1 rounded-full text-sm flex items-center gap-1"
          >
            {skill}
            <X
              className="cursor-pointer"
              size={14}
              onClick={() => removeSkill(skill)}
            />
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          maxLength={20}
          placeholder={
            isMaxReached
                ? "Limit reached"
                : skills.length === 0
                ? placeholder
                : ""
          }
          onKeyPress={handleKeyPress}
          disabled={isMaxReached}
          className="flex-1 bg-transparent text-white outline-none placeholder:text-gray-500 disabled:opacity-50"
        />
      </div>
    </div>
  );
}
