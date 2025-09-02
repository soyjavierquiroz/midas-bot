// services/leadService.js

const pool = require('./dbService');

/** Normaliza string: trim; null/undefined -> '' si se necesita NOT NULL */
const nn = (v) => (v === undefined || v === null ? '' : String(v).trim());

/** Extrae host (sin www.) de una URL; retorna '' si no es válida */
function getDomainFromUrl(url) {
  if (!url) return '';
  try {
    const host = new URL(url).host || '';
    return host.startsWith('www.') ? host.slice(4) : host;
  } catch {
    return '';
  }
}

/**
 * Devuelve un set de candidatos de teléfono para búsqueda:
 * - tal cual llega (trim)
 * - sin espacios
 * - solo dígitos
 * - con '+' + solo dígitos
 */
function buildPhoneCandidates(raw) {
  const tel = String(raw || '').trim();
  const noSpaces = tel.replace(/\s+/g, '');
  const digits = noSpaces.replace(/\D+/g, '');
  const withPlus = digits ? `+${digits}` : '';

  const candidates = [];
  const pushUniq = (v) => {
    if (v && !candidates.includes(v)) candidates.push(v);
  };

  pushUniq(tel);
  pushUniq(noSpaces);
  pushUniq(digits);
  pushUniq(withPlus);

  return candidates;
}

/** Canonicaliza teléfono para almacenar: +[solo dígitos] si es posible */
function canonicalizePhoneForStore(raw) {
  const digits = String(raw || '').replace(/\D+/g, '');
  return digits ? `+${digits}` : nn(raw);
}

/**
 * Busca un lead por teléfono e instancia (robusto a +/espacios/dígitos).
 * Retorna objeto con `id` (alias de lead_id) o null.
 */
async function findLeadByPhoneAndInstance(telefono, instancia) {
  try {
    const inst = String(instancia || '').trim();
    if (!inst) return null;

    const phones = buildPhoneCandidates(telefono);
    for (const ph of phones) {
      if (!ph) continue;
      const [rows] = await pool.query(
        `SELECT
           lead_id AS id, user_id, telefono, instancia_evolution_api,
           nombre, apellido, dominio, email, fecha, zona_horaria,
           fuente, ciudad, pais, payload, created_at, updated_at
         FROM wa_bot_leads
         WHERE telefono = ? AND instancia_evolution_api = ?
         LIMIT 1`,
        [ph, inst]
      );
      if (rows && rows[0]) return rows[0];
    }
    return null;
  } catch (err) {
    console.warn('⚠️ findLeadByPhoneAndInstance falló:', err?.code, err?.errno, err?.sqlState, err?.sqlMessage);
    return null;
  }
}

/**
 * Upsert del lead (INSERT ... ON DUPLICATE KEY UPDATE).
 * - Clave de negocio: UNIQUE(telefono, instancia_evolution_api)
 * - Nunca lanza: en error, loguea y devuelve { leadId: existingId|null }.
 */
async function upsertLead(payload) {
  const telefonoRaw = payload?.telefono;
  const instancia = nn(payload?.instancia_evolution_api);
  const userId = payload?.user_id ? Number(payload.user_id) : null;

  if (!telefonoRaw || !instancia) {
    console.warn('⚠️ upsertLead: faltan telefono o instancia_evolution_api; no se realiza acción');
    return { leadId: null };
  }

  // Teléfono canónico para almacenar (ej: +59179790873)
  const telefono = canonicalizePhoneForStore(telefonoRaw);

  // Fallback de dominio: host(link/meet/zoom) o '' (no NULL)
  const dominio =
    nn(payload?.dominio) ||
    getDomainFromUrl(payload?.link) ||
    getDomainFromUrl(payload?.meet) ||
    getDomainFromUrl(payload?.zoom) ||
    '';

  const nombre = payload?.nombre ? String(payload.nombre).trim() : null;
  const apellido = payload?.apellido ? String(payload.apellido).trim() : null;

  const sql = `
    INSERT INTO wa_bot_leads
      (user_id, telefono, instancia_evolution_api, nombre, apellido, dominio)
    VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      user_id = VALUES(user_id),
      nombre = IF(VALUES(nombre) IS NULL OR VALUES(nombre) = '', nombre, VALUES(nombre)),
      apellido = IF(VALUES(apellido) IS NULL OR VALUES(apellido) = '', apellido, VALUES(apellido)),
      dominio = IFNULL(VALUES(dominio), dominio)
  `;
  const params = [userId, telefono, instancia, nombre, apellido, dominio];

  try {
    const [result] = await pool.query(sql, params);
    if (result && result.insertId > 0) {
      return { leadId: result.insertId }; // inserción nueva
    }
    // duplicate key update → buscar id existente con candidatos (por si el guardado previo no estaba canónico)
    const existing = await findLeadByPhoneAndInstance(telefono, instancia);
    return { leadId: existing?.id ?? null };
  } catch (err) {
    console.warn('⚠️ upsertLead error (continuamos):', err?.code, err?.errno, err?.sqlState, err?.sqlMessage);
    if (err?.code === 'ER_DUP_ENTRY') {
      const existing = await findLeadByPhoneAndInstance(telefono, instancia);
      return { leadId: existing?.id ?? null };
    }
    const existing = await findLeadByPhoneAndInstance(telefono, instancia);
    return { leadId: existing?.id ?? null };
  }
}

/**
 * Registra una etapa para el lead, de forma tolerante.
 * - Nunca lanza: loguea y sigue.
 */
async function addLeadStage(leadId, etapa, metadata = null) {
  if (!leadId || !etapa) {
    console.warn('⚠️ addLeadStage: faltan leadId o etapa; no se inserta historial');
    return;
  }
  try {
    const meta = metadata ? JSON.stringify(metadata) : null;
    await pool.query(
      `INSERT INTO wa_bot_lead_stages
         (lead_id, etapa, metadata)
       VALUES (?, ?, ?)`,
      [leadId, etapa, meta]
    );
  } catch (err) {
    console.warn('⚠️ addLeadStage falló (continuamos):', err?.code, err?.errno, err?.sqlState, err?.sqlMessage);
  }
}

module.exports = {
  upsertLead,
  findLeadByPhoneAndInstance,
  addLeadStage,
};
