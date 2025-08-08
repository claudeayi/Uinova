import pool from "../config/db.js";

export async function findByEmail(email) {
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [email]);
  return rows[0];
}

export async function createUser({ email, password, role = "user" }) {
  const [res] = await pool.query("INSERT INTO users (email, password, role) VALUES (?, ?, ?)", [email, password, role]);
  return res.insertId;
}

export async function getUserById(id) {
  const [rows] = await pool.query("SELECT id, email, role FROM users WHERE id = ?", [id]);
  return rows[0];
}
