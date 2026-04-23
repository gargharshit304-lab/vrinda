import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import SiteNav from "../components/SiteNav";
import { fetchProductById, fetchProducts } from "../data/productApi";
import { addToCart } from "../data/cartStorage";

const infoTabs = [
  { id: "ingredients", label: "Ingredients" },
  { id: "how-to-use", label: "How to use" },
  { id: "details", label: "Product details" }
];

const dummyReviews = [
  {
    id: "review-1",
    name: "Aarav",
    rating: 5,
    comment: "Beautiful texture and very gentle on skin. The fragrance feels natural and calming."
  },
  {
    id: "review-2",
    name: "Meera",
    rating: 4,
    comment: "Loved the hydration and softness after use. Packaging also feels premium."
  },
  {
    id: "review-3",
    name: "Riya",
    rating: 5,
    comment: "One of the best herbal products I have tried recently. Definitely repurchasing."
  }
];

const ratingLabelMap = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent"
};

export default function ProductDetailPage() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeInfoTab, setActiveInfoTab] = useState("ingredients");
  const [cartNotice, setCartNotice] = useState("");
  const [reviews, setReviews] = useState(dummyReviews);
  const [reviewForm, setReviewForm] = useState({ name: "", rating: "5", comment: "" });
  const [hoverRating, setHoverRating] = useState(0);
  const [clickedRating, setClickedRating] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setErrorMessage("");
      try {
        const [selectedProduct, products] = await Promise.all([fetchProductById(productId), fetchProducts()]);
        if (cancelled) {
          return;
        }

        setProduct(selectedProduct);
        setAllProducts(products);
        setActiveImageIndex(0);
        setActiveInfoTab("ingredients");
        setReviews(dummyReviews);
        setReviewForm({ name: "", rating: "5", comment: "" });
        setHoverRating(0);
        setClickedRating(0);
      } catch (error) {
        if (!cancelled) {
          setProduct(null);
          setAllProducts([]);
          setErrorMessage(error.message || "Unable to load product details.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  const mainImage = product?.images?.[activeImageIndex] || product?.images?.[0];

  const infoContent = useMemo(() => {
    if (!product) {
      return "";
    }

    if (activeInfoTab === "how-to-use") {
      return product.howToUse;
    }
    if (activeInfoTab === "details") {
      return `Type: ${product.type} | Weight/Volume: ${product.weightVolume} | Skin Type/Concern: ${product.skinConcern}`;
    }
    return product.ingredients;
  }, [activeInfoTab, product]);

  const displayPrice = useMemo(() => {
    if (!product) {
      return "Rs 0";
    }
    const effective = product.onSale && product.salePercent > 0
      ? Math.max(1, Math.round(product.price * (1 - product.salePercent / 100)))
      : product.price;
    return `Rs ${effective}`;
  }, [product]);

  const relatedProducts = useMemo(() => {
    if (!product) {
      return [];
    }

    return allProducts
      .filter((item) => item.id !== product.id && item.category === product.category)
      .slice(0, 4);
  }, [allProducts, product]);

  const handleAddToCart = () => {
    if (!product) {
      return;
    }

    addToCart(product, 1);
    setCartNotice("Added to cart");
    window.setTimeout(() => setCartNotice(""), 1800);
  };

  const handleReviewChange = (event) => {
    const { name, value } = event.target;
    setReviewForm((current) => ({ ...current, [name]: value }));
  };

  const handleRatingSelect = (value) => {
    setReviewForm((current) => ({ ...current, rating: String(value) }));
    setClickedRating(value);
    window.setTimeout(() => setClickedRating(0), 220);
  };

  const handleReviewSubmit = (event) => {
    event.preventDefault();
    const trimmedName = reviewForm.name.trim();
    const trimmedComment = reviewForm.comment.trim();
    if (!trimmedName || !trimmedComment) {
      return;
    }

    const rating = Math.min(5, Math.max(1, Number(reviewForm.rating) || 5));
    setReviews((current) => [
      {
        id: `review-${Date.now()}`,
        name: trimmedName,
        rating,
        comment: trimmedComment
      },
      ...current
    ]);
    setReviewForm({ name: "", rating: "5", comment: "" });
    setHoverRating(0);
    setClickedRating(0);
  };

  const selectedRating = Math.min(5, Math.max(1, Number(reviewForm.rating) || 5));
  const visibleRating = hoverRating || selectedRating;

  if (loading) {
    return (
      <div className="pb-12">
        <SiteNav />
        <main className="mx-auto mt-6 w-[min(1000px,94vw)]">
          <section className="glass-card rounded-3xl p-10 text-center">
            <h1 className="font-display text-4xl font-semibold text-sage-800">Loading product...</h1>
            <p className="mt-3 text-sage-700">Fetching latest details from the store.</p>
          </section>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="pb-12">
        <SiteNav />
        <main className="mx-auto mt-6 w-[min(1000px,94vw)]">
          <section className="glass-card rounded-3xl p-10 text-center">
            <h1 className="font-display text-4xl font-semibold text-sage-800">Product not found</h1>
            <p className="mt-3 text-sage-700">
              {errorMessage || "This product is unavailable right now. Explore our shop for more herbal essentials."}
            </p>
            <Link
              to="/shop"
              className="mt-6 inline-flex rounded-full bg-sage-700 px-5 py-2.5 text-sm font-bold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-sage-800"
            >
              Back to Shop
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <SiteNav />
      <main className="mx-auto mt-6 w-[min(1200px,94vw)] space-y-5">
        <Link to="/shop" className="inline-flex text-sm font-semibold text-sage-700 transition duration-300 hover:text-sage-900">
          {"<- Back to Shop"}
        </Link>

        <section className="grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="glass-card rounded-3xl border border-white/70 bg-[#f8f3ea]/88 p-4 sm:p-5">
            <div className="group overflow-hidden rounded-2xl border border-white/70 bg-white/70">
              <img
                key={mainImage}
                src={mainImage}
                alt={product.name}
                className="h-[360px] w-full object-cover transition duration-700 ease-out group-hover:scale-105 sm:h-[460px]"
              />
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2 sm:gap-3">
              {product.images.map((image, idx) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`overflow-hidden rounded-xl border bg-white/80 transition duration-300 ${
                    activeImageIndex === idx
                      ? "border-sage-500 shadow-[0_10px_20px_rgba(31,61,43,0.18)]"
                      : "border-sage-200/80 hover:-translate-y-0.5 hover:border-sage-300"
                  }`}
                >
                  <img src={image} alt={`${product.name} ${idx + 1}`} className="h-20 w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            <section className="glass-card rounded-3xl border border-white/70 bg-white/65 p-6 shadow-soft sm:p-8">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.24em] text-sage-700/80">Vrinda Signature</p>
              <h1 className="mt-2 font-display text-4xl font-semibold leading-tight text-sage-900 sm:text-5xl">{product.name}</h1>
              <p className="mt-2 text-sm font-semibold tracking-[0.02em] text-sage-700">{product.tagline}</p>

              <div className="mt-4 flex items-center gap-3">
                <p className="text-2xl font-extrabold text-sage-800">{displayPrice}</p>
                <div className="flex items-center gap-1.5 rounded-full bg-sage-700/8 px-3 py-1 text-xs font-bold text-sage-700">
                  <span className="text-amber-500">★★★★★</span>
                  <span>{product.rating}</span>
                  <span className="text-sage-600/80">({product.reviewCount})</span>
                </div>
              </div>

              {cartNotice ? (
                <p className="mt-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                  {cartNotice}
                </p>
              ) : null}

              <p className="mt-4 text-sm leading-relaxed text-sage-700">{product.description}</p>

              <ul className="mt-5 grid gap-2 text-sm font-medium text-sage-800 sm:grid-cols-2">
                {product.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 rounded-xl bg-[#f4ecde]/80 px-3 py-2">
                    <span className="inline-block h-2 w-2 rounded-full bg-sage-600" />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="rounded-full bg-gradient-to-r from-sage-800 to-sage-600 px-5 py-3 text-sm font-extrabold tracking-[0.04em] text-white shadow-[0_12px_24px_rgba(31,61,43,0.28)] transition duration-300 ease-in-out hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-[0_16px_30px_rgba(31,61,43,0.34)]"
                >
                  Add to Cart
                </button>
                <button className="rounded-full border border-sage-300 bg-white/85 px-5 py-3 text-sm font-extrabold tracking-[0.04em] text-sage-800 transition duration-300 ease-in-out hover:-translate-y-0.5 hover:border-sage-500 hover:bg-white">
                  Buy Now
                </button>
              </div>
            </section>

            <section className="glass-card rounded-3xl border border-white/70 bg-white/65 p-5 shadow-soft sm:p-6">
              <div className="flex flex-wrap gap-2">
                {infoTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveInfoTab(tab.id)}
                    className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] transition duration-300 ${
                      activeInfoTab === tab.id
                        ? "bg-sage-700 text-white shadow-[0_10px_18px_rgba(31,61,43,0.24)]"
                        : "bg-[#f4ecde]/85 text-sage-700 hover:bg-white"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <p key={activeInfoTab} className="mt-4 animate-fadeUp text-sm leading-relaxed text-sage-700">
                {infoContent}
              </p>
            </section>
          </div>
        </section>

        {relatedProducts.length > 0 ? (
          <section className="glass-card rounded-3xl border border-white/70 bg-white/65 p-5 shadow-soft sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-display text-3xl text-sage-800">Related Products</h2>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-sage-700/70">You may also like</p>
            </div>

            <div className="-mx-1 flex snap-x gap-4 overflow-x-auto px-1 pb-1 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
              {relatedProducts.map((item) => {
                const itemPrice = item.onSale && item.salePercent > 0
                  ? Math.max(1, Math.round(item.price * (1 - item.salePercent / 100)))
                  : item.price;

                return (
                  <article
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/product/${item.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/product/${item.id}`);
                      }
                    }}
                    className="group min-w-[240px] snap-start overflow-hidden rounded-2xl border border-sage-100/90 bg-[#faf7f0]/92 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_30px_rgba(31,61,43,0.14)] lg:min-w-0"
                  >
                    <div className="h-36 overflow-hidden">
                      <img
                        src={item.images?.[0] || item.mainImageDataUrl || item.imageDataUrl}
                        alt={item.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    </div>
                    <div className="space-y-1 p-3">
                      <p className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-sage-700/75">{item.category}</p>
                      <h3 className="line-clamp-1 text-sm font-extrabold text-sage-800">{item.name}</h3>
                      <p className="line-clamp-2 text-xs text-sage-600">{item.tagline || item.copy}</p>
                      <p className="pt-1 text-sm font-extrabold text-sage-800">Rs {itemPrice}</p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="glass-card rounded-3xl border border-white/70 bg-white/65 p-5 shadow-soft sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-3xl text-sage-800">Reviews</h2>
            <div className="inline-flex items-center gap-2 rounded-full bg-sage-700/8 px-3 py-1 text-sm font-bold text-sage-700">
              <span className="text-amber-500">★★★★★</span>
              <span>{product.rating}</span>
              <span className="text-sage-600/80">({reviews.length})</span>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {reviews.map((review) => (
              <article key={review.id} className="rounded-2xl border border-sage-100/90 bg-[#faf7f0]/90 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-extrabold text-sage-800">{review.name}</p>
                  <p className="text-sm text-amber-500">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</p>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-sage-700">{review.comment}</p>
              </article>
            ))}
          </div>

          <form onSubmit={handleReviewSubmit} className="mt-5 rounded-2xl border border-sage-100/90 bg-white/80 p-4">
            <h3 className="text-sm font-extrabold uppercase tracking-[0.16em] text-sage-700">Add Review</h3>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-sage-700/90">Name</span>
                <input
                  name="name"
                  value={reviewForm.name}
                  onChange={handleReviewChange}
                  placeholder="Your name"
                  required
                  className="w-full rounded-xl border border-sage-200/85 bg-white px-3 py-2.5 text-sm text-sage-800 outline-none transition focus:border-sage-400"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-sage-700/90">Rating</span>
                <div
                  className="rounded-xl border border-sage-200/85 bg-white px-3 py-2.5"
                  onMouseLeave={() => setHoverRating(0)}
                >
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((value) => {
                      const active = value <= visibleRating;
                      return (
                        <button
                          key={value}
                          type="button"
                          onMouseEnter={() => setHoverRating(value)}
                          onClick={() => handleRatingSelect(value)}
                          className={`grid h-9 w-9 place-items-center rounded-full transition duration-200 ease-out sm:h-8 sm:w-8 ${
                            clickedRating === value ? "review-star-pop" : ""
                          } ${active ? "text-amber-400" : "text-sage-300"}`}
                          aria-label={`Rate ${value} star${value > 1 ? "s" : ""}`}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            className="h-6 w-6 transition duration-200 hover:scale-110"
                            fill="currentColor"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="m12 2.8 2.86 5.8 6.4.93-4.63 4.5 1.09 6.36L12 17.34 6.28 20.4l1.09-6.36L2.74 9.53l6.4-.93L12 2.8Z" />
                          </svg>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-xs font-semibold text-sage-700">
                    {selectedRating} - {ratingLabelMap[selectedRating]}
                  </p>
                </div>
              </label>
            </div>

            <label className="mt-3 block space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-[0.14em] text-sage-700/90">Comment</span>
              <textarea
                name="comment"
                value={reviewForm.comment}
                onChange={handleReviewChange}
                placeholder="Share your experience"
                rows={4}
                required
                className="w-full resize-none rounded-xl border border-sage-200/85 bg-white px-3 py-2.5 text-sm text-sage-800 outline-none transition focus:border-sage-400"
              />
            </label>

            <button
              type="submit"
              className="mt-4 rounded-full bg-sage-700 px-5 py-2.5 text-sm font-extrabold tracking-[0.04em] text-white shadow-[0_10px_20px_rgba(31,61,43,0.22)] transition duration-300 hover:-translate-y-0.5 hover:bg-sage-800"
            >
              Submit Review
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}
