import Link from "next/link";

export function AdminSubnav({
  active,
}: {
  active: "hub" | "requests" | "teachers" | "students" | "guardians" | "diagnostics" | "wke-library";
}) {
  const items = [
    { id: "hub" as const, href: "/teacher/admin", label: "Overview" },
    { id: "requests" as const, href: "/teacher/admin/requests", label: "Requests" },
    { id: "teachers" as const, href: "/teacher/admin/teachers", label: "Teachers" },
    { id: "students" as const, href: "/teacher/admin/students", label: "Students" },
    { id: "guardians" as const, href: "/teacher/admin/guardians", label: "Guardians" },
    {
      id: "wke-library" as const,
      href: "/teacher/admin/wke-library",
      label: "WKE Library",
    },
    { id: "diagnostics" as const, href: "/teacher/admin/diagnostics", label: "Diagnostics" },
  ];

  return (
    <nav className="flex flex-wrap gap-1.5" aria-label="Admin sections">
      {items.map((item) => {
        const selected = active === item.id;
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              selected
                ? "bg-neutral-900 text-white"
                : "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50"
            }`}
            aria-current={selected ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
