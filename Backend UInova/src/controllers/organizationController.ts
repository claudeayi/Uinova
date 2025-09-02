import { Request, Response } from "express";
import { prisma } from "../utils/prisma";

/* ============================================================================
 * ORGANIZATIONS CRUD
 * ========================================================================== */
export async function listOrganizations(req: Request, res: Response) {
  const orgs = await prisma.organization.findMany({
    where: { memberships: { some: { userId: req.user!.id } } },
    include: { memberships: { include: { user: true } } },
  });
  res.json({ success: true, data: orgs });
}

export async function getOrganization(req: Request, res: Response) {
  const { id } = req.params;
  const org = await prisma.organization.findUnique({
    where: { id },
    include: { memberships: { include: { user: true } } },
  });
  if (!org) return res.status(404).json({ success: false, message: "Organisation introuvable" });
  res.json({ success: true, data: org });
}

export async function createOrganization(req: Request, res: Response) {
  const { name } = req.body;
  const org = await prisma.organization.create({
    data: {
      name,
      ownerId: req.user!.id,
      memberships: { create: { userId: req.user!.id, role: "OWNER" } },
    },
  });
  res.status(201).json({ success: true, data: org });
}

export async function updateOrganization(req: Request, res: Response) {
  const { id } = req.params;
  const { name } = req.body;
  const org = await prisma.organization.update({
    where: { id },
    data: { name },
  });
  res.json({ success: true, data: org });
}

export async function deleteOrganization(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.organization.delete({ where: { id } });
  res.json({ success: true });
}

/* ============================================================================
 * MEMBERS & INVITES
 * ========================================================================== */
export async function inviteMember(req: Request, res: Response) {
  const { id } = req.params;
  const { email, role } = req.body;

  const invite = await prisma.orgInvite.create({
    data: {
      orgId: id,
      email,
      role: role || "MEMBER",
      invitedById: req.user!.id,
    },
  });

  res.status(201).json({ success: true, data: invite });
}

export async function acceptInvite(req: Request, res: Response) {
  const { inviteId } = req.params;

  const invite = await prisma.orgInvite.findUnique({ where: { id: inviteId } });
  if (!invite) return res.status(404).json({ success: false, message: "Invitation introuvable" });
  if (invite.accepted) return res.status(400).json({ success: false, message: "Déjà acceptée" });

  // Ajouter comme membre
  await prisma.$transaction([
    prisma.orgInvite.update({
      where: { id: inviteId },
      data: { accepted: true },
    }),
    prisma.membership.create({
      data: { orgId: invite.orgId, userId: req.user!.id, role: invite.role },
    }),
  ]);

  res.json({ success: true, message: "Invitation acceptée" });
}

export async function removeMember(req: Request, res: Response) {
  const { id, userId } = req.params;
  await prisma.membership.delete({
    where: { userId_orgId: { userId, orgId: id } },
  });
  res.json({ success: true, message: "Membre supprimé" });
}

export async function changeRole(req: Request, res: Response) {
  const { id, userId } = req.params;
  const { role } = req.body;

  const member = await prisma.membership.update({
    where: { userId_orgId: { userId, orgId: id } },
    data: { role },
  });

  res.json({ success: true, data: member });
}
