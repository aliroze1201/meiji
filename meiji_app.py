import streamlit as st
import pandas as pd
from datetime import date, datetime

# ─── Configuration de la page ───────────────────────────────────────────────
st.set_page_config(
    page_title="Meiji – Tableau de Bord",
    page_icon="🍣",
    layout="wide",
)

# ─── CSS personnalisé ────────────────────────────────────────────────────────
st.markdown("""
<style>
    /* ── Variables ── */
    :root {
        --meiji-dark: #0f1729;
        --meiji-navy: #1a2744;
        --meiji-blue: #2563eb;
        --meiji-accent: #f59e0b;
        --meiji-green: #10b981;
        --meiji-red: #ef4444;
        --meiji-surface: #f8fafc;
        --meiji-border: #e2e8f0;
        --meiji-text: #1e293b;
        --meiji-muted: #94a3b8;
    }

    /* ── Reset Streamlit padding ── */
    .block-container { padding-top: 1rem !important; }
    
    /* ── Header ── */
    .meiji-header {
        background: linear-gradient(135deg, var(--meiji-dark) 0%, var(--meiji-navy) 60%, #1e3a5f 100%);
        color: white;
        padding: 1.2rem 2rem;
        border-radius: 16px;
        margin-bottom: 1.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 8px 32px rgba(15, 23, 41, 0.3);
    }
    .meiji-header-left {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    .meiji-header h1 {
        margin: 0;
        font-size: 1.6rem;
        letter-spacing: 3px;
        font-weight: 800;
    }
    .meiji-header .subtitle {
        margin: 0;
        opacity: 0.6;
        font-size: 0.8rem;
        letter-spacing: 1px;
    }
    .meiji-header .header-date {
        background: rgba(255,255,255,0.1);
        padding: 0.5rem 1rem;
        border-radius: 10px;
        font-size: 0.85rem;
        backdrop-filter: blur(10px);
    }

    /* ── KPI Cards ── */
    .kpi-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 1rem;
        margin-bottom: 1.5rem;
    }
    .kpi-card {
        background: white;
        border: 1px solid var(--meiji-border);
        border-radius: 14px;
        padding: 1.2rem 1.4rem;
        position: relative;
        overflow: hidden;
        transition: transform 0.2s, box-shadow 0.2s;
    }
    .kpi-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.08);
    }
    .kpi-card::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 3px;
    }
    .kpi-card.sushi::before { background: var(--meiji-blue); }
    .kpi-card.bar::before { background: var(--meiji-accent); }
    .kpi-card.chicha::before { background: var(--meiji-green); }
    .kpi-card.total::before { background: linear-gradient(90deg, var(--meiji-blue), var(--meiji-accent), var(--meiji-green)); }
    
    .kpi-icon {
        font-size: 1.5rem;
        margin-bottom: 0.3rem;
    }
    .kpi-label {
        font-size: 0.75rem;
        color: var(--meiji-muted);
        text-transform: uppercase;
        letter-spacing: 1px;
        font-weight: 600;
    }
    .kpi-value {
        font-size: 1.5rem;
        font-weight: 800;
        color: var(--meiji-text);
        margin: 0.2rem 0;
    }
    .kpi-sub {
        font-size: 0.72rem;
        color: var(--meiji-muted);
    }

    /* ── Caisse Section ── */
    .caisse-header {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        margin-bottom: 0.5rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid var(--meiji-border);
    }
    .caisse-header .icon { font-size: 1.3rem; }
    .caisse-header .name {
        font-weight: 700;
        font-size: 1rem;
        color: var(--meiji-text);
    }

    /* ── Tableau récapitulatif stylé ── */
    .recap-container {
        background: white;
        border-radius: 14px;
        border: 1px solid var(--meiji-border);
        overflow: hidden;
        margin: 1rem 0;
    }
    .recap-container table {
        width: 100%;
        border-collapse: collapse;
    }
    .recap-container th {
        background: var(--meiji-dark);
        color: white;
        padding: 12px 16px;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        font-weight: 600;
        text-align: center;
    }
    .recap-container th:first-child { text-align: left; }
    .recap-container td {
        padding: 10px 16px;
        text-align: right;
        font-size: 0.9rem;
        border-bottom: 1px solid #f1f5f9;
        color: var(--meiji-text);
    }
    .recap-container td:first-child {
        text-align: left;
        font-weight: 600;
        color: var(--meiji-text);
    }
    .recap-container tr:last-child td {
        background: linear-gradient(135deg, var(--meiji-dark), var(--meiji-navy));
        color: white;
        font-weight: 700;
        font-size: 0.95rem;
        border: none;
    }
    .recap-container tr:hover td {
        background-color: #f8fafc;
    }
    .recap-container tr:last-child:hover td {
        background: linear-gradient(135deg, var(--meiji-dark), var(--meiji-navy));
    }

    /* ── Onglet Journée ── */
    .journee-panel {
        background: white;
        border: 1px solid var(--meiji-border);
        border-radius: 16px;
        overflow: hidden;
        margin-top: 1.5rem;
        box-shadow: 0 4px 16px rgba(0,0,0,0.04);
    }
    .journee-header {
        background: linear-gradient(135deg, var(--meiji-dark), var(--meiji-navy));
        color: white;
        padding: 1rem 1.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .journee-header h3 {
        margin: 0;
        font-size: 1.1rem;
        letter-spacing: 1px;
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    .journee-body {
        padding: 1.5rem;
    }
    .journee-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 1fr;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }
    .journee-item {
        background: var(--meiji-surface);
        border-radius: 12px;
        padding: 1rem 1.2rem;
        border: 1px solid var(--meiji-border);
    }
    .journee-item .label {
        font-size: 0.72rem;
        color: var(--meiji-muted);
        text-transform: uppercase;
        letter-spacing: 1px;
        font-weight: 600;
        margin-bottom: 0.3rem;
    }
    .journee-item .value {
        font-size: 1.2rem;
        font-weight: 800;
        color: var(--meiji-text);
    }
    .journee-item.highlight {
        background: linear-gradient(135deg, #ecfdf5, #d1fae5);
        border-color: #a7f3d0;
    }
    .journee-item.highlight .value { color: #059669; }
    .journee-item.warning {
        background: linear-gradient(135deg, #fef3c7, #fde68a);
        border-color: #fcd34d;
    }
    .journee-item.warning .value { color: #d97706; }
    .journee-item.danger {
        background: linear-gradient(135deg, #fef2f2, #fecaca);
        border-color: #fca5a5;
    }
    .journee-item.danger .value { color: #dc2626; }

    /* ── Solde Espèces Badge ── */
    .solde-badge {
        background: linear-gradient(135deg, #059669 0%, #10b981 100%);
        color: white;
        padding: 1.5rem 2rem;
        border-radius: 16px;
        text-align: center;
        margin-top: 1rem;
        box-shadow: 0 8px 24px rgba(16, 185, 129, 0.25);
        position: relative;
        overflow: hidden;
    }
    .solde-badge.negatif {
        background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
        box-shadow: 0 8px 24px rgba(239, 68, 68, 0.25);
    }
    .solde-badge::before {
        content: '';
        position: absolute;
        top: -50%;
        right: -30%;
        width: 200px;
        height: 200px;
        background: rgba(255,255,255,0.08);
        border-radius: 50%;
    }
    .solde-badge .solde-label {
        font-size: 0.8rem;
        opacity: 0.85;
        letter-spacing: 2px;
        text-transform: uppercase;
        font-weight: 600;
    }
    .solde-badge .solde-amount {
        font-size: 2.5rem;
        font-weight: 900;
        letter-spacing: 1px;
        margin: 0.3rem 0;
    }
    .solde-badge .solde-detail {
        font-size: 0.75rem;
        opacity: 0.7;
    }

    /* ── CA Total Badge ── */
    .total-badge {
        background: linear-gradient(135deg, var(--meiji-dark), #1e3a5f);
        color: white;
        padding: 1.2rem 2rem;
        border-radius: 14px;
        text-align: center;
        margin-top: 1rem;
        box-shadow: 0 6px 24px rgba(15, 23, 41, 0.2);
    }
    .total-badge .amount {
        font-size: 2rem;
        font-weight: 900;
        letter-spacing: 1px;
    }
    .total-badge .label {
        opacity: 0.65;
        font-size: 0.78rem;
        letter-spacing: 2px;
        text-transform: uppercase;
    }

    /* ── Separator ── */
    .section-sep {
        border: none;
        border-top: 2px dashed var(--meiji-border);
        margin: 1.5rem 0;
    }

    /* ── Mode paiement pills ── */
    .mode-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        background: var(--meiji-surface);
        border: 1px solid var(--meiji-border);
        border-radius: 20px;
        padding: 0.4rem 0.8rem;
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--meiji-text);
    }

    /* ── Tabs styling ── */
    .stTabs [data-baseweb="tab-list"] {
        gap: 0;
        background: var(--meiji-surface);
        border-radius: 12px;
        padding: 4px;
        border: 1px solid var(--meiji-border);
    }
    .stTabs [data-baseweb="tab"] {
        border-radius: 10px;
        padding: 8px 20px;
        font-weight: 600;
        font-size: 0.85rem;
    }
    .stTabs [aria-selected="true"] {
        background: var(--meiji-dark) !important;
        color: white !important;
        border-radius: 10px;
    }
</style>
""", unsafe_allow_html=True)

