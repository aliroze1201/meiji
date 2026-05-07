import streamlit as st
import pandas as pd
from datetime import date

# ─── Configuration de la page ───────────────────────────────────────────────
st.set_page_config(
    page_title="Meiji – Recettes Journalières",
    page_icon="🍣",
    layout="wide",
)

# ─── CSS personnalisé ────────────────────────────────────────────────────────
st.markdown("""
<style>
    /* En-tête principal */
    .meiji-header {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
        color: white;
        padding: 1.5rem 2rem;
        border-radius: 12px;
        margin-bottom: 1.5rem;
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    .meiji-header h1 { margin: 0; font-size: 1.8rem; letter-spacing: 2px; }
    .meiji-header p  { margin: 0; opacity: 0.7; font-size: 0.9rem; }

    /* Cartes caisse */
    .caisse-card {
        background: #ffffff;
        border: 1px solid #e8ecf0;
        border-radius: 10px;
        padding: 1rem 1.2rem;
        margin-bottom: 0.5rem;
    }
    .caisse-title {
        font-size: 1rem;
        font-weight: 700;
        margin-bottom: 0.3rem;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    /* Tableau récapitulatif */
    .recap-table th {
        background: #1a1a2e !important;
        color: white !important;
        text-align: center;
        padding: 8px 12px;
    }
    .recap-table td {
        text-align: right;
        padding: 6px 12px;
        border-bottom: 1px solid #f0f0f0;
    }
    .total-row td { font-weight: 700; background: #f8f9fa; }

    /* Badge total journalier */
    .total-badge {
        background: linear-gradient(135deg, #1a1a2e, #0f3460);
        color: white;
        padding: 1.2rem 2rem;
        border-radius: 12px;
        text-align: center;
        margin-top: 1rem;
    }
    .total-badge .amount {
        font-size: 2rem;
        font-weight: 800;
        letter-spacing: 1px;
    }
    .total-badge .label { opacity: 0.7; font-size: 0.85rem; margin-top: 0.3rem; }

    /* Séparateur caisse */
    .caisse-sep { border: none; border-top: 2px dashed #e0e0e0; margin: 1rem 0; }

    /* Metric mini */
    .mini-metric {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 0.6rem 1rem;
        text-align: center;
    }
    .mini-metric .val { font-size: 1.1rem; font-weight: 700; }
    .mini-metric .lbl { font-size: 0.75rem; color: #888; }
</style>
""", unsafe_allow_html=True)

# ─── En-tête ─────────────────────────────────────────────────────────────────
st.markdown("""
<div class="meiji-header">
    <div style="font-size:2.5rem">🍣</div>
    <div>
        <h1>RESTAURANT MEIJI</h1>
        <p>Gestion des recettes journalières · Devise : FCFA</p>
    </div>
</div>
""", unsafe_allow_html=True)

# ─── Constantes ───────────────────────────────────────────────────────────────
CAISSES = {
    "🍣 Sushi":  "sushi",
    "🍸 Bar":    "bar",
    "💨 Chicha": "chicha",
}
MODES = ["Espèces", "Mobile Money (Moov/Airtel)", "Chèque", "Virement"]

def fmt(val: float) -> str:
    """Formate un montant en FCFA avec séparateur de milliers."""
    return f"{val:,.0f}".replace(",", " ") + " FCFA"

# ─── Initialisation session state ────────────────────────────────────────────
if "submitted" not in st.session_state:
    st.session_state.submitted = False

# ─── Formulaire de saisie ────────────────────────────────────────────────────
with st.form("saisie_recettes"):

    # -- Date --
    col_date, col_spacer = st.columns([1, 3])
    with col_date:
        jour = st.date_input("📅 Date de la journée", value=date.today(), format="DD/MM/YYYY")

    st.markdown("---")
    st.markdown("### 💰 Saisie des recettes par caisse")

    saisies: dict[str, dict[str, float]] = {}

    cols = st.columns(3)
    icons = ["🍣", "🍸", "💨"]
    caisse_keys = list(CAISSES.values())
    caisse_labels = list(CAISSES.keys())

    for idx, col in enumerate(cols):
        key = caisse_keys[idx]
        label = caisse_labels[idx]
        saisies[key] = {}

        with col:
            st.markdown(f"**{label}**")
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

    st.markdown("---")
    submitted = st.form_submit_button(
        "✅ Calculer & Afficher le récapitulatif",
        use_container_width=True,
        type="primary",
    )
    if submitted:
        st.session_state.submitted = True
        st.session_state.saisies = saisies
        st.session_state.jour = jour

