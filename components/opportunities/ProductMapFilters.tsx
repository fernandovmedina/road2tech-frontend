import { Search, SlidersHorizontal } from "lucide-react";
import type { Product } from "@/types/product";

type ProductMapFiltersProps = {
  products: readonly Product[];
  categories: readonly string[];
  tags: readonly string[];
  selectedProductId: string;
  category: string;
  tag: string;
  search: string;
  onProductChange: (productId: string) => void;
  onCategoryChange: (category: string) => void;
  onTagChange: (tag: string) => void;
  onSearchChange: (search: string) => void;
};

const selectClass =
  "h-10 rounded-lg border border-ink/10 bg-surface px-3 text-sm text-ink shadow-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15";

export function ProductMapFilters({
  products,
  categories,
  tags,
  selectedProductId,
  category,
  tag,
  search,
  onProductChange,
  onCategoryChange,
  onTagChange,
  onSearchChange,
}: ProductMapFiltersProps) {
  return (
    <section
      aria-label="Product and demand filters"
      className="grid gap-3 rounded-xl border border-ink/10 bg-surface p-3 shadow-[0_1px_2px_rgba(11,11,11,0.04)] md:grid-cols-[minmax(13rem,1fr)_minmax(12rem,1fr)_minmax(10rem,.75fr)_minmax(10rem,.75fr)]"
    >
      <label className="relative block">
        <span className="sr-only">Search products</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search 120 products"
          className={`${selectClass} w-full pl-9`}
        />
      </label>
      <label className="flex min-w-0 items-center gap-2">
        <span className="sr-only">Product</span>
        <select
          value={selectedProductId}
          onChange={(event) => onProductChange(event.target.value)}
          className={`${selectClass} min-w-0 flex-1`}
        >
          <option value="all">All products</option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>{product.name}</option>
          ))}
        </select>
      </label>
      <label className="flex min-w-0 items-center gap-2">
        <SlidersHorizontal className="size-4 shrink-0 text-ink-muted" aria-hidden />
        <span className="sr-only">Category</span>
        <select value={category} onChange={(event) => onCategoryChange(event.target.value)} className={`${selectClass} min-w-0 flex-1`}>
          <option value="all">All categories</option>
          {categories.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
      <label>
        <span className="sr-only">Demand driver</span>
        <select value={tag} onChange={(event) => onTagChange(event.target.value)} className={`${selectClass} w-full`}>
          <option value="all">All demand drivers</option>
          {tags.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </label>
    </section>
  );
}
