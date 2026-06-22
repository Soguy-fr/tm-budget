// C2 — Contrôles d'éligibilité bailleur. Purs, non bloquants (avertissements).
// 1. Dépense hors période de convention du bailleur.
// 2. LB non couverte par le mapping du bailleur (liste blanche).
// 3. Plafond conventionné dépassé (niveau bailleur, pas écriture).

export type EligibilityWarning = {
  code: "HORS_CONVENTION" | "LB_NON_MAPPEE" | "PLAFOND_DEPASSE";
  message: string;
};

export type BailleurEligibility = {
  code: string;
  convention_start: string | null; // ISO date
  convention_end: string | null;
  montant_conventionne: number | null;
};

// Avertissements au niveau d'une écriture GL allouée à un bailleur.
export function checkEntryEligibility(
  entry: { entry_date: string; entry_type: "Dépense" | "Recette"; line_id: string | null },
  bailleur: BailleurEligibility | null,
  mappedLineIds: ReadonlySet<string> | null, // null = pas de mapping défini → pas de contrôle
): EligibilityWarning[] {
  const out: EligibilityWarning[] = [];
  if (!bailleur) return out;

  // 1. Hors période de convention (dépenses ET recettes).
  if (
    (bailleur.convention_start && entry.entry_date < bailleur.convention_start) ||
    (bailleur.convention_end && entry.entry_date > bailleur.convention_end)
  ) {
    out.push({
      code: "HORS_CONVENTION",
      message: `Hors convention ${bailleur.code} (${bailleur.convention_start ?? "?"} → ${bailleur.convention_end ?? "?"})`,
    });
  }

  // 2. LB non mappée chez ce bailleur (uniquement si un mapping existe).
  if (
    entry.entry_type === "Dépense" &&
    entry.line_id &&
    mappedLineIds &&
    mappedLineIds.size > 0 &&
    !mappedLineIds.has(entry.line_id)
  ) {
    out.push({
      code: "LB_NON_MAPPEE",
      message: `LB non couverte par le mapping du bailleur ${bailleur.code}`,
    });
  }

  return out;
}

// 3. Plafond contractuel : dépenses réalisées du bailleur vs montant conventionné.
export function checkPlafond(
  bailleur: BailleurEligibility,
  depensesRealisees: number,
): EligibilityWarning | null {
  if (bailleur.montant_conventionne == null) return null;
  if (depensesRealisees <= bailleur.montant_conventionne) return null;
  const depassement = depensesRealisees - bailleur.montant_conventionne;
  return {
    code: "PLAFOND_DEPASSE",
    message: `Plafond conventionné ${bailleur.code} dépassé de ${depassement.toFixed(2)} €`,
  };
}
