import { useEffect, useMemo, useRef, useState } from "react";
import SiteNav from "../components/SiteNav";

const products = [
  {
    name: "Botanical Face Serum",
    copy: "Rosehip + Saffron Glow Blend",
    price: "Rs 899",
    image: "https://images.unsplash.com/photo-1577401239170-897942555fb3?auto=format&fit=crop&w=900&q=80",
    category: "Bath & Body"
  },
  {
    name: "Calm Soy Candle",
    copy: "Lavender + Cedarwood",
    price: "Rs 649",
    image: "https://images.unsplash.com/photo-1607602132700-0682583a8f87?auto=format&fit=crop&w=900&q=80",
    category: "Scented Candles"
  },
  {
    name: "Evening Herbal Tea",
    copy: "Chamomile + Tulsi Mix",
    price: "Rs 399",
    image: "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=900&q=80",
    category: "Gift Sets / Accessories"
  },
  {
    name: "Coffee Body Scrub",
    copy: "Arabica + Brown Sugar",
    price: "Rs 499",
    image: "https://images.unsplash.com/photo-1601049531096-8f8e98ff8f5b?auto=format&fit=crop&w=900&q=80",
    category: "Bath & Body"
  },
  {
    name: "Detox Clay Mask",
    copy: "Neem + Kaolin Therapy",
    price: "Rs 579",
    image: "https://images.unsplash.com/photo-1620912189866-5ec5345d5f0a?auto=format&fit=crop&w=900&q=80",
    category: "Herbal Soaps"
  },
  {
    name: "Aroma Oil Duo",
    copy: "Lemongrass + Bergamot",
    price: "Rs 799",
    image: "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=80",
    category: "Gift Sets / Accessories"
  }
];

const categories = [
  "All Products",
  "Herbal Soaps",
  "Scented Candles",
  "Bath & Body",
  "Gift Sets / Accessories"
];

const sortOptions = [
  { value: "popular", label: "Popular" },
  { value: "price-low-high", label: "Price: Low to High" },
  { value: "new-arrivals", label: "New Arrivals" }
];

const getNumericPrice = (priceText) => Number(priceText.replace(/[^0-9.]/g, "")) || 0;

