import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { buildTree } from "@/lib/structure";
import type { StructureLine } from "@/lib/types";
import { StructureTree } from "@/components/structure/StructureTree";
import { UserRolesPanel } from "@/components/structure/UserRolesPanel";
import { PurgeZone } from "@/components/budgets/PurgeZone";
import { GuideLink } from "@/components/GuideLink";
import { getRole } from "@/lib/auth/role";
import { can } from "@/lib/roles";
import { listUsersWithRoles } from "./users-actions";

export const dynamic = "force-dynamic";

export default async function StructurePage() {
  if (!isSupabaseConfigured()) {
    return (
      <div>
        <h1 className="mb-2 text-xl font-bold text-brand-night">Configuration</h1>
        <p className="rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Supabase n&apos;est pas encore configuré. Renseignez{" "}
          <code>.env.local</code> puis appliquez les migrations et le seed.
        </p>
      </div>
    );
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("structure_lines")
    .select("*")
    .eq("active", true)
    .order("sort_order");

  const tree = buildTree((data ?? []) as StructureLine[]);

  // F12.8 — panneau de gestion des comptes (direction uniquement).
  const role = await getRole(supabase);
  const canManageUsers = can(role, "manage_roles");
  const canPurge = can(role, "purge");
  const usersRes = canManageUsers ? await listUsersWithRoles() : null;

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <h1 className="text-xl font-bold text-brand-night">Configuration</h1>
        <GuideLink anchor="la-structure-budgetaire" />
      </div>
      <p className="mb-4 text-sm text-slate-500">
        Structure budgétaire unique, partagée par tous les budgets (P2). Seul le
        niveau 3 porte des montants.
      </p>
      <StructureTree tree={tree} />
      {canManageUsers && (
        <UserRolesPanel
          users={usersRes?.ok ? usersRes.users : []}
          loadError={usersRes && !usersRes.ok ? usersRes.error : undefined}
        />
      )}
      {canPurge && <PurgeZone />}
    </div>
  );
}
