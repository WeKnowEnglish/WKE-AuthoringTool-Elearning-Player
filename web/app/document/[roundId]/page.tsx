import { DocumentSessionView } from "@/components/document-activity";

export const metadata = {
  title: "Document",
  robots: { index: false, follow: false },
};

export default function StudentDocumentRoundPage() {
  return <DocumentSessionView />;
}
