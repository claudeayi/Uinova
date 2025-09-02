// src/services/eventBus.ts
import { EventEmitter } from "events";
import axios from "axios";

const bus = new EventEmitter();

// ⚡ Fonction d’émission d’event
export function emitEvent(event: string, payload: any) {
  bus.emit(event, payload);
}

// ⚡ Abonnement interne
export function onEvent(event: string, handler: (data: any) => void) {
  bus.on(event, handler);
}

// ⚡ Exemple de webhook externe
const webhooks: string[] = []; // URLs enregistrées

export function registerWebhook(url: string) {
  webhooks.push(url);
}

// Dispatch automatique vers webhooks
bus.on("project.published", async (data) => {
  for (const url of webhooks) {
    try {
      await axios.post(url, { event: "project.published", data });
    } catch (err) {
      console.error("❌ Webhook error", url, err.message);
    }
  }
});
