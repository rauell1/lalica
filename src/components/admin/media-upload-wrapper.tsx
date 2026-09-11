"use client";

import { useRouter } from "next/navigation";
import { MediaUploadDialog } from "./media-library";

export function MediaUploadWrapper() {
  const router = useRouter();
  return (
    <MediaUploadDialog
      onDone={() => {
        router.push("/admin/media");
        router.refresh();
      }}
      onClose={() => router.push("/admin/media")}
    />
  );
}
