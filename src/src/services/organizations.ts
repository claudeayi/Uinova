// src/services/organizations.ts
import http from "./http";

/* ============================================================================
 * Typings
 * ========================================================================== */
export interface Organization {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Member {
  id: string;
  email: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
}

export interface Invite {
  id: string;
  email: string;
  role: "admin" | "member";
  orgId: string;
  createdAt: string;
  status: "pending" | "accepted" | "expired";
}

/* ============================================================================
 * Utils
 * ========================================================================== */
function emitEvent(name: string, detail?: any) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

function handleError(err: any, context: string) {
  console.error(`❌ ${context}:`, err);
  throw err;
}

/* ============================================================================
 * API Organizations
 * ========================================================================== */

// ✅ Lister mes organisations
export async function getOrganizations(): Promise<Organization[]> {
  try {
    const res = await http.get("/organizations");
    return res.data.data || [];
  } catch (err) {
    return handleError(err, "Erreur getOrganizations");
  }
}

// ✅ Récupérer une organisation spécifique
export async function getOrganizationById(orgId: string): Promise<Organization | null> {
  try {
    const res = await http.get(`/organizations/${orgId}`);
    return res.data.data;
  } catch (err) {
    handleError(err, "Erreur getOrganizationById");
    return null;
  }
}

// ✅ Créer une organisation
export async function createOrganization(payload: {
  name: string;
  description?: string;
}): Promise<Organization> {
  try {
    const res = await http.post("/organizations", payload);
    emitEvent("org:created", res.data.data);
    return res.data.data;
  } catch (err) {
    return handleError(err, "Erreur createOrganization");
  }
}

// ✅ Mettre à jour une organisation
export async function updateOrganization(
  orgId: string,
  payload: { name?: string; description?: string }
): Promise<Organization> {
  try {
    const res = await http.put(`/organizations/${orgId}`, payload);
    emitEvent("org:updated", res.data.data);
    return res.data.data;
  } catch (err) {
    return handleError(err, "Erreur updateOrganization");
  }
}

// ✅ Supprimer une organisation (admin only)
export async function deleteOrganization(orgId: string): Promise<{ success: boolean }> {
  try {
    const res = await http.delete(`/organizations/${orgId}`);
    emitEvent("org:deleted", { id: orgId });
    return res.data;
  } catch (err) {
    return handleError(err, "Erreur deleteOrganization");
  }
}

// ✅ Inviter un membre
export async function inviteMember(
  orgId: string,
  payload: { email: string; role?: string }
): Promise<Invite> {
  try {
    const res = await http.post(`/organizations/${orgId}/invite`, payload);
    return res.data.data;
  } catch (err) {
    return handleError(err, "Erreur inviteMember");
  }
}

// ✅ Renvoyer une invitation
export async function resendInvite(orgId: string, inviteId: string): Promise<{ success: boolean }> {
  try {
    const res = await http.post(`/organizations/${orgId}/invite/${inviteId}/resend`);
    return res.data;
  } catch (err) {
    return handleError(err, "Erreur resendInvite");
  }
}

// ✅ Accepter une invitation
export async function acceptInvite(token: string): Promise<{ success: boolean }> {
  try {
    const res = await http.post(`/organizations/invite/${token}/accept`);
    emitEvent("org:inviteAccepted", res.data);
    return res.data;
  } catch (err) {
    return handleError(err, "Erreur acceptInvite");
  }
}

// ✅ Lister les membres d’une organisation
export async function listMembers(orgId: string): Promise<Member[]> {
  try {
    const res = await http.get(`/organizations/${orgId}/members`);
    return res.data.data || [];
  } catch (err) {
    return handleError(err, "Erreur listMembers");
  }
}

// ✅ Supprimer un membre
export async function removeMember(orgId: string, userId: string): Promise<{ success: boolean }> {
  try {
    const res = await http.delete(`/organizations/${orgId}/members/${userId}`);
    emitEvent("org:memberRemoved", { orgId, userId });
    return res.data;
  } catch (err) {
    return handleError(err, "Erreur removeMember");
  }
}

// ✅ Quitter une organisation
export async function leaveOrganization(orgId: string): Promise<{ success: boolean }> {
  try {
    const res = await http.post(`/organizations/${orgId}/leave`);
    emitEvent("org:left", { id: orgId });
    return res.data;
  } catch (err) {
    return handleError(err, "Erreur leaveOrganization");
  }
}
