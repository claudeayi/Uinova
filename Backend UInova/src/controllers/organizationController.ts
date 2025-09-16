// src/controllers/organizationController.ts
import { Request, Response } from "express";
import { prisma } from "../utils/prisma";
import { nanoid } from "nanoid";
import { addDays } from "date-fns";
import { sendTemplatedEmail } from "../services/emailService";

/* ============================================================================
 *  ORGANIZATION CONTROLLER – enrichi complet
 * ========================================================================== */

// ✅ Créer une organisation
export async function createOrganization(req: Request, res: Response) {
  try {
    const { name, description, logoUrl } = req.body;
    const user = (req as any).user;

    if (!name) return res.status(400).json({ success: false, message: "Nom requis" });

    const org = await prisma.organization.create({
      data: {
        name,
        description,
        logoUrl,
        ownerId: user.id,
        members: { create: { userId: user.id, role: "OWNER" } },
      },
      include: { members: { include: { user: true } } },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "ORG_CREATE",
        metadata: { orgId: org.id, name, ip: req.ip, ua: req.headers["user-agent"] },
      },
    });

    res.status(201).json({ success: true, data: org });
  } catch (e: any) {
    console.error("❌ createOrganization:", e);
    res.status(400).json({ success: false, message: e.message });
  }
}

// ✅ Lister mes organisations (pagination + recherche)
export async function listOrganizations(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const { search = "", page = "1", limit = "20" } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [orgs, total] = await Promise.all([
      prisma.organization.findMany({
        where: {
          members: { some: { userId: user.id } },
          archivedAt: null,
          name: search ? { contains: String(search), mode: "insensitive" } : undefined,
        },
        include: { members: { include: { user: true } } },
        skip,
        take: Number(limit),
      }),
      prisma.organization.count({
        where: {
          members: { some: { userId: user.id } },
          archivedAt: null,
          name: search ? { contains: String(search), mode: "insensitive" } : undefined,
        },
      }),
    ]);

    res.json({
      success: true,
      data: orgs,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (e: any) {
    console.error("❌ listOrganizations:", e);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
}

// ✅ Détail d’une organisation
export async function getOrganization(req: Request, res: Response) {
  try {
    const { orgId } = req.params;
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: { members: { include: { user: true } }, projects: true },
    });
    if (!org) return res.status(404).json({ success: false, message: "Organisation introuvable" });

    res.json({ success: true, data: org });
  } catch (e: any) {
    console.error("❌ getOrganization:", e);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
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
      data: { userId: user.id, action: "ORG_UPDATE", metadata: { orgId, name, ip: req.ip } },
    });

    res.json({ success: true, data: org });
  } catch (e: any) {
    console.error("❌ updateOrganization:", e);
    res.status(400).json({ success: false, message: e.message });
  }
}

// ✅ Archiver / Restaurer
export async function archiveOrganization(req: Request, res: Response) {
  try {
    const { orgId } = req.params;
    const user = (req as any).user;

    await prisma.organization.update({ where: { id: orgId }, data: { archivedAt: new Date() } });

    await prisma.auditLog.create({
      data: { userId: user.id, action: "ORG_ARCHIVE", metadata: { orgId } },
    });

    res.json({ success: true, message: "Organisation archivée" });
  } catch (e: any) {
    console.error("❌ archiveOrganization:", e);
    res.status(400).json({ success: false, message: e.message });
  }
}
export async function restoreOrganization(req: Request, res: Response) {
  try {
    const { orgId } = req.params;
    const user = (req as any).user;

    const org = await prisma.organization.update({ where: { id: orgId }, data: { archivedAt: null } });

    await prisma.auditLog.create({
      data: { userId: user.id, action: "ORG_RESTORE", metadata: { orgId } },
    });

    res.json({ success: true, data: org });
  } catch (e: any) {
    console.error("❌ restoreOrganization:", e);
    res.status(400).json({ success: false, message: e.message });
  }
}

