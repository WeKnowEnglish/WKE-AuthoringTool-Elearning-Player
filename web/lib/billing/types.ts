export type LessonPackage = {
  id: string;
  name: string;
  description: string;
  lessonCount: number;
  unitAmount: number;
  currency: string;
  isActive: boolean;
  sortOrder: number;
  updatedAt: string;
};

export type LessonPackOrder = {
  id: string;
  studentId: string;
  packageName: string | null;
  quantity: number;
  lessonCount: number;
  unitAmount: number;
  currency: string;
  status: "pending" | "paid" | "canceled" | "expired" | "refunded";
  paidAt: string | null;
  createdAt: string;
};

export type StudentLessonCredit = {
  studentId: string;
  remainingLessons: number;
};

type PackageRow = {
  id: unknown;
  name: unknown;
  description: unknown;
  lesson_count: unknown;
  unit_amount: unknown;
  currency: unknown;
  is_active: unknown;
  sort_order: unknown;
  updated_at: unknown;
};

type OrderRow = {
  id: unknown;
  student_id: unknown;
  quantity: unknown;
  lesson_count: unknown;
  unit_amount: unknown;
  currency: unknown;
  status: unknown;
  paid_at: unknown;
  created_at: unknown;
  lesson_packages?: { name?: unknown } | { name?: unknown }[] | null;
};

function packageNameFromJoin(
  joined: OrderRow["lesson_packages"],
): string | null {
  if (!joined) return null;
  const row = Array.isArray(joined) ? joined[0] : joined;
  return row?.name ? String(row.name) : null;
}

export function mapLessonPackage(row: PackageRow): LessonPackage {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    description: String(row.description ?? ""),
    lessonCount: Number(row.lesson_count ?? 0),
    unitAmount: Number(row.unit_amount ?? 0),
    currency: String(row.currency ?? "vnd"),
    isActive: row.is_active !== false,
    sortOrder: Number(row.sort_order ?? 0),
    updatedAt: String(row.updated_at ?? ""),
  };
}

export function mapLessonPackOrder(row: OrderRow): LessonPackOrder {
  const status = String(row.status ?? "pending");
  const allowed = ["pending", "paid", "canceled", "expired", "refunded"] as const;
  return {
    id: String(row.id),
    studentId: String(row.student_id),
    packageName: packageNameFromJoin(row.lesson_packages),
    quantity: Number(row.quantity ?? 1),
    lessonCount: Number(row.lesson_count ?? 0),
    unitAmount: Number(row.unit_amount ?? 0),
    currency: String(row.currency ?? "vnd"),
    status: allowed.includes(status as (typeof allowed)[number])
      ? (status as LessonPackOrder["status"])
      : "pending",
    paidAt: row.paid_at ? String(row.paid_at) : null,
    createdAt: String(row.created_at ?? ""),
  };
}
