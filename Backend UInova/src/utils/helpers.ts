export function formatDate(date: Date | string) {
  return new Date(date).toLocaleString("fr-FR");
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