// ✅ Inviter / Accepter / Refuser
export async function inviteMember(req: Request, res: Response) {
  try {
    const { orgId } = req.params;
    const { email, role } = req.body;
    const user = (req as any).user;

    const membership = await prisma.membership.findFirst({ where: { organizationId: orgId, userId: user.id } });
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
      data: { userId: user.id, action: "ORG_INVITE_SENT", metadata: { orgId, email, role } },
    });

    res.json({ success: true, data: invite });
  } catch (e: any) {
    console.error("❌ inviteMember:", e);
    res.status(400).json({ success: false, message: e.message });
  }
}
export async function listInvites(req: Request, res: Response) {
  try {
    const { orgId } = req.params;
    const { page = "1", limit = "20" } = req.query;

    const skip = (Number(page) - 1) * Number(limit);

    const [invites, total] = await Promise.all([
      prisma.orgInvite.findMany({
        where: { organizationId: orgId, accepted: false, expiresAt: { gt: new Date() } },
        skip,
        take: Number(limit),
      }),
      prisma.orgInvite.count({ where: { organizationId: orgId, accepted: false, expiresAt: { gt: new Date() } } }),
    ]);

    res.json({
      success: true,
      data: invites,
      pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (e: any) {
    console.error("❌ listInvites:", e);
    res.status(500).json({ success: false, message: "Erreur serveur" });
  }
}
export async function acceptInvite(req: Request, res: Response) {
  try {
    const { token } = req.params;
    const user = (req as any).user;

    const invite = await prisma.orgInvite.findUnique({ where: { token }, include: { organization: true } });
    if (!invite || invite.expiresAt < new Date() || invite.accepted) {
      return res.status(400).json({ success: false, message: "Invitation invalide ou expirée" });
    }

    await prisma.membership.create({ data: { userId: user.id, organizationId: invite.organizationId, role: invite.role } });
    await prisma.orgInvite.update({ where: { id: invite.id }, data: { accepted: true, acceptedAt: new Date() } });

    res.json({ success: true, message: "Invitation acceptée", org: invite.organization });
  } catch (e: any) {
    console.error("❌ acceptInvite:", e);
    res.status(400).json({ success: false, message: e.message });
  }
}
export async function declineInvite(req: Request, res: Response) {
  try {
    const { token } = req.params;
    const user = (req as any).user;

    const invite = await prisma.orgInvite.findUnique({ where: { token } });
    if (!invite || invite.accepted) return res.status(404).json({ success: false, message: "Invitation introuvable" });

    await prisma.orgInvite.update({ where: { id: invite.id }, data: { declined: true, declinedAt: new Date() } });

    res.json({ success: true, message: "Invitation refusée" });
  } catch (e: any) {
    console.error("❌ declineInvite:", e);
    res.status(400).json({ success: false, message: e.message });
  }
}

// ✅ Gestion membres : supprimer / changer rôle / transférer ownership
export async function removeMember(req: Request, res: Response) {
  try {
    const { orgId, userId } = req.params;
    const caller = (req as any).user;

    const membership = await prisma.membership.findFirst({ where: { organizationId: orgId, userId: caller.id } });
    if (!membership || membership.role !== "OWNER") {
      return res.status(403).json({ success: false, message: "Seul le propriétaire peut supprimer un membre" });
    }

    await prisma.membership.deleteMany({ where: { organizationId: orgId, userId } });

    res.json({ success: true, message: "Membre supprimé" });
  } catch (e: any) {
    console.error("❌ removeMember:", e);
    res.status(400).json({ success: false, message: e.message });
  }
}
export async function changeMemberRole(req: Request, res: Response) {
  try {
    const { orgId, userId } = req.params;
    const { role } = req.body;
    const caller = (req as any).user;

    const membership = await prisma.membership.findFirst({ where: { organizationId: orgId, userId: caller.id } });
    if (!membership || !["OWNER", "ADMIN"].includes(membership.role)) {
      return res.status(403).json({ success: false, message: "Accès interdit" });
    }

    const updated = await prisma.membership.updateMany({
      where: { organizationId: orgId, userId },
      data: { role },
    });

    res.json({ success: true, updated });
  } catch (e: any) {
    console.error("❌ changeMemberRole:", e);
    res.status(400).json({ success: false, message: e.message });
  }
}
export async function transferOwnership(req: Request, res: Response) {
  try {
    const { orgId, newOwnerId } = req.body;
    const caller = (req as any).user;

    const membership = await prisma.membership.findFirst({ where: { organizationId: orgId, userId: caller.id } });
    if (!membership || membership.role !== "OWNER") {
      return res.status(403).json({ success: false, message: "Seul le propriétaire actuel peut transférer l’organisation" });
    }

    await prisma.organization.update({ where: { id: orgId }, data: { ownerId: newOwnerId } });
    await prisma.membership.updateMany({ where: { organizationId: orgId, userId: newOwnerId }, data: { role: "OWNER" } });
    await prisma.membership.updateMany({ where: { organizationId: orgId, userId: caller.id }, data: { role: "ADMIN" } });

    res.json({ success: true, message: "Transfert de propriété effectué" });
  } catch (e: any) {
    console.error("❌ transferOwnership:", e);
    res.status(400).json({ success: false, message: e.message });
  }
}

// ✅ Stats / Overview d’une organisation
export async function getOrganizationOverview(req: Request, res: Response) {
  try {
    const { orgId } = req.params;

    const [membersCount, projectsCount] = await Promise.all([
      prisma.membership.count({ where: { organizationId: orgId } }),
      prisma.project.count({ where: { organizationId: orgId } }),
    ]);

    res.json({
      success: true,
      data: {
        membersCount,
        projectsCount,
        lastActivity: new Date(),
      },
    });
  } catch (e: any) {
    console.error("❌ getOrganizationOverview:", e);
    res.status(500).json({ success: false, message: e.message });
  }
}
