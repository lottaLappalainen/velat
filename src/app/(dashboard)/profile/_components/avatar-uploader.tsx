"use client";

import { useRef, useState, type ChangeEvent } from "react";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { updateAvatar } from "../actions";

const MAX_DIMENSION = 512;

// Compress client-side, before upload, not after — Supabase's free tier caps
// total storage at 1 GB, and an uncompressed phone photo can be 5-10MB. See
// docs/tasks/login-profile-ui.md, "Identity — avatar + username."
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Compression failed"))),
      "image/webp",
      0.8
    );
  });
}

export function AvatarUploader({
  avatarUrl,
  username,
}: {
  avatarUrl: string | null;
  username: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(avatarUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setError(null);
    setIsUploading(true);

    try {
      const compressed = await compressImage(file);
      const formData = new FormData();
      formData.set("avatar", compressed, "avatar.webp");

      const result = await updateAvatar(formData);
      if (result.error) {
        setError(result.error);
      } else if (result.avatarUrl) {
        setPreview(result.avatarUrl);
      }
    } catch {
      setError("Couldn't process that image.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
        aria-label="Change profile photo"
      >
        <Avatar className="size-16">
          {preview && <AvatarImage src={preview} alt={username} />}
          <AvatarFallback className="text-lg">
            {username ? username[0]!.toUpperCase() : "?"}
          </AvatarFallback>
        </Avatar>
      </button>

      <div className="flex flex-col gap-1">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="self-start"
        >
          {isUploading ? "Uploading…" : "Change photo"}
        </Button>
        <FieldError className="text-xs">{error}</FieldError>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