# ─── Constantes ───────────────────────────────────────────────────────────────
CAISSES = {
    "🍣 Sushi": "sushi",
    "🍸 Bar": "bar",
    "💨 Chicha": "chicha",
}
MODES = ["Espèces", "Mobile Money (Moov/Airtel)", "Chèque", "Virement"]

def fmt(val: float) -> str:
    """Formate un montant en FCFA avec séparateur de milliers."""
    return f"{val:,.0f}".replace(",", " ") + " FCFA"

# ─── Initialisation session state ────────────────────────────────────────────
if "submitted" not in st.session_state:
    st.session_state.submitted = False

# ─── En-tête ─────────────────────────────────────────────────────────────────
today_str = date.today().strftime("%A %d %B %Y").capitalize()
st.markdown(f"""
<div class="meiji-header">
    <div class="meiji-header-left">
        <div style="font-size:2.2rem">🍣</div>
        <div>
            <h1>MEIJI</h1>
            <p class="subtitle">Tableau de bord · Restaurant</p>
        </div>
    </div>
    <div class="header-date">📅 {today_str}</div>
</div>
""", unsafe_allow_html=True)

# ─── TABLEAU DE BORD — TABS PRINCIPAUX ────────────────────────────────────────
tab_saisie, tab_dashboard = st.tabs(["📝 Saisie des recettes", "📊 Tableau de bord"])

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1 — SAISIE DES RECETTES
# ═══════════════════════════════════════════════════════════════════════════════
with tab_saisie:
    with st.form("saisie_recettes"):
        # Date + Fond de caisse
        col_date, col_fond, col_spacer = st.columns([1, 1, 2])
        with col_date:
            jour = st.date_input(
                "📅 Date de la journée",
                value=date.today(),
                format="DD/MM/YYYY",
            )
        with col_fond:
            fond_de_caisse = st.number_input(
                "💵 Fond de caisse (espèces début de journée)",
                min_value=0.0,
                step=1000.0,
                value=0.0,
                format="%.0f",
                help="Montant en espèces disponible au début de la journée",
            )

        st.markdown("---")
        st.markdown("### 💰 Saisie des recettes par caisse")

        saisies: dict[str, dict[str, float]] = {}
        cols = st.columns(3)
        caisse_keys = list(CAISSES.values())
        caisse_labels = list(CAISSES.keys())

        for idx, col in enumerate(cols):
            key = caisse_keys[idx]
            label = caisse_labels[idx]
            saisies[key] = {}
            with col:
                st.markdown(f"""
                <div class="caisse-header">
                    <span class="icon">{label.split(' ')[0]}</span>
                    <span class="name">{label.split(' ')[1]}</span>
                </div>
                """, unsafe_allow_html=True)
                for mode in MODES:
                    field_key = f"{key}_{mode}"
                    val = st.number_input(
                        label=mode,
                        min_value=0.0,
                        step=500.0,
                        value=0.0,
                        key=field_key,
                        format="%.0f",
                        help=f"Montant reçu en {mode} pour la caisse {label}",
                    )
                    saisies[key][mode] = val

        # ── Dépenses espèces de la journée ──
        st.markdown("---")
        st.markdown("### 🧾 Dépenses en espèces de la journée")
        st.caption("Saisissez les sorties de caisse (achats fournisseurs, frais divers…)")
        
        dep_cols = st.columns(3)
        depenses = {}
        depense_labels = [
            ("Achats fournisseurs", "achats"),
            ("Transport / Livraison", "transport"),
            ("Frais divers", "divers"),
        ]
        for i, (dep_label, dep_key) in enumerate(depense_labels):
            with dep_cols[i]:
                depenses[dep_key] = st.number_input(
                    label=dep_label,
                    min_value=0.0,
                    step=500.0,
                    value=0.0,
                    key=f"dep_{dep_key}",
                    format="%.0f",
                )

        st.markdown("---")
        submitted = st.form_submit_button(
            "✅ Calculer & Afficher le tableau de bord",
            use_container_width=True,
            type="primary",
        )

    if submitted:
        st.session_state.submitted = True
        st.session_state.saisies = saisies
        st.session_state.jour = jour
        st.session_state.fond_de_caisse = fond_de_caisse
        st.session_state.depenses = depenses
        st.info("✅ Données enregistrées ! Allez sur l'onglet **📊 Tableau de bord** pour voir les résultats.")

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 2 — TABLEAU DE BORD
# ═══════════════════════════════════════════════════════════════════════════════
with tab_dashboard:
    if not st.session_state.submitted:
        st.markdown("""
        <div style="text-align: center; padding: 4rem 2rem; color: #94a3b8;">
            <div style="font-size: 4rem; margin-bottom: 1rem;">📊</div>
            <h3 style="color: #64748b;">Aucune donnée saisie</h3>
            <p>Remplissez le formulaire dans l'onglet <strong>📝 Saisie des recettes</strong> pour voir votre tableau de bord.</p>
        </div>
        """, unsafe_allow_html=True)
    else:
        saisies = st.session_state.saisies
        jour = st.session_state.jour
        fond_de_caisse = st.session_state.fond_de_caisse
        depenses = st.session_state.depenses

        # ── Calculs ──
        totaux_par_caisse: dict[str, float] = {}
        totaux_par_mode: dict[str, float] = {m: 0.0 for m in MODES}
        ca_total = 0.0

        for key in caisse_keys:
            total_caisse = sum(saisies[key].values())
            totaux_par_caisse[key] = total_caisse
            ca_total += total_caisse
            for mode in MODES:
                totaux_par_mode[mode] += saisies[key][mode]

        total_depenses = sum(depenses.values())
        total_especes_recues = totaux_par_mode.get("Espèces", 0.0)
        solde_especes = fond_de_caisse + total_especes_recues - total_depenses
        total_digital = ca_total - total_especes_recues
        pct_especes = (total_especes_recues / ca_total * 100) if ca_total > 0 else 0
        pct_digital = (total_digital / ca_total * 100) if ca_total > 0 else 0

        # ══════════════════════════════════════════════════════════════════════
        # SECTION 1 — KPI Cards
        # ══════════════════════════════════════════════════════════════════════
        caisse_icons = {"sushi": "🍣", "bar": "🍸", "chicha": "💨"}
        caisse_classes = {"sushi": "sushi", "bar": "bar", "chicha": "chicha"}

        kpi_html = '<div class="kpi-grid">'
        for key in caisse_keys:
            icon = caisse_icons[key]
            cls = caisse_classes[key]
            val = totaux_par_caisse[key]
            pct = (val / ca_total * 100) if ca_total > 0 else 0
            kpi_html += f"""
            <div class="kpi-card {cls}">
                <div class="kpi-icon">{icon}</div>
                <div class="kpi-label">Caisse {key.capitalize()}</div>
                <div class="kpi-value">{fmt(val)}</div>
                <div class="kpi-sub">{pct:.1f}% du CA total</div>
            </div>
            """
        kpi_html += f"""
        <div class="kpi-card total">
            <div class="kpi-icon">🏆</div>
            <div class="kpi-label">CA Total Journée</div>
            <div class="kpi-value">{fmt(ca_total)}</div>
            <div class="kpi-sub">{jour.strftime('%d/%m/%Y')}</div>
        </div>
        """
        kpi_html += '</div>'
        st.markdown(kpi_html, unsafe_allow_html=True)

        # ══════════════════════════════════════════════════════════════════════
        # SECTION 2 — Tableau récapitulatif
        # ══════════════════════════════════════════════════════════════════════
        st.markdown(f"#### 📋 Récapitulatif détaillé — {jour.strftime('%d/%m/%Y')}")

        table_html = '<div class="recap-container"><table>'
        table_html += '<tr><th>Mode de paiement</th>'
        for label in caisse_labels:
            table_html += f'<th>{label}</th>'
        table_html += '<th>TOTAL</th></tr>'

        for mode in MODES:
            table_html += f'<tr><td>{mode}</td>'
            total_mode = 0
            for key in caisse_keys:
                val = saisies[key][mode]
                total_mode += val
                cell = fmt(val) if val > 0 else "—"
                table_html += f'<td>{cell}</td>'
            table_html += f'<td>{fmt(total_mode)}</td></tr>'

        # Ligne totaux
        table_html += '<tr><td>TOTAL CAISSE</td>'
        for key in caisse_keys:
            table_html += f'<td>{fmt(totaux_par_caisse[key])}</td>'
        table_html += f'<td>{fmt(ca_total)}</td></tr>'

        table_html += '</table></div>'
        st.markdown(table_html, unsafe_allow_html=True)

        # ══════════════════════════════════════════════════════════════════════
        # SECTION 3 — Répartition par mode de paiement
        # ══════════════════════════════════════════════════════════════════════
        st.markdown("#### 📊 Répartition par mode de paiement")
        mode_cols = st.columns(len(MODES))
        mode_icons = {"Espèces": "💵", "Mobile Money (Moov/Airtel)": "📱", "Chèque": "📄", "Virement": "🏦"}
        for i, mode in enumerate(MODES):
            with mode_cols[i]:
                pct = (totaux_par_mode[mode] / ca_total * 100) if ca_total > 0 else 0
                icon = mode_icons.get(mode, "💰")
                st.metric(
                    label=f"{icon} {mode.split(' ')[0]}",
                    value=fmt(totaux_par_mode[mode]),
                    delta=f"{pct:.1f}% du CA",
                )

        # ══════════════════════════════════════════════════════════════════════
        # SECTION 4 — ONGLET JOURNÉE (récap + solde espèces)
        # ══════════════════════════════════════════════════════════════════════
        st.markdown(f"""
        <div class="journee-panel">
            <div class="journee-header">
                <h3>📅 Récapitulatif de la Journée — {jour.strftime('%d/%m/%Y')}</h3>
                <span style="opacity:0.6; font-size:0.8rem;">{jour.strftime('%A').upper()}</span>
            </div>
            <div class="journee-body">
                <!-- Ligne 1 : CA par caisse -->
                <div style="font-size:0.75rem; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; font-weight:600; margin-bottom:0.5rem;">
                    Chiffre d'affaires par caisse
                </div>
                <div class="journee-grid">
                    <div class="journee-item">
                        <div class="label">🍣 Caisse Sushi</div>
                        <div class="value">{fmt(totaux_par_caisse.get('sushi', 0))}</div>
                    </div>
                    <div class="journee-item">
                        <div class="label">🍸 Caisse Bar</div>
                        <div class="value">{fmt(totaux_par_caisse.get('bar', 0))}</div>
                    </div>
                    <div class="journee-item">
                        <div class="label">💨 Caisse Chicha</div>
                        <div class="value">{fmt(totaux_par_caisse.get('chicha', 0))}</div>
                    </div>
                </div>
                
                <!-- Ligne 2 : Mouvements espèces -->
                <div style="font-size:0.75rem; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; font-weight:600; margin-bottom:0.5rem;">
                    Mouvements espèces de la journée
                </div>
                <div class="journee-grid">
                    <div class="journee-item highlight">
                        <div class="label">💵 Fond de caisse (début)</div>
                        <div class="value">{fmt(fond_de_caisse)}</div>
                    </div>
                    <div class="journee-item highlight">
                        <div class="label">📥 Espèces reçues (recettes)</div>
                        <div class="value">+ {fmt(total_especes_recues)}</div>
                    </div>
                    <div class="journee-item {"warning" if total_depenses > 0 else ""}">
                        <div class="label">📤 Dépenses espèces (sorties)</div>
                        <div class="value">- {fmt(total_depenses)}</div>
                    </div>
                </div>

                <!-- Détail dépenses si > 0 -->
                {"" if total_depenses == 0 else f'''
                <div style="font-size:0.75rem; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; font-weight:600; margin-bottom:0.5rem;">
                    Détail des dépenses
                </div>
                <div class="journee-grid">
                    <div class="journee-item">
                        <div class="label">🛒 Achats fournisseurs</div>
                        <div class="value">{fmt(depenses.get("achats", 0))}</div>
                    </div>
                    <div class="journee-item">
                        <div class="label">🚗 Transport / Livraison</div>
                        <div class="value">{fmt(depenses.get("transport", 0))}</div>
                    </div>
                    <div class="journee-item">
                        <div class="label">📎 Frais divers</div>
                        <div class="value">{fmt(depenses.get("divers", 0))}</div>
                    </div>
                </div>
                '''}

                <!-- Ligne 3 : Autres modes -->
                <div style="font-size:0.75rem; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; font-weight:600; margin-bottom:0.5rem;">
                    Recettes par autres modes
                </div>
                <div class="journee-grid">
                    <div class="journee-item">
                        <div class="label">📱 Mobile Money</div>
                        <div class="value">{fmt(totaux_par_mode.get("Mobile Money (Moov/Airtel)", 0))}</div>
                    </div>
                    <div class="journee-item">
                        <div class="label">📄 Chèques</div>
                        <div class="value">{fmt(totaux_par_mode.get("Chèque", 0))}</div>
                    </div>
                    <div class="journee-item">
                        <div class="label">🏦 Virements</div>
                        <div class="value">{fmt(totaux_par_mode.get("Virement", 0))}</div>
                    </div>
                </div>
            </div>
        </div>
        """, unsafe_allow_html=True)

        # ── Répartition Espèces vs Digital ──
        st.markdown(f"""
        <div style="background:white; border:1px solid var(--meiji-border); border-radius:14px; padding:1.2rem 1.5rem; margin-top:1rem;">
            <div style="font-size:0.75rem; color:#94a3b8; text-transform:uppercase; letter-spacing:1px; font-weight:600; margin-bottom:0.8rem;">
                Répartition Espèces vs Digital
            </div>
            <div style="display:flex; height:14px; border-radius:8px; overflow:hidden; background:#f1f5f9;">
                <div style="width:{pct_especes}%; background:linear-gradient(90deg,#10b981,#059669);"></div>
                <div style="width:{pct_digital}%; background:linear-gradient(90deg,#2563eb,#1e3a5f);"></div>
            </div>
            <div style="display:flex; justify-content:space-between; margin-top:0.6rem; font-size:0.85rem; font-weight:600; color:var(--meiji-text);">
                <span>💵 Espèces : {fmt(total_especes_recues)} ({pct_especes:.1f}%)</span>
                <span>💳 Digital : {fmt(total_digital)} ({pct_digital:.1f}%)</span>
            </div>
        </div>
        """, unsafe_allow_html=True)

        # ── SOLDE ESPÈCES — Le badge principal ──
        solde_class = "negatif" if solde_especes < 0 else ""
        solde_icon = "✅" if solde_especes >= 0 else "⚠️"
        st.markdown(f"""
        <div class="solde-badge {solde_class}">
            <div class="solde-label">{solde_icon} Solde espèces en caisse — fin de journée</div>
            <div class="solde-amount">{fmt(solde_especes)}</div>
            <div class="solde-detail">
                Fond de caisse {fmt(fond_de_caisse)} + Espèces reçues {fmt(total_especes_recues)} − Dépenses {fmt(total_depenses)}
            </div>
        </div>
        """, unsafe_allow_html=True)

        # ── CA Total ──
        st.markdown(f"""
        <div class="total-badge">
            <div class="label">Chiffre d'affaires journalier total (tous modes)</div>
            <div class="amount">{fmt(ca_total)}</div>
            <div class="label">{jour.strftime('%A %d %B %Y').upper()}</div>
        </div>
        """, unsafe_allow_html=True)

        # ── Export CSV ──
        st.markdown("<br>", unsafe_allow_html=True)

        # Construire le DataFrame pour export
        rows = []
        for mode in MODES:
            row = {"Mode de paiement": mode}
            for key, label in zip(caisse_keys, caisse_labels):
                row[label] = saisies[key][mode]
            row["TOTAL MODE"] = totaux_par_mode[mode]
            rows.append(row)
        total_row = {"Mode de paiement": "TOTAL CAISSE"}
        for key, label in zip(caisse_keys, caisse_labels):
            total_row[label] = totaux_par_caisse[key]
        total_row["TOTAL MODE"] = ca_total
        rows.append(total_row)
        # Lignes supplémentaires pour le résumé espèces
        rows.append({"Mode de paiement": "---", **{l: "" for l in caisse_labels}, "TOTAL MODE": ""})
        rows.append({"Mode de paiement": "Fond de caisse", **{l: "" for l in caisse_labels}, "TOTAL MODE": fond_de_caisse})
        rows.append({"Mode de paiement": "Total dépenses espèces", **{l: "" for l in caisse_labels}, "TOTAL MODE": total_depenses})
        rows.append({"Mode de paiement": "SOLDE ESPÈCES FIN DE JOURNÉE", **{l: "" for l in caisse_labels}, "TOTAL MODE": solde_especes})

        df = pd.DataFrame(rows).set_index("Mode de paiement")
        df.insert(0, "Date", jour.strftime("%d/%m/%Y"))
        csv_bytes = df.to_csv(encoding="utf-8-sig").encode("utf-8-sig")

        st.download_button(
            label="⬇️ Télécharger le récapitulatif complet (CSV)",
            data=csv_bytes,
            file_name=f"meiji_journee_{jour.strftime('%Y%m%d')}.csv",
            mime="text/csv",
            use_container_width=True,
        )

# ─── Pied de page ─────────────────────────────────────────────────────────────
st.markdown("---")
st.markdown(
    "<p style='text-align:center; color:#94a3b8; font-size:0.78rem;'>"
    "🍣 Restaurant Meiji · Tableau de bord v2.0 · Gestion des recettes & suivi espèces"
    "</p>",
    unsafe_allow_html=True,
)
