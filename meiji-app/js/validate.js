/**
 * validate.js — Helpers de validation des entrées utilisateur.
 *
 * Centralise les contrôles métier (montant, date, champ requis…) pour éviter
 * les bugs récurrents (montant négatif, date dans 5 ans, libellé vide).
 *
 * Convention : chaque méthode retourne `{ ok:true, value }` quand l'entrée
 * est valide (avec `value` normalisée), sinon `{ ok:false, error }` avec
 * un message en français prêt à afficher.
 *
 * Usage typique :
 *   const m = Validate.amount(input.value, { label: 'Montant' });
 *   if (!m.ok) return App.toastError(m.error);
 *   payload.montant = m.value;
 */

const Validate = {
  // Montant en FCFA : nombre positif, raisonnable (< 100 millions par défaut).
  // opts : { label, min=0, max=100_000_000, allowZero=false }
  amount(raw, opts = {}) {
    const label = opts.label || 'Montant';
    const min = opts.min != null ? opts.min : 0;
    const max = opts.max != null ? opts.max : 100_000_000;
    const v = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').replace(/\s+/g, ''));
    if (isNaN(v)) return { ok: false, error: `${label} : nombre attendu.` };
    if (!opts.allowZero && v === 0) return { ok: false, error: `${label} : doit être différent de 0.` };
    if (v < min) return { ok: false, error: `${label} : ne peut pas être inférieur à ${min.toLocaleString('fr-FR')}.` };
    if (v > max) return { ok: false, error: `${label} : trop grand (max ${max.toLocaleString('fr-FR')} — vérifie la saisie).` };
    return { ok: true, value: v };
  },

  // Date ISO YYYY-MM-DD : présente, parseable, et dans une fenêtre raisonnable.
  // opts : { label, allowFuture=false, maxFutureDays=0, allowPastDays=3650 }
  date(raw, opts = {}) {
    const label = opts.label || 'Date';
    if (!raw) return { ok: false, error: `${label} requise.` };
    const v = String(raw).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return { ok: false, error: `${label} : format invalide (YYYY-MM-DD attendu).` };
    const d = new Date(v + 'T00:00:00');
    if (isNaN(d.getTime())) return { ok: false, error: `${label} : date inexistante.` };
    const today = new Date(); today.setHours(0,0,0,0);
    const diffDays = Math.round((d - today) / 86400000);
    const maxFut = opts.allowFuture ? (opts.maxFutureDays || 365) : 0;
    if (diffDays > maxFut) {
      return { ok: false, error: `${label} : ne peut pas être dans le futur (saisi ${diffDays}j).` };
    }
    const maxPast = opts.allowPastDays != null ? opts.allowPastDays : 3650;
    if (-diffDays > maxPast) {
      return { ok: false, error: `${label} : trop ancienne (plus de ${maxPast} jours).` };
    }
    return { ok: true, value: v };
  },

  // Chaîne non vide après trim. opts : { label, maxLength=500 }
  required(raw, opts = {}) {
    const label = opts.label || 'Champ';
    const v = String(raw ?? '').trim();
    if (!v) return { ok: false, error: `${label} requis.` };
    const max = opts.maxLength || 500;
    if (v.length > max) return { ok: false, error: `${label} : trop long (max ${max} caractères).` };
    return { ok: true, value: v };
  },

  // Combine plusieurs validateurs. Retourne le premier échec, ou ok=true.
  // Usage : Validate.all([Validate.required(nom), Validate.amount(mnt)])
  all(results) {
    for (const r of results) if (!r.ok) return r;
    return { ok: true };
  },
};
