import type { Metadata } from "next";

import { EasyReaderPlayer } from "@/components/easy-readers/EasyReaderPlayer";
import { bookTwo } from "@/content/easy-readers/book-2";

export const metadata: Metadata = {
  title: "Where Is Milo? — A1 Easy Reader",
  description: bookTwo.description,
  openGraph: {
    title: "Where Is Milo? — A1 Easy Reader",
    description: bookTwo.description,
    images: [
      {
        url: bookTwo.cover,
        width: 1086,
        height: 1448,
        alt: `Cover of ${bookTwo.title}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Where Is Milo? — A1 Easy Reader",
    description: bookTwo.description,
    images: [bookTwo.cover],
  },
};

export default function WhereIsMiloReaderPage() {
  return <EasyReaderPlayer book={bookTwo} />;
}
