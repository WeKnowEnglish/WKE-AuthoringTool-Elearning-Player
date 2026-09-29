import { z } from "zod";

export const adminTeacherEmailSchema = z.object({
  recipientEmail: z.string().trim().email("Enter a valid recipient email.").max(320),
  recipientName: z.string().trim().max(120).optional().default(""),
  subject: z.string().trim().min(1, "Add a subject.").max(160),
  bodyText: z.string().trim().min(1, "Write a message.").max(10000),
  confirmed: z.literal("yes", {
    error: "Confirm the recipient and message before sending.",
  }),
});

export type AdminTeacherEmailInput = z.infer<typeof adminTeacherEmailSchema>;

export function parseAdminTeacherEmail(input: unknown) {
  return adminTeacherEmailSchema.safeParse(input);
}
