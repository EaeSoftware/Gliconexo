"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";

type FilePickerButtonProps = {
  label: string;
  capture?: "environment" | "user";
  variant?: "primary" | "outline" | "secondary" | "ghost";
  className?: string;
  onSelect: (file: File) => void;
};

export function FilePickerButton({
  label,
  capture,
  variant = "outline",
  className,
  onSelect,
}: FilePickerButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture={capture}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onSelect(file);
          event.target.value = "";
        }}
      />
      <Button
        type="button"
        variant={variant}
        className={className}
        onClick={() => inputRef.current?.click()}
      >
        {label}
      </Button>
    </>
  );
}
