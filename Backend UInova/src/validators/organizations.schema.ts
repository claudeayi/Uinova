import { z } from "zod";

export const CreateOrganizationSchema = z.object({
  name: z.string().min(3),
});

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]).default("MEMBER"),
});

export const UpdateMembershipSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "MEMBER"]),
});
