"use client";

import { Button } from "@workspace/ui/components/shadcn/button";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import {
  useDeleteProductImage,
  useUploadProductImage,
} from "@/hooks/use-products";
import { getUploadUrl } from "@/lib/uploads";

interface ImageUploadProps {
  value: string | null;
  onChange: (key: string | null) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const upload = useUploadProductImage();
  const deleteImage = useDeleteProductImage();

  const handleFile = useCallback(
    async (file: File) => {
      const { key } = await upload.mutateAsync(file);
      onChange(key);
    },
    [upload, onChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // reset so the same file can be re-selected
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleRemove = async () => {
    if (value) {
      await deleteImage.mutateAsync(value);
      onChange(null);
    }
  };

  const isLoading = upload.isPending || deleteImage.isPending;

  return (
    <div className="space-y-2">
      {value ? (
        <div className="group relative overflow-hidden rounded-lg border">
          <img
            alt="Product"
            className="h-48 w-full object-cover"
            height={192}
            src={getUploadUrl(value)}
            width={384}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              disabled={isLoading}
              onClick={handleRemove}
              size="sm"
              type="button"
              variant="destructive"
            >
              {deleteImage.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          className={`flex h-48 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors ${
            dragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          } ${isLoading ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
          disabled={isLoading}
          onClick={() => inputRef.current?.click()}
          onDragLeave={() => setDragOver(false)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDrop={handleDrop}
          type="button"
        >
          {upload.isPending ? (
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          ) : (
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
          )}
          <span className="text-muted-foreground text-sm">
            {upload.isPending
              ? "Uploading..."
              : "Click or drag an image to upload"}
          </span>
          <span className="text-muted-foreground/60 text-xs">
            JPEG, PNG, WebP, GIF, SVG up to 5 MB
          </span>
        </button>
      )}
      <input
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={handleInputChange}
        ref={inputRef}
        type="file"
      />
      {upload.isError && (
        <p className="text-destructive text-sm">{upload.error.message}</p>
      )}
    </div>
  );
}