# ─── Récapitulatif ───────────────────────────────────────────────────────────
if st.session_state.submitted:
    saisies = st.session_state.saisies
    jour    = st.session_state.jour

    st.markdown("---")
    st.markdown(f"## 📋 Récapitulatif — Journée du {jour.strftime('%d/%m/%Y')}")

    # Calculs
    totaux_par_caisse: dict[str, float] = {}
    totaux_par_mode:   dict[str, float] = {m: 0.0 for m in MODES}
    ca_total = 0.0

    for key in caisse_keys:
        total_caisse = sum(saisies[key].values())
        totaux_par_caisse[key] = total_caisse
        ca_total += total_caisse
        for mode in MODES:
            totaux_par_mode[mode] += saisies[key][mode]

    # ── Mini KPIs ──
    kpi_cols = st.columns(4)
    caisse_map = dict(zip(caisse_keys, caisse_labels))
    kpi_items = [(caisse_map[k], totaux_par_caisse[k]) for k in caisse_keys] + \
                [("🏆 CA Total", ca_total)]

    for i, (lbl, val) in enumerate(kpi_items):
        col = kpi_cols[i] if i < 3 else kpi_cols[3]
        with col:
            st.metric(label=lbl, value=fmt(val))

    st.markdown(" ")

    # ── Tableau récapitulatif ──
    rows = []
    for mode in MODES:
        row = {"Mode de paiement": mode}
        for key, label in zip(caisse_keys, caisse_labels):
            row[label] = saisies[key][mode]
        row["TOTAL MODE"] = totaux_par_mode[mode]
        rows.append(row)

    # Ligne totaux par caisse
    total_row = {"Mode de paiement": "TOTAL CAISSE"}
    for key, label in zip(caisse_keys, caisse_labels):
        total_row[label] = totaux_par_caisse[key]
    total_row["TOTAL MODE"] = ca_total
    rows.append(total_row)

    df = pd.DataFrame(rows).set_index("Mode de paiement")

    # Colonnes affichage
    col_display = {label: label for label in caisse_labels}
    col_display["TOTAL MODE"] = "TOTAL"

    def style_df(df):
        styled = df.copy()
        return styled

    # Formatage
    df_display = df.copy()
    for col in df_display.columns:
        df_display[col] = df_display[col].apply(
            lambda x: f"{x:,.0f}".replace(",", " ") if x > 0 else "—"
        )

    # Style Pandas
    def highlight_total(row):
        if row.name == "TOTAL CAISSE":
            return ["background-color: #1a1a2e; color: white; font-weight: bold;"] * len(row)
        return [""] * len(row)

    def highlight_total_col(col):
        if col.name == "TOTAL MODE":
            return ["background-color: #f0f4ff; font-weight: 600;"] * len(col)
        return [""] * len(col)

    styled = (
        df_display.style
        .apply(highlight_total, axis=1)
        .apply(highlight_total_col, axis=0)
        .set_properties(**{
            "text-align": "right",
            "padding": "8px 16px",
            "font-size": "14px",
        })
        .set_table_styles([
            {"selector": "th", "props": [
                ("background-color", "#1a1a2e"),
                ("color", "white"),
                ("text-align", "center"),
                ("padding", "10px 16px"),
                ("font-size", "14px"),
            ]},
            {"selector": "th.row_heading", "props": [
                ("text-align", "left"),
            ]},
            {"selector": "td.col_heading", "props": [
                ("text-align", "center"),
            ]},
            {"selector": "tr:hover td", "props": [
                ("background-color", "#f5f7ff"),
            ]},
        ])
    )

    st.dataframe(styled, use_container_width=True, height=230)

    # ── Badge CA Total ──
    st.markdown(f"""
    <div class="total-badge">
        <div class="label">CHIFFRE D'AFFAIRES JOURNALIER TOTAL</div>
        <div class="amount">{fmt(ca_total)}</div>
        <div class="label">Journée du {jour.strftime('%A %d %B %Y').upper()}</div>
    </div>
    """, unsafe_allow_html=True)

    # ── Détail par mode de paiement ──
    st.markdown(" ")
    st.markdown("#### 📊 Répartition par mode de paiement")
    mode_cols = st.columns(len(MODES))
    for i, mode in enumerate(MODES):
        with mode_cols[i]:
            pct = (totaux_par_mode[mode] / ca_total * 100) if ca_total > 0 else 0
            st.metric(
                label=mode.split(" ")[0],
                value=fmt(totaux_par_mode[mode]),
                delta=f"{pct:.1f}% du CA",
            )

    # ── Export CSV ──
    st.markdown(" ")
    csv_df = df.copy()
    csv_df.insert(0, "Date", jour.strftime("%d/%m/%Y"))
    csv_bytes = csv_df.to_csv(encoding="utf-8-sig").encode("utf-8-sig")

    st.download_button(
        label="⬇️ Télécharger le récapitulatif (CSV)",
        data=csv_bytes,
        file_name=f"meiji_recettes_{jour.strftime('%Y%m%d')}.csv",
        mime="text/csv",
        use_container_width=True,
    )

# ─── Pied de page ─────────────────────────────────────────────────────────────
st.markdown("---")
st.markdown(
    "<p style='text-align:center; color:#aaa; font-size:0.8rem;'>"
    "🍣 Restaurant Meiji · Application de comptabilité · Étape 1 – Recettes journalières"
    "</p>",
    unsafe_allow_html=True,
)
