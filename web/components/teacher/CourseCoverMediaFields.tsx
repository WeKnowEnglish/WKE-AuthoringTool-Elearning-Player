"use client";

import { useState } from "react";
import { MediaUrlControls } from "@/components/teacher/media/MediaUrlControls";

type Props = {
  initialCoverImageUrl?: string;
  initialCoverVideoUrl?: string;
};

export function CourseCoverMediaFields({
  initialCoverImageUrl = "",
  initialCoverVideoUrl = "",
}: Props) {
  const [coverImage, setCoverImage] = useState(initialCoverImageUrl);
  const [coverVideo, setCoverVideo] = useState(initialCoverVideoUrl);

  return (
    <div className="space-y-6">
      <input type="hidden" name="cover_image_url" value={coverImage} />
      <input type="hidden" name="cover_video_url" value={coverVideo} />
      <MediaUrlControls
        label="Course cover image"
        value={coverImage}
        onChange={setCoverImage}
        mediaKind="image"
        compact
      />
      <MediaUrlControls
        label="Course cover video (optional)"
        value={coverVideo}
        onChange={setCoverVideo}
        mediaKind="video"
        compact
      />
    </div>
  );
}
