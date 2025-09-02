import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { nanoid } from "nanoid";
import { addDays } from "date-fns";
import { sendTemplatedEmail } from "../services/emailService";

/* ============================================================================
 *  ORGANIZATION CONTROLLER
 * ========================================================================== */

// ✅ Créer une organisation
export async function createOrganization(req: Request, res: Response) {
  try {
    const { name, description, logoUrl } = req.body;
    const user = (req as any).user;

    const org = await prisma.organization.create({
      data: {
        name,
        description,
        logoUrl,
        ownerId: user.id,
        members: {
          create: { userId: user.id, role: "OWNER" },
        },
      },
      include: { members: { include: { user: true } } },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ORG_CREATE",
        metadata: { orgId: org.id, name },
      },
    });

    res.status(201).json({ success: true, data: org });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
}

// ✅ Lister mes organisations
export async function listOrganizations(req: Request, res: Response) {
  const user = (req as any).user;
  const orgs = await prisma.organization.findMany({
    where: { members: { some: { userId: user.id } } },
    include: { members: { include: { user: true } } },
  });
  res.json({ success: true, data: orgs });
}

// ✅ Détail d’une organisation
export async function getOrganization(req: Request, res: Response) {
  const { orgId } = req.params;
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: { members: { include: { user: true } } },
  });
  if (!org) return res.status(404).json({ success: false, message: "Organisation introuvable" });
  res.json({ success: true, data: org });
}

// ✅ Mettre à jour une organisation
export async function updateOrganization(req: Request, res: Response) {
  try {
    const { orgId } = req.params;
    const { name, description, logoUrl } = req.body;
    const user = (req as any).user;

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: { name, description, logoUrl },
    });

    await prisma.auditLog.create({
      data: { userId: user.id, action: "ORG_UPDATE", metadata: { orgId, name } },
    });

    res.json({ success: true, data: org });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
}

// ✅ Inviter un membre
export async function inviteMember(req: Request, res: Response) {
  try {
    const { orgId } = req.params;
    const { email, role } = req.body;
    const user = (req as any).user;

    // Vérifier droits (seul OWNER/ADMIN de l’orga)
    const membership = await prisma.membership.findFirst({
      where: { organizationId: orgId, userId: user.id },
    });
    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return res.status(403).json({ success: false, message: "Accès interdit" });
    }

    const token = nanoid(32);
    const invite = await prisma.orgInvite.create({
      data: {
        email,
        organizationId: orgId,
        role: role || "MEMBER",
        token,
        invitedById: user.id,
        expiresAt: addDays(new Date(), 7),
      },
      include: { organization: true },
    });

    // 📩 Envoi email basé sur template ORG_INVITE
    try {
      await sendTemplatedEmail("ORG_INVITE", email, {
        orgName: invite.organization.name,
        invitedBy: user.email,
        acceptUrl: `${process.env.APP_URL}/orgs/invites/${invite.token}/accept`,
      });
    } catch (err) {
      console.error("❌ Envoi email invitation échoué:", err);
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ORG_INVITE_SENT",
        metadata: { orgId, email, role },
      },
    });

    res.json({ success: true, data: invite });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
}

// ✅ Accepter une invitation
export async function acceptInvite(req: Request, res: Response) {
  try {
    const { token } = req.params;
    const user = (req as any).user;

    const invite = await prisma.orgInvite.findUnique({
      where: { token },
      include: { organization: true },
    });
    if (!invite || invite.expiresAt < new Date() || invite.accepted) {
      return res.status(400).json({ success: false, message: "Invitation invalide ou expirée" });
    }

    // Créer l’adhésion
    await prisma.membership.create({
      data: {
        userId: user.id,
        organizationId: invite.organizationId,
        role: invite.role,
      },
    });

    await prisma.orgInvite.update({
      where: { id: invite.id },
      data: { accepted: true, acceptedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ORG_INVITE_ACCEPTED",
        metadata: { orgId: invite.organizationId, inviteId: invite.id },
      },
    });

    res.json({ success: true, message: "Invitation acceptée", org: invite.organization });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
}

// ✅ Supprimer un membre
export async function removeMember(req: Request, res: Response) {
  try {
    const { orgId, userId } = req.params;
    const user = (req as any).user;

    const membership = await prisma.membership.findFirst({
      where: { organizationId: orgId, userId: user.id },
    });
    if (!membership || membership.role !== "OWNER") {
      return res.status(403).json({ success: false, message: "Seul le propriétaire peut supprimer un membre" });
    }

    await prisma.membership.deleteMany({
      where: { organizationId: orgId, userId },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ORG_MEMBER_REMOVED",
        metadata: { orgId, removedUserId: userId },
      },
    });

    res.json({ success: true, message: "Membre supprimé" });
  } catch (e: any) {
    res.status(400).json({ success: false, message: e.message });
  }
}
