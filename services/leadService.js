// services/leadService.js

const pool = require('./dbService');

/** Normaliza string: trim; null/undefined -> '' si se necesita NOT NULL */
const nn = (v) => (v === undefined || v === null ? '' : String(v).trim());

/** Devuelve string trim o null si queda vacío */
const strOrNull = (v) => {
  if (v === undefined || v === null) return null;
  const t = String(v).trim();
  return t === '' ? null : t;
};

/** Intenta validar un datetime "YYYY-MM-DD HH:MM:SS"; si no matchea, retorna null */
function normalizeFecha(v) {
  const s = strOrNull(v);
  if (!s) return null;
  // Acepta "YYYY-MM-DD HH:MM:SS" o "YYYY-MM-DDTHH:MM:SS"
  const m = s.match(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/);
  return m ? s.replace('T', ' ') : null;
}

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

/** Candidatos de teléfono para búsquedas (tolerante a +, espacios, etc.) */
function buildPhoneCandidates(raw) {
  const tel = String(raw || '').trim();
  const noSpaces = tel.replace(/\s+/g, '');
  const digits = noSpaces.replace(/\D+/g, '');
  const withPlus = digits ? `+${digits}` : '';

  const candidates = [];
  const pushUniq = (v) => { if (v && !candidates.includes(v)) candidates.push(v); };

  pushUniq(tel);
  pushUniq(noSpaces);
  pushUniq(digits);
  pushUniq(withPlus);

  return candidates;
}

/** Teléfono canon para ALMACENAR: solo dígitos (sin +) */
function canonicalizePhoneForStore(raw) {
  return String(raw || '').replace(/\D+/g, '');
}

/** Buscar por lead_id (completo) */
async function findLeadById(leadId) {
  try {
    const id = Number(leadId) || 0;
    if (!id) return null;

    const [rows] = await pool.query(
      `SELECT
         lead_id AS id,
         user_id,
         telefono,
         instancia_evolution_api,
         nombre,
         apellido,
         email,
         fecha,
         zona_horaria,
         fuente,
         ciudad,
         pais,
         payload,
         dominio
       FROM wa_bot_leads
       WHERE lead_id = ?
       LIMIT 1`,
      [id]
    );
    return rows && rows[0] ? rows[0] : null;
  } catch (err) {
    console.warn('⚠️ findLeadById falló:', err?.code, err?.errno, err?.sqlState, err?.sqlMessage);
    return null;
  }
}

/**
 * Busca un lead por teléfono + instancia (compatibilidad)
 * Intenta variantes de teléfono.
 */
