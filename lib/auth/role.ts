// U1 — Lecture du rôle de l'utilisateur courant + garde pour server actions.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Role } from "@/lib/types";
import { can, isRole, type AppAction } from "@/lib/roles";

// Rôle de l'utilisateur connecté. 'lecteur' si aucun rôle attribué.
// Back-compat : si la table user_roles n'existe pas encore (migration 0006
// non appliquée), on retourne 'admin' (comportement mono-utilisateur historique).
export async function getRole(supabase: SupabaseClient): Promise<Role> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (!uid) return "lecteur";
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .maybeSingle();
  if (error) return "admin"; // table absente (pré-0006) → mono-user historique
  const role = data?.role;
  return isRole(role) ? role : "lecteur";
}

// Garde d'action serveur : retourne null si autorisé, message d'erreur sinon.
export async function denyUnless(
  supabase: SupabaseClient,
  action: AppAction,
): Promise<string | null> {
  const role = await getRole(supabase);
  if (can(role, action)) return null;
  return `Accès refusé : votre rôle (${role}) ne permet pas cette action.`;
}
