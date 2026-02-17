/**
 * Helper para convertir de forma segura IDs desde params/query
 * Maneja string, number, y string[]
 */
export function parseId(id: any): number | string {
  if (Array.isArray(id)) {
    return id[0];
  }
  if (typeof id === 'string') {
    const parsed = parseInt(id, 10);
    return isNaN(parsed) ? id : parsed;
  }
  return id;
}

/**
 * Helper para parsear IDs como número solamente
 */
export function parseIdAsNumber(id: any): number {
  if (Array.isArray(id)) {
    id = id[0];
  }
  const parsed = parseInt(String(id), 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid ID: ${id}`);
  }
  return parsed;
}
