import axios from "axios";

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000/api",
});

export const AuthService = {
  login: (email: string, password: string) => API.post("/auth/login", {email, password}),
  register: (email: string, password: string) => API.post("/auth/register", {email, password}),
  currentUser: () => API.get("/auth/me"),
};

export const ProjectService = {
  getAll: () => API.get("/projects"),
  getById: (id: string) => API.get(`/projects/${id}`),
  create: (data: any) => API.post("/projects", data),
  update: (id: string, data: any) => API.put(`/projects/${id}`, data),
  remove: (id: string) => API.delete(`/projects/${id}`),
};

export const PaymentService = {
  pay: (data: any) => API.post("/payment", data),
  // Ajoute tes autres endpoints
};
