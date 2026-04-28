export default function TeacherRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-teacher-root className="min-h-screen bg-white text-neutral-900">
      {children}
    </div>
  );
}
