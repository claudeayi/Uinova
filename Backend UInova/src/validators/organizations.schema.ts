import { z } from "zod";

/* ============================================================================
 * ORGANIZATION
 * ========================================================================== */
export const OrganizationCreateSchema = z.object({
  name: z.string().min(2).max(120),
});

export const OrganizationUpdateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
});

/* ============================================================================
 * MEMBERSHIP
 * ========================================================================== */
export const MembershipCreateSchema = z.object({
  userId: z.string().cuid(),
  role: z.enum(["OWNER","ADMIN","MEMBER"]).default("MEMBER"),
});

export const MembershipUpdateSchema = z.object({
  role: z.enum(["OWNER","ADMIN","MEMBER"]).optional(),
});

/* ============================================================================
 * INVITE
 * ========================================================================== */
export const OrgInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["ADMIN","MEMBER"]).default("MEMBER"),
});
