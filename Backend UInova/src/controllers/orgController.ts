import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { nanoid } from "nanoid";
import { addDays } from "date-fns";

// ✅ Créer une orga
export async function createOrganization(req: Request, res: Response) {
  try {
    const { name, description } = req.body;
    const user = (req as any).user;

    const org = await prisma.organization.create({
      data: {
        name,
        description,
        ownerId: user.id,
        members: {
          create: { userId: user.id, role: "OWNER" },
        },
      },
      include: { members: true },
    });

    res.status(201).json({ success: true, data: org });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
}

// ✅ Lister mes orgs
export async function listOrganizations(req: Request, res: Response) {
  const user = (req as any).user;
  const orgs = await prisma.organization.findMany({
    where: { members: { some: { userId: user.id } } },
    include: { members: true },
  });
  res.json({ success: true, data: orgs });
}

// ✅ Détail org
export async function getOrganization(req: Request, res: Response) {
  const { orgId } = req.params;
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { members: { include: { user: true } } },
  });
  if (!org) return res.status(404).json({ success: false, message: "Organisation introuvable" });
  res.json({ success: true, data: org });
}

// ✅ Mettre à jour
export async function updateOrganization(req: Request, res: Response) {
  const { orgId } = req.params;
  const { name, description, logoUrl } = req.body;
  const org = await prisma.organization.update({
    where: { id: orgId },
    data: { name, description, logoUrl },
  });
  res.json({ success: true, data: org });
}

// ✅ Inviter un membre
export async function inviteMember(req: Request, res: Response) {
  const { orgId } = req.params;
  const { email, role } = req.body;

  const token = nanoid(24);
  const invite = await prisma.orgInvite.create({
    data: {
      email,
      organizationId: orgId,
      role: role || "MEMBER",
      token,
      expiresAt: addDays(new Date(), 7),
    },
  });

  res.json({ success: true, data: invite });
}

// ✅ Accepter une invitation
export async function acceptInvite(req: Request, res: Response) {
  const { token } = req.params;
  const user = (req as any).user;

  const invite = await prisma.orgInvite.findUnique({ where: { token } });
  if (!invite || invite.expiresAt < new Date())
    return res.status(400).json({ success: false, message: "Invitation invalide ou expirée" });

  await prisma.membership.create({
    data: {
      userId: user.id,
      organizationId: invite.organizationId,
      role: invite.role,
    },
  });

  await prisma.orgInvite.update({
    where: { id: invite.id },
    data: { accepted: true },
  });

  res.json({ success: true, message: "Invitation acceptée" });
}

// ✅ Supprimer un membre
export async function removeMember(req: Request, res: Response) {
  const { orgId, userId } = req.params;
  await prisma.membership.deleteMany({
    where: { organizationId: orgId, userId },
  });
  res.json({ success: true, message: "Membre supprimé" });
}
