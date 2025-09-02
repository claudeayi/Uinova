import http from "./http";

// ✅ Lister mes organisations
export async function getOrganizations() {
  const res = await http.get("/organizations");
  return res.data.data;
}

// ✅ Créer une organisation
export async function createOrganization(payload: { name: string; description?: string }) {
  const res = await http.post("/organizations", payload);
  return res.data.data;
}

// ✅ Inviter un membre
export async function inviteMember(orgId: string, payload: { email: string; role?: string }) {
  const res = await http.post(`/organizations/${orgId}/invite`, payload);
  return res.data.data;
}

// ✅ Accepter une invitation
export async function acceptInvite(token: string) {
  const res = await http.post(`/organizations/invite/${token}/accept`);
  return res.data;
}

// ✅ Supprimer un membre
export async function removeMember(orgId: string, userId: string) {
  const res = await http.delete(`/organizations/${orgId}/members/${userId}`);
  return res.data;
}
