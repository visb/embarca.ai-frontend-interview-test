import { ClearFiltersLink } from "@/components/search/ClearFiltersLink";
import { SearchInput } from "@/components/search/SearchInput";
import { TypeFilter } from "@/components/search/TypeFilter";
import { getTypes } from "@/lib/api/pokemon";

/** Agrupa os controles da listagem. Empilha no mobile, alinha na base no desktop. */
export async function FilterBar() {
  const types = await getTypes();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <SearchInput />
      <TypeFilter types={types} />
      <ClearFiltersLink />
    </div>
  );
}