export default function ShopPage() {
  const [activeCategory, setActiveCategory] = useState("All Products");
  const [sortBy, setSortBy] = useState("popular");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const sortDropdownRef = useRef(null);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
        setSortMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setSortMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const filteredProducts = useMemo(() => {
    if (activeCategory === "All Products") {
      return products;
    }
    return products.filter((product) => product.category === activeCategory);
  }, [activeCategory]);

  const sortedProducts = useMemo(() => {
    if (sortBy === "popular") {
      return filteredProducts;
    }

    const clonedProducts = [...filteredProducts];
    if (sortBy === "price-low-high") {
      return clonedProducts.sort((a, b) => getNumericPrice(a.price) - getNumericPrice(b.price));
    }

    return clonedProducts.reverse();
  }, [filteredProducts, sortBy]);

  const selectedSortOption = sortOptions.find((option) => option.value === sortBy) || sortOptions[0];

  return (
    <div className="pb-14">
      <SiteNav />
      <main className="mx-auto w-[min(1200px,94vw)] pt-6">
        <section className="grid items-start gap-5 lg:grid-cols-[268px_minmax(0,1fr)]">
          <aside className="glass-card rounded-3xl border border-white/70 bg-[#f8f3ea]/90 p-5 shadow-[0_16px_30px_rgba(31,61,43,0.08)] lg:sticky lg:top-28">
            <h2 className="font-display text-2xl font-semibold text-[#1f3d2b]">Categories</h2>
            <ul className="mt-4 hidden space-y-1.5 lg:block">
              {categories.map((category) => {
                const isActive = activeCategory === category;
                return (
                  <li key={category}>
                    <button
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      className={`w-full rounded-xl px-4 py-2.5 text-left text-sm font-semibold tracking-[0.02em] transition duration-300 ease-in-out ${
                        isActive
                          ? "bg-sage-700 text-white shadow-[0_10px_20px_rgba(31,61,43,0.22)]"
                          : "text-sage-800 hover:bg-white/75 hover:text-[#1f3d2b]"
                      }`}
                    >
                      {category}
                    </button>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 lg:hidden">
              <label htmlFor="category-filter" className="mb-2 block text-xs font-bold uppercase tracking-[0.22em] text-sage-700/80">
                Browse Category
              </label>
              <select
                id="category-filter"
                value={activeCategory}
                onChange={(event) => setActiveCategory(event.target.value)}
                className="w-full rounded-xl border border-sage-200/80 bg-white/90 px-3 py-2.5 text-sm font-semibold text-sage-800 shadow-sm outline-none transition focus:border-sage-400"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </aside>

          <section key={activeCategory} className="animate-fadeUp space-y-4 transition-all duration-300">
            <div className="relative z-40 flex flex-wrap items-center justify-between gap-2 overflow-visible rounded-2xl border border-white/65 bg-white/60 px-4 py-3 backdrop-blur-xl sm:px-5">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-sage-700/80">{activeCategory}</p>
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-sm font-semibold text-sage-700">{sortedProducts.length} products</p>
                <span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-sage-700/75">
                  Sort by
                </span>
                <div ref={sortDropdownRef} className="relative z-50 min-w-[190px] sm:min-w-[220px]">
                  <button
                    type="button"
                    onClick={() => setSortMenuOpen((open) => !open)}
                    className={`flex w-full items-center justify-between rounded-full border bg-[#f8f3ea]/95 px-3.5 py-2 text-xs font-semibold tracking-[0.03em] text-sage-800 shadow-sm transition duration-300 ${
                      sortMenuOpen
                        ? "border-sage-400 shadow-[0_12px_22px_rgba(31,61,43,0.12)]"
                        : "border-sage-200/80 hover:border-sage-300 hover:shadow-md"
                    }`}
                    aria-haspopup="listbox"
                    aria-expanded={sortMenuOpen}
                    aria-label="Sort products"
                  >
                    <span>{selectedSortOption.label}</span>
                    <svg
                      viewBox="0 0 20 20"
                      className={`h-4 w-4 text-sage-700 transition duration-300 ${sortMenuOpen ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m5 7 5 6 5-6" />
                    </svg>
                  </button>

                  <div
                    className={`absolute right-0 top-full z-[70] mt-2 w-full overflow-hidden rounded-2xl border border-sage-100/90 bg-[#f9f5ed]/98 p-1.5 shadow-[0_22px_45px_rgba(24,47,33,0.14)] backdrop-blur-xl transition-all duration-200 ease-out ${
                      sortMenuOpen ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
                    }`}
                  >
                    <ul className="space-y-1" role="listbox" aria-label="Sort by options">
                      {sortOptions.map((option) => {
                        const isSelected = option.value === sortBy;
                        return (
                          <li key={option.value}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => {
                                setSortBy(option.value);
                                setSortMenuOpen(false);
                              }}
                              className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium tracking-[0.02em] transition duration-200 ${
                                isSelected
                                  ? "bg-sage-700/10 text-[#1f3d2b]"
                                  : "text-sage-700 hover:bg-sage-700/8 hover:text-[#1f3d2b]"
                              }`}
                            >
                              <span>{option.label}</span>
                              <span className={`transition ${isSelected ? "opacity-100" : "opacity-0"}`} aria-hidden="true">
                                <svg
                                  viewBox="0 0 20 20"
                                  className="h-4 w-4 text-sage-700"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="m4 10 4 4 8-8" />
                                </svg>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {sortedProducts.map((product) => (
                <article
                  key={product.name}
                  className="glass-card group overflow-hidden rounded-3xl border border-white/70 transition duration-300 ease-in-out hover:-translate-y-1.5 hover:shadow-[0_26px_44px_rgba(31,61,43,0.18)]"
                >
                  <div className="relative h-56 overflow-hidden">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover transition duration-700 ease-out group-hover:scale-110"
                    />
                    <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/95 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-sage-800 opacity-0 transition duration-300 group-hover:opacity-100">
                      View Product
                    </span>
                  </div>
                  <div className="space-y-2.5 p-5">
                    <p className="text-[0.66rem] font-bold uppercase tracking-[0.22em] text-sage-700/75">{product.category}</p>
                    <h2 className="text-lg font-extrabold text-sage-800">{product.name}</h2>
                    <p className="text-sm text-sage-600">{product.copy}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-bold text-sage-700">{product.price}</span>
                      <button className="rounded-full bg-sage-700 px-4 py-2 text-xs font-extrabold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-sage-800">
                        Add to Cart
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {sortedProducts.length === 0 && (
              <div className="glass-card rounded-2xl p-8 text-center">
                <p className="text-sm font-semibold text-sage-700">No products available in this category yet.</p>
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}
