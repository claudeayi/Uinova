// src/config/db.js

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

// Charge les variables d'environnement définies dans .env
dotenv.config();

/**
 * Configuration du pool MySQL pour UInova.
 *
 * - Les paramètres de connexion (hôte, port, utilisateur, mot de passe, base)
 *   sont récupérés depuis le fichier .env.
 * - Vous pouvez ajuster le nombre de connexions concurrentes avec DB_CONN_LIMIT
 *   et la taille de la file d’attente via DB_QUEUE_LIMIT.
 * - L’option multipleStatements est activée pour faciliter les migrations ou
 *   l’exécution de plusieurs requêtes en une fois.
 * - Des logs sont émis lors de l’acquisition et de la libération d’une connexion
 *   pour surveiller l’état du pool (désactivez ces logs en production si besoin).
 */

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONN_LIMIT || '10', 10),
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT || '0', 10),
  multipleStatements: true,
});

// Logs de surveillance (peuvent être retirés en production)
pool.on('acquire', (connection) => {
  console.log(`[DB] Connexion ${connection.threadId} acquise`);
});
pool.on('release', (connection) => {
  console.log(`[DB] Connexion ${connection.threadId} relâchée`);
});

/**
 * Exécute une requête SQL avec gestion d’erreur.
 *
 * @param {string} sql - La requête SQL paramétrée.
 * @param {Array} params - Les paramètres à injecter.
 * @returns {Promise<any>} - Le résultat des lignes retournées.
 */
export async function query(sql, params = []) {
  try {
    const [rows] = await pool.execute(sql, params);
    return rows;
  } catch (err) {
    console.error('[DB] Erreur de requête :', err);
    throw err;
  }
}

export default pool;
