import { PageHeader } from "@/components/layout/PageHeader";
import { OpportunityMapScreenLoader } from "@/components/opportunities/OpportunityMapScreenLoader";

// TEMPORAL copy: lib/copy.ts has no `copy.opportunities` yet (it is read-only for this task).
// T05 owns lib/copy.ts and will move these strings there.
const TITLE = "Mapa de demanda por sucursal";
const SUBTITLE = "Demanda pronosticada, cobertura de inventario y stock sugerido para cada sucursal.";

export const instant = false;

export default function OpportunitiesPage() {
  return (
    <>
      <PageHeader title={TITLE} subtitle={SUBTITLE} />
      <OpportunityMapScreenLoader />
    </>
  );
}
