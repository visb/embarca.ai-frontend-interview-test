import { ClearFiltersLink } from "@/features/search/components/ClearFiltersLink";
import { SearchInput } from "@/features/search/components/SearchInput";
import { TypeFilter } from "@/features/search/components/TypeFilter";
import { getFilterTypes } from "@/features/search/data";

/** Agrupa os controles da listagem. Empilha no mobile, alinha na base no desktop. */
export async function FilterBar() {
  const types = await getFilterTypes();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
      <SearchInput />
      <TypeFilter types={types} />
      <ClearFiltersLink />
    </div>
  );
}
