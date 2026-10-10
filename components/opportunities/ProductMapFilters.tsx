import { SearchField } from "@/components/ui/SearchField";
import { Select } from "@/components/ui/Select";
import { copy } from "@/lib/copy";
import type { Product } from "@/types/product";

type FilterOption = { value: string; label: string };

type ProductMapFiltersProps = {
  products: readonly Product[];
  categories: readonly FilterOption[];
  tags: readonly FilterOption[];
  selectedProductId: string;
  category: string;
  tag: string;
  onProductChange: (productId: string) => void;
  onCategoryChange: (category: string) => void;
  onTagChange: (tag: string) => void;
  onSearchChange: (search: string) => void;
};

export function ProductMapFilters({
  products,
  categories,
  tags,
  selectedProductId,
  category,
  tag,
  onProductChange,
  onCategoryChange,
  onTagChange,
  onSearchChange,
}: ProductMapFiltersProps) {
  return (
    <section
      aria-label={copy.opportunities.filters.label}
      className="grid gap-3 rounded-card border border-line bg-card p-3 shadow-card md:grid-cols-[minmax(13rem,1fr)_minmax(12rem,1fr)_minmax(10rem,.75fr)_minmax(10rem,.75fr)]"
    >
      <SearchField
        id="product-search"
        label={copy.opportunities.filters.search}
        placeholder={copy.opportunities.filters.searchPlaceholder}
        onSearch={onSearchChange}
      />
      <Select
        id="product-filter"
        label={copy.opportunities.filters.product}
        value={selectedProductId}
        onChange={(event) => onProductChange(event.target.value)}
      >
        <option value="all">{copy.opportunities.filters.allProducts}</option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name}
          </option>
        ))}
      </Select>
      <Select
        id="category-filter"
        label={copy.opportunities.filters.category}
        value={category}
        onChange={(event) => onCategoryChange(event.target.value)}
      >
        <option value="all">{copy.opportunities.filters.allCategories}</option>
        {categories.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
      <Select
        id="tag-filter"
        label={copy.opportunities.filters.demandDriver}
        value={tag}
        onChange={(event) => onTagChange(event.target.value)}
      >
        <option value="all">{copy.opportunities.filters.allDemandDrivers}</option>
        {tags.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </section>
  );
}
