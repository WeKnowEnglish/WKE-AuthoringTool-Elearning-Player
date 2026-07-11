export type TeacherAccessRequestInput = {
  fullName: string;
  email: string;
  school: string;
  reason: string;
  website?: string;
};

export type ValidTeacherAccessRequest = Omit<TeacherAccessRequestInput, "website">;

export function validateTeacherAccessRequest(
  input: TeacherAccessRequestInput,
): { ok: true; value: ValidTeacherAccessRequest } | { ok: false; error: string } {
  const fullName = input.fullName.trim();
  const email = input.email.trim().toLowerCase();
  const school = input.school.trim();
  const reason = input.reason.trim();

  if (input.website?.trim()) return { ok: false, error: "Request could not be submitted." };
  if (fullName.length < 2 || fullName.length > 120) {
    return { ok: false, error: "Enter your full name." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (school.length < 2 || school.length > 180) {
    return { ok: false, error: "Enter your school or organization." };
  }
  if (reason.length < 10 || reason.length > 1000) {
    return { ok: false, error: "Tell us briefly how you plan to use the teacher portal." };
  }

  return { ok: true, value: { fullName, email, school, reason } };
}