async function findLeadByPhoneAndInstance(telefono, instancia) {
  try {
    const inst = String(instancia || '').trim();
    if (!inst) return null;

    const phones = buildPhoneCandidates(telefono);
    for (const ph of phones) {
      const [rows] = await pool.query(
        `SELECT
           lead_id   AS id,
           user_id,
           telefono,
           instancia_evolution_api,
           nombre,
           apellido,
           email,
           fecha,
           zona_horaria,
           fuente,
           ciudad,
           pais,
           payload,
           dominio
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

/** Busca por (user_id, telefono, instancia, dominio) probando variantes de teléfono */
async function findLeadByComposite(userId, telefono, instancia, dominio) {
  try {
    const uid = Number(userId) || 0;
    const inst = nn(instancia);
    const dom = nn(dominio);
    if (!uid || !inst) return null;

    const phones = buildPhoneCandidates(telefono);
    for (const ph of phones) {
      const [rows] = await pool.query(
        `SELECT lead_id AS id
           FROM wa_bot_leads
          WHERE user_id = ?
            AND telefono = ?
            AND instancia_evolution_api = ?
            AND dominio = ?
          LIMIT 1`,
        [uid, ph, inst, dom]
      );
      if (rows && rows[0]) return rows[0];
    }
    return null;
  } catch (err) {
    console.warn('⚠️ findLeadByComposite falló:', err?.code, err?.errno, err?.sqlState, err?.sqlMessage);
    return null;
  }
}

/**
 * Upsert del lead.
 * - Si llega lead_id → UPDATE por ID (telefono no es obligatorio).
 * - Si NO llega lead_id → INSERT con UNIQUE (user_id, telefono, instancia, dominio)
 *   y ON DUPLICATE UPDATE seguro.
 */
async function upsertLead(leadData) {
  const leadIdIn  = leadData?.lead_id ? Number(leadData.lead_id) : null;
  const instancia = nn(leadData?.instancia_evolution_api);
  const userId    = leadData?.user_id ? Number(leadData.user_id) : null;
  const telefonoCanon = canonicalizePhoneForStore(leadData?.telefono);

  // Campos principales (opcionales)
  const nombre       = strOrNull(leadData?.nombre);
  const apellido     = strOrNull(leadData?.apellido);
  const email        = strOrNull(leadData?.email);
  const fecha        = normalizeFecha(leadData?.fecha); // nunca '' a MySQL
  const zonaHoraria  = strOrNull(leadData?.zona_horaria);
  const fuente       = strOrNull(leadData?.fuente);
  const ciudad       = strOrNull(leadData?.ciudad);
  const pais         = strOrNull(leadData?.pais);
  const dominioRaw   = strOrNull(leadData?.dominio);

  const link = leadData?.link;
  const meet = leadData?.meet;
  const zoom = leadData?.zoom;

  // Dominio fallback si no se envía explícito
  const dominio =
    dominioRaw ||
    getDomainFromUrl(link) ||
    getDomainFromUrl(meet) ||
    getDomainFromUrl(zoom) ||
    '';

  // payload extra (no repetimos user_id, telefono, instancia, dominio)
  const {
    user_id, telefono, instancia_evolution_api, dominio: _omitDom,
    ...rest
  } = leadData;
  const payloadExtra = Object.keys(rest).length ? JSON.stringify(rest) : null;

  // === A) UPDATE por lead_id (telefono no requerido) ===
  if (leadIdIn) {
    console.log('📝 upsertLead UPDATE by lead_id:', {
      leadIdIn,
      userId,
      telefono: telefonoCanon || '(sin cambio)',
      dominio: dominio || '(sin cambio)',
      instancia: instancia || '(sin cambio)',
    });

    const sqlUpdate = `
      UPDATE wa_bot_leads
         SET user_id                 = COALESCE(?, user_id),
             telefono                = COALESCE(NULLIF(?, ''), telefono),
             dominio                 = COALESCE(NULLIF(?, ''), dominio),
             instancia_evolution_api = COALESCE(NULLIF(?, ''), instancia_evolution_api),
             nombre                  = COALESCE(NULLIF(?, ''), nombre),
             apellido                = COALESCE(NULLIF(?, ''), apellido),
             email                   = COALESCE(NULLIF(?, ''), email),
             fecha                   = COALESCE(?, fecha),
             zona_horaria            = COALESCE(NULLIF(?, ''), zona_horaria),
             fuente                  = COALESCE(NULLIF(?, ''), fuente),
             ciudad                  = COALESCE(NULLIF(?, ''), ciudad),
             pais                    = COALESCE(NULLIF(?, ''), pais),
             payload                 = COALESCE(NULLIF(?, ''), payload),
             updated_at              = CURRENT_TIMESTAMP
       WHERE lead_id = ?
       LIMIT 1
    `;

    const paramsUpdate = [
      userId || null,
      telefonoCanon || '',
      dominio || '',
      instancia || '',
      nombre || '',
      apellido || '',
      email || '',
      fecha, // null o 'YYYY-MM-DD HH:MM:SS'
      zonaHoraria || '',
      fuente || '',
      ciudad || '',
      pais || '',
      payloadExtra || '',
      leadIdIn,
    ];

    try {
      const [res] = await pool.query(sqlUpdate, paramsUpdate);
      // Si no afectó filas, intentamos leer para confirmar existencia
      if (!res.affectedRows) {
        const exists = await findLeadById(leadIdIn);
        if (!exists) {
          console.warn('⚠️ upsertLead: lead_id no existe, no se realizó UPDATE');
          return { leadId: null, userId, isNew: false };
        }
      }
      // Devolvemos lead_id (no cambiamos ID)
      const after = await findLeadById(leadIdIn);
      return { leadId: leadIdIn, userId: after?.user_id ?? userId, isNew: false };
    } catch (err) {
      console.warn('⚠️ upsertLead UPDATE by ID falló (continuamos):', err?.code, err?.errno, err?.sqlState, err?.sqlMessage);
      const after = await findLeadById(leadIdIn);
      return { leadId: after?.id ?? null, userId: after?.user_id ?? userId, isNew: false };
    }
  }

  // === B) INSERT/UPDATE por clave compuesta (user_id, telefono, instancia, dominio) ===
  if (!telefonoCanon || !instancia || !userId) {
    console.warn('⚠️ upsertLead: faltan user_id, telefono o instancia_evolution_api; no se realiza acción');
    return { leadId: null, userId, isNew: false };
  }

  console.log('📝 upsertLead INSERT/UPSERT:', {
    userId,
    telefono: telefonoCanon,
    dominio,
    instancia,
  });

  const sqlInsert = `
    INSERT INTO wa_bot_leads
      (user_id, telefono, dominio, instancia_evolution_api,
       nombre, apellido, email, fecha, zona_horaria,
       fuente, ciudad, pais, payload)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      nombre        = COALESCE(NULLIF(VALUES(nombre), ''),       nombre),
      apellido      = COALESCE(NULLIF(VALUES(apellido), ''),     apellido),
      email         = COALESCE(NULLIF(VALUES(email), ''),        email),
      fecha         = COALESCE(VALUES(fecha),                    fecha),
      zona_horaria  = COALESCE(NULLIF(VALUES(zona_horaria), ''), zona_horaria),
      fuente        = COALESCE(NULLIF(VALUES(fuente), ''),       fuente),
      ciudad        = COALESCE(NULLIF(VALUES(ciudad), ''),       ciudad),
      pais          = COALESCE(NULLIF(VALUES(pais), ''),         pais),
      payload       = COALESCE(NULLIF(VALUES(payload), ''),      payload),
      updated_at    = CURRENT_TIMESTAMP
  `;

  const paramsInsert = [
    userId,
    telefonoCanon,
    dominio,
    instancia,
    nombre,
    apellido,
    email,
    fecha,
    zonaHoraria,
    fuente,
    ciudad,
    pais,
    payloadExtra,
  ];

  try {
    const [result] = await pool.query(sqlInsert, paramsInsert);
    if (result && result.insertId > 0) {
      return { leadId: result.insertId, userId, isNew: true };
    }
    // Duplicate key update → obtener id exacto por combinación
    const existing = await findLeadByComposite(userId, telefonoCanon, instancia, dominio);
    return { leadId: existing?.id ?? null, userId, isNew: false };
  } catch (err) {
    console.warn('⚠️ upsertLead INSERT/UPSERT falló (continuamos):', err?.code, err?.errno, err?.sqlState, err?.sqlMessage);
    if (err?.code === 'ER_DUP_ENTRY') {
      const existing = await findLeadByComposite(userId, telefonoCanon, instancia, dominio);
      return { leadId: existing?.id ?? null, userId, isNew: false };
    }
    // último fallback por teléfono+instancia
    const existing = await findLeadByPhoneAndInstance(telefonoCanon, instancia);
    return { leadId: existing?.id ?? null, userId, isNew: false };
  }
}

/** Historial de etapas (no lanza excepciones) */
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
  findLeadByComposite,
  findLeadById, // export NUEVO
};
