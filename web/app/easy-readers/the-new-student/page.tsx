import type { Metadata } from "next";
import { EasyReaderPlayer } from "@/components/easy-readers/EasyReaderPlayer";
import { bookOne } from "@/content/easy-readers/book-1";

export const metadata: Metadata = {
  title: "The New Student — A1 Easy Reader",
  description: bookOne.description,
  openGraph: {
    title: "The New Student — A1 Easy Reader",
    description: bookOne.description,
    images: [
      {
        url: bookOne.cover,
        width: 1086,
        height: 1448,
        alt: `Cover of ${bookOne.title}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "The New Student — A1 Easy Reader",
    description: bookOne.description,
    images: [bookOne.cover],
  },
};

export default function TheNewStudentReaderPage() {
  return <EasyReaderPlayer book={bookOne} />;
}
