import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ADMIN_PRODUCTS_KEY, makeProductId, normalizeCatalogProduct } from "../data/productCatalog";

const AUTH_STORAGE_KEY = "vrinda.currentUser";

const STORAGE_KEYS = {
  products: ADMIN_PRODUCTS_KEY,
  orders: "vrinda.admin.orders"
};

const sections = [
  { key: "overview", label: "Overview", icon: "M3 12l9-8 9 8M5 10v10h14V10" },
  { key: "products", label: "Product Management", icon: "M21 8a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8M8 6V4h8v2M3 12h18" },
  { key: "orders", label: "Pending Orders", icon: "M3 4h18v17H3zM8 2v4M16 2v4M7 11h10M7 15h6" },
  { key: "analytics", label: "Analytics", icon: "M4 20V10M10 20V4M16 20v-7M22 20v-11" },
  { key: "revenue", label: "Revenue Tracker", icon: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" }
];

const formatInr = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);

const readStore = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const normalizeProduct = (product) => normalizeCatalogProduct(product);

const getEffectivePrice = (product) => {
  const basePrice = Number(product.price) || 0;
  const salePercent = Number(product.salePercent) || 0;
  if (!product.onSale || salePercent <= 0) {
    return basePrice;
  }
  return Math.max(1, Math.round(basePrice * (1 - salePercent / 100)));
};

export default function AdminPage() {
  const navigate = useNavigate();
  const [hasAccess, setHasAccess] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");
  const [products, setProducts] = useState(() => readStore(STORAGE_KEYS.products).map(normalizeProduct));
  const [orders, setOrders] = useState(() => readStore(STORAGE_KEYS.orders));
  const [productStatus, setProductStatus] = useState("");
  const [orderStatusMsg, setOrderStatusMsg] = useState("");
  const [preview, setPreview] = useState({ src: "", text: "No image selected." });
  const [additionalPreviews, setAdditionalPreviews] = useState([]);
  const [featureInput, setFeatureInput] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      setHasAccess(false);
      setAuthChecked(true);
      navigate("/login", { replace: true });
      return;
    }

    try {
      const user = JSON.parse(raw);
      if (user?.role === "admin") {
        setHasAccess(true);
        setAuthChecked(true);
        return;
      }
    } catch {
      // Invalid auth payload falls through to redirect.
    }

    setHasAccess(false);
    setAuthChecked(true);
    navigate("/login", { replace: true });
  }, [navigate]);

  const [productForm, setProductForm] = useState({
    name: "",
    category: "Soaps",
    price: "",
    tagline: "",
    units: 0,
    salePercent: 0,
    onSale: false,
    description: "",
    mainImageDataUrl: "",
    additionalImageDataUrls: [],
    features: ["Deep cleansing", "Skin nourishing"],
    ingredients: "",
    howToUse: "",
    type: "",
    weightVolume: "",
    skinConcern: "",
    rating: ""
  });

  const [orderForm, setOrderForm] = useState({
    customer: "",
    productId: "",
    quantity: 1,
    status: "pending"
  });

  if (!authChecked || !hasAccess) {
    return null;
  }

  const persist = (nextProducts, nextOrders) => {
    localStorage.setItem(STORAGE_KEYS.products, JSON.stringify(nextProducts));
    localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(nextOrders));
    window.dispatchEvent(new Event("vrinda-products-changed"));
    setProducts(nextProducts);
    setOrders(nextOrders);
  };

  const soldByProduct = useMemo(() => {
    const map = new Map();
    orders.forEach((order) => {
      if (order.status !== "completed") {
        return;
      }
      map.set(order.productId, (map.get(order.productId) || 0) + order.quantity);
    });
    return map;
  }, [orders]);

  const revenueStats = useMemo(() => {
    let completedRevenue = 0;
    let pendingPipeline = 0;
    let completedCount = 0;
    let pendingCount = 0;

    orders.forEach((order) => {
      const product = products.find((item) => item.id === order.productId);
      if (!product) {
        return;
      }
      const lineValue = getEffectivePrice(product) * order.quantity;
      if (order.status === "completed") {
        completedRevenue += lineValue;
        completedCount += 1;
      } else if (order.status === "pending") {
        pendingPipeline += lineValue;
        pendingCount += 1;
      }
    });

    return {
      completedRevenue,
      pendingPipeline,
      completedCount,
      pendingCount,
      averageCompletedOrderValue: completedCount > 0 ? Math.round(completedRevenue / completedCount) : 0
    };
  }, [orders, products]);

  const topProduct = useMemo(() => {
    let top = { name: "-", sold: 0 };
    products.forEach((product) => {
      const sold = soldByProduct.get(product.id) || 0;
      if (sold > top.sold) {
        top = { name: product.name, sold };
      }
    });
    return top;
  }, [products, soldByProduct]);

  const analyticsRows = useMemo(() => {
    const rows = products
      .map((product) => ({ id: product.id, name: product.name, sold: soldByProduct.get(product.id) || 0 }))
      .sort((a, b) => b.sold - a.sold);
    const max = rows.length ? Math.max(...rows.map((item) => item.sold), 0) : 0;
    return rows.map((item) => ({ ...item, width: max > 0 ? Math.round((item.sold / max) * 100) : 0 }));
  }, [products, soldByProduct]);

  const pendingOrders = orders.filter((order) => order.status === "pending").length;

  const addProduct = (event) => {
    event.preventDefault();
    const name = productForm.name.trim();
    const category = productForm.category.trim();
    const tagline = productForm.tagline.trim();
    const description = productForm.description.trim();
    const ingredients = productForm.ingredients.trim();
    const howToUse = productForm.howToUse.trim();
    const type = productForm.type.trim();
    const weightVolume = productForm.weightVolume.trim();
    const skinConcern = productForm.skinConcern.trim();
    const price = Number(productForm.price);
    const unitsAvailable = Number(productForm.units);
    const salePercent = Number(productForm.salePercent);
    const rating = Number(productForm.rating);
    const features = productForm.features.map((item) => item.trim()).filter(Boolean);

    if (!name || !category || !tagline || !description || !Number.isFinite(price) || price < 1) {
      setProductStatus("Please fill all product fields correctly.");
      return;
    }
    if (!Number.isInteger(unitsAvailable) || unitsAvailable < 0) {
      setProductStatus("Units available must be 0 or more.");
      return;
    }
    if (!Number.isFinite(salePercent) || salePercent < 0 || salePercent > 90) {
      setProductStatus("Sale discount must be between 0 and 90.");
      return;
    }
    if (productForm.onSale && salePercent <= 0) {
      setProductStatus("Enter a sale discount above 0 when sale is enabled.");
      return;
    }
    if (!productForm.mainImageDataUrl) {
      setProductStatus("Upload an image from your device before saving.");
      return;
    }
    if (!ingredients || !howToUse || !type || !weightVolume || !skinConcern) {
      setProductStatus("Please complete ingredients, how to use, and product details sections.");
      return;
    }
    if (!features.length) {
      setProductStatus("Add at least one feature/benefit.");
      return;
    }
    if (productForm.rating && (!Number.isFinite(rating) || rating < 0 || rating > 5)) {
      setProductStatus("Rating must be between 0 and 5.");
      return;
    }

    const images = [productForm.mainImageDataUrl, ...productForm.additionalImageDataUrls].filter(Boolean);

    const nextProducts = [
      {
        id: makeProductId(name),
        name,
        category,
        tagline,
        description,
        price,
        unitsAvailable,
        onSale: productForm.onSale,
        salePercent,
        rating: Number.isFinite(rating) ? rating : 4.6,
        reviewCount: 0,
        features,
        ingredients,
        howToUse,
        type,
        weightVolume,
        skinConcern,
        mainImageDataUrl: productForm.mainImageDataUrl,
        additionalImageDataUrls: productForm.additionalImageDataUrls,
        imageDataUrl: productForm.mainImageDataUrl,
        images
      },
      ...products
    ];

    persist(nextProducts, orders);
    setProductStatus("Product saved successfully.");
    setProductForm({
      name: "",
      category: "Soaps",
      price: "",
      tagline: "",
      units: 0,
      salePercent: 0,
      onSale: false,
      description: "",
      mainImageDataUrl: "",
      additionalImageDataUrls: [],
      features: ["Deep cleansing", "Skin nourishing"],
      ingredients: "",
      howToUse: "",
      type: "",
      weightVolume: "",
      skinConcern: "",
      rating: ""
    });
    setPreview({ src: "", text: "No image selected." });
    setAdditionalPreviews([]);
    setFeatureInput("");
  };

  const removeProduct = (id) => {
    const nextProducts = products.filter((product) => product.id !== id);
    const nextOrders = orders.filter((order) => order.productId !== id);
    persist(nextProducts, nextOrders);
    setProductStatus("Product deleted. Linked orders removed.");
    setOrderStatusMsg("Orders updated after product deletion.");
  };

  const addOrder = (event) => {
    event.preventDefault();
    const customer = orderForm.customer.trim();
    const quantity = Number(orderForm.quantity);
    const linkedProduct = products.find((item) => item.id === orderForm.productId);

    if (!products.length) {
      setOrderStatusMsg("Add at least one product before creating orders.");
      return;
    }
    if (!customer || !orderForm.productId || !Number.isFinite(quantity) || quantity < 1) {
      setOrderStatusMsg("Please fill all order fields correctly.");
      return;
    }
    if (!linkedProduct) {
      setOrderStatusMsg("Selected product is unavailable.");
      return;
    }
    if (linkedProduct.unitsAvailable <= 0) {
      setOrderStatusMsg("Selected product is out of stock.");
      return;
    }
    if (quantity > linkedProduct.unitsAvailable) {
      setOrderStatusMsg(`Only ${linkedProduct.unitsAvailable} unit(s) available for this product.`);
      return;
    }

    const nextProducts = products.map((product) =>
      product.id === linkedProduct.id ? { ...product, unitsAvailable: product.unitsAvailable - quantity } : product
    );

    const nextOrders = [
      {
        id: `ord_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`,
        customer,
        productId: orderForm.productId,
        quantity,
        status: orderForm.status
      },
      ...orders
    ];

    persist(nextProducts, nextOrders);
    setOrderStatusMsg("Order added successfully.");
    setOrderForm({ customer: "", productId: "", quantity: 1, status: "pending" });
  };

  const toggleOrder = (id) => {
    const nextOrders = orders.map((order) =>
      order.id === id ? { ...order, status: order.status === "pending" ? "completed" : "pending" } : order
    );
    persist(products, nextOrders);
    setOrderStatusMsg("Order status updated.");
  };

  const deleteOrder = (id) => {
    const deleted = orders.find((order) => order.id === id);
    const nextOrders = orders.filter((order) => order.id !== id);
    const nextProducts = deleted
      ? products.map((product) =>
          product.id === deleted.productId
            ? { ...product, unitsAvailable: product.unitsAvailable + deleted.quantity }
            : product
        )
      : products;
    persist(nextProducts, nextOrders);
    setOrderStatusMsg("Order deleted.");
  };

  const handleMainImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      setPreview({ src: "", text: "No image selected." });
      setProductForm((old) => ({ ...old, mainImageDataUrl: "" }));
      return;
    }
    if (!file.type.startsWith("image/")) {
      setProductStatus("Invalid file type. Choose an image from your device.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const src = String(reader.result || "");
      setPreview({ src, text: file.name });
      setProductForm((old) => ({ ...old, mainImageDataUrl: src }));
      setProductStatus("Image ready. Submit the form to save product.");
    };
    reader.onerror = () => setProductStatus("Failed to read image file.");
    reader.readAsDataURL(file);
  };

  const handleAdditionalImages = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      setProductForm((old) => ({ ...old, additionalImageDataUrls: [] }));
      setAdditionalPreviews([]);
      return;
    }
    if (files.some((file) => !file.type.startsWith("image/"))) {
      setProductStatus("Additional images must be valid image files.");
      return;
    }

    Promise.all(
      files.map(
        (file) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ name: file.name, src: String(reader.result || "") });
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    )
      .then((entries) => {
        setAdditionalPreviews(entries);
        setProductForm((old) => ({ ...old, additionalImageDataUrls: entries.map((entry) => entry.src) }));
      })
      .catch(() => setProductStatus("Could not process additional images."));
  };

  const addFeaturePoint = () => {
    const value = featureInput.trim();
    if (!value) {
      return;
    }
    setProductForm((old) => ({ ...old, features: [...old.features, value] }));
    setFeatureInput("");
  };

  const removeFeaturePoint = (index) => {
    setProductForm((old) => ({ ...old, features: old.features.filter((_, idx) => idx !== index) }));
  };

  return (
    <div className="min-h-screen">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="relative border-b border-sage-200 bg-gradient-to-b from-[#fcfaf5] to-[#ede5d8] p-4 lg:border-b-0 lg:border-r">
          <div className="mb-3 pl-2">
            <h1 className="font-display text-4xl font-bold text-sage-800">Vrinda</h1>
            <p className="text-xs font-semibold text-sage-600">Admin control panel</p>
          </div>

          <nav className="grid gap-2">
            {sections.map((section) => (
              <button
                key={section.key}
                onClick={() => setActiveSection(section.key)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-extrabold transition ${
                  activeSection === section.key
                    ? "border-sage-700 bg-sage-700 text-white shadow"
                    : "border-sage-200 bg-white/80 text-sage-800 hover:-translate-y-0.5 hover:shadow"
                }`}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={section.icon} />
                </svg>
                <span>{section.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="space-y-3 p-4 md:p-6">
          <section className="glass-card p-6">
            <h2 className="font-display text-5xl font-bold leading-none text-sage-800">Admin Dashboard</h2>
            <p className="mt-2 text-sm text-sage-600">
              Manage products, pending orders, demand analytics, and revenue in INR. Logic stays client-side with localStorage.
            </p>
          </section>

          {activeSection === "overview" && (
            <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <article className="glass-card p-4">
                <p className="text-xs font-extrabold uppercase tracking-widest text-sage-600">Current Orders Left</p>
                <strong className="mt-2 block font-display text-4xl text-sage-700">{pendingOrders}</strong>
              </article>
              <article className="glass-card p-4">
                <p className="text-xs font-extrabold uppercase tracking-widest text-sage-600">Total Orders</p>
                <strong className="mt-2 block font-display text-4xl text-sage-700">{orders.length}</strong>
              </article>
              <article className="glass-card p-4">
                <p className="text-xs font-extrabold uppercase tracking-widest text-sage-600">Top Demand Product</p>
                <strong className="mt-2 block font-display text-3xl text-sage-700">{topProduct.name}</strong>
              </article>
              <article className="glass-card p-4">
                <p className="text-xs font-extrabold uppercase tracking-widest text-sage-600">Revenue Tracker (INR)</p>
                <strong className="mt-2 block font-display text-3xl text-sage-700">{formatInr(revenueStats.completedRevenue)}</strong>
              </article>
            </section>
          )}

          {activeSection === "products" && (
            <section className="grid gap-3 xl:grid-cols-[1.08fr_0.92fr]">
              <article className="glass-card p-5">
                <h3 className="font-display text-4xl font-semibold text-sage-800">Add Product</h3>
                <form onSubmit={addProduct} className="mt-4 space-y-3">
                  <section className="rounded-2xl border border-sage-200/80 bg-white/70 p-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-[0.14em] text-sage-700">Basic Details</h4>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <label className="text-sm font-bold text-sage-800">
                        Product Name
                        <input
                          value={productForm.name}
                          onChange={(e) => setProductForm((old) => ({ ...old, name: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                          required
                        />
                      </label>
                      <label className="text-sm font-bold text-sage-800">
                        Category
                        <select
                          value={productForm.category}
                          onChange={(e) => setProductForm((old) => ({ ...old, category: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                        >
                          <option>Soaps</option>
                          <option>Candles</option>
                          <option>Bath & Body</option>
                          <option>Gift Sets / Accessories</option>
                          <option>Herbal Care</option>
                        </select>
                      </label>
                      <label className="text-sm font-bold text-sage-800">
                        Price (INR)
                        <input
                          type="number"
                          min="1"
                          value={productForm.price}
                          onChange={(e) => setProductForm((old) => ({ ...old, price: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                          required
                        />
                      </label>
                      <label className="text-sm font-bold text-sage-800">
                        Short Tagline
                        <input
                          value={productForm.tagline}
                          onChange={(e) => setProductForm((old) => ({ ...old, tagline: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                          required
                        />
                      </label>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-sage-200/80 bg-white/70 p-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-[0.14em] text-sage-700">Images</h4>
                    <div className="mt-3 grid gap-3">
                      <label className="text-sm font-bold text-sage-800">
                        Main Product Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleMainImage}
                          className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2"
                          required
                        />
                      </label>
                      <div className="flex items-center gap-3 text-sm text-sage-600">
                        {preview.src ? <img src={preview.src} alt="preview" className="h-14 w-14 rounded-lg object-cover" /> : null}
                        <span>{preview.text}</span>
                      </div>
                      <label className="text-sm font-bold text-sage-800">
                        Additional Images (thumbnails)
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleAdditionalImages}
                          className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2"
                        />
                      </label>
                      {!!additionalPreviews.length && (
                        <div className="flex flex-wrap gap-2">
                          {additionalPreviews.map((item) => (
                            <img key={item.src} src={item.src} alt={item.name} className="h-14 w-14 rounded-lg object-cover" />
                          ))}
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-sage-200/80 bg-white/70 p-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-[0.14em] text-sage-700">Description</h4>
                    <label className="mt-3 block text-sm font-bold text-sage-800">
                      Long Description
                      <textarea
                        value={productForm.description}
                        onChange={(e) => setProductForm((old) => ({ ...old, description: e.target.value }))}
                        className="mt-1 min-h-24 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                        required
                      />
                    </label>
                  </section>

                  <section className="rounded-2xl border border-sage-200/80 bg-white/70 p-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-[0.14em] text-sage-700">Features / Benefits</h4>
                    <div className="mt-3 flex gap-2">
                      <input
                        value={featureInput}
                        onChange={(e) => setFeatureInput(e.target.value)}
                        className="w-full rounded-xl border border-sage-200 bg-white px-3 py-2 text-sm outline-none focus:border-sage-400"
                        placeholder="Add feature point"
                      />
                      <button type="button" onClick={addFeaturePoint} className="rounded-full bg-sage-700 px-4 py-2 text-xs font-extrabold text-white">
                        Add
                      </button>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {productForm.features.map((feature, idx) => (
                        <div key={`${feature}-${idx}`} className="flex items-center justify-between rounded-xl border border-sage-200 bg-white px-3 py-2">
                          <span className="text-sm font-semibold text-sage-700">{feature}</span>
                          <button type="button" onClick={() => removeFeaturePoint(idx)} className="text-xs font-bold text-rose-700">
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-2xl border border-sage-200/80 bg-white/70 p-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-[0.14em] text-sage-700">Ingredients & Usage</h4>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <label className="text-sm font-bold text-sage-800">
                        Ingredients
                        <textarea
                          value={productForm.ingredients}
                          onChange={(e) => setProductForm((old) => ({ ...old, ingredients: e.target.value }))}
                          className="mt-1 min-h-20 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                          required
                        />
                      </label>
                      <label className="text-sm font-bold text-sage-800">
                        How to Use
                        <textarea
                          value={productForm.howToUse}
                          onChange={(e) => setProductForm((old) => ({ ...old, howToUse: e.target.value }))}
                          className="mt-1 min-h-20 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                          required
                        />
                      </label>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-sage-200/80 bg-white/70 p-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-[0.14em] text-sage-700">Product Details</h4>
                    <div className="mt-3 grid gap-3 md:grid-cols-3">
                      <label className="text-sm font-bold text-sage-800">
                        Type
                        <input
                          value={productForm.type}
                          onChange={(e) => setProductForm((old) => ({ ...old, type: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                          required
                        />
                      </label>
                      <label className="text-sm font-bold text-sage-800">
                        Weight / Volume
                        <input
                          value={productForm.weightVolume}
                          onChange={(e) => setProductForm((old) => ({ ...old, weightVolume: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                          required
                        />
                      </label>
                      <label className="text-sm font-bold text-sage-800">
                        Skin Type / Concern
                        <input
                          value={productForm.skinConcern}
                          onChange={(e) => setProductForm((old) => ({ ...old, skinConcern: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                          required
                        />
                      </label>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-sage-200/80 bg-white/70 p-4">
                    <h4 className="text-xs font-extrabold uppercase tracking-[0.14em] text-sage-700">Pricing, Stock & Extras</h4>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <label className="text-sm font-bold text-sage-800">
                        Stock Quantity
                        <input
                          type="number"
                          min="0"
                          value={productForm.units}
                          onChange={(e) => setProductForm((old) => ({ ...old, units: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                          required
                        />
                      </label>
                      <label className="text-sm font-bold text-sage-800">
                        Rating (0 to 5, optional)
                        <input
                          type="number"
                          min="0"
                          max="5"
                          step="0.1"
                          value={productForm.rating}
                          onChange={(e) => setProductForm((old) => ({ ...old, rating: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                        />
                      </label>
                      <label className="md:col-span-2 text-sm font-bold text-sage-800">
                        Sale Discount (%)
                        <input
                          type="number"
                          min="0"
                          max="90"
                          value={productForm.salePercent}
                          onChange={(e) => setProductForm((old) => ({ ...old, salePercent: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                        />
                      </label>
                      <label className="md:col-span-2 inline-flex items-center gap-2 text-sm font-semibold text-sage-700">
                        <input
                          type="checkbox"
                          checked={productForm.onSale}
                          onChange={(e) => setProductForm((old) => ({ ...old, onSale: e.target.checked }))}
                        />
                        Mark this product as on sale
                      </label>
                    </div>
                  </section>

                  <div className="flex flex-wrap gap-2">
                    <button className="rounded-full bg-sage-700 px-4 py-2 text-xs font-extrabold text-white">Save Product</button>
                    <button
                      type="button"
                      onClick={() => {
                        setProductForm({
                          name: "",
                          category: "Soaps",
                          price: "",
                          tagline: "",
                          units: 0,
                          salePercent: 0,
                          onSale: false,
                          description: "",
                          mainImageDataUrl: "",
                          additionalImageDataUrls: [],
                          features: ["Deep cleansing", "Skin nourishing"],
                          ingredients: "",
                          howToUse: "",
                          type: "",
                          weightVolume: "",
                          skinConcern: "",
                          rating: ""
                        });
                        setPreview({ src: "", text: "No image selected." });
                        setAdditionalPreviews([]);
                        setFeatureInput("");
                        setProductStatus("Form reset.");
                      }}
                      className="pill-btn"
                    >
                      Reset
                    </button>
                  </div>

                  <p className="min-h-5 text-sm font-bold text-sage-700">{productStatus}</p>
                </form>
              </article>

              <article className="glass-card p-5">
                <h3 className="font-display text-4xl font-semibold text-sage-800">Products</h3>
                <div className="mt-4 grid max-h-[620px] gap-2 overflow-auto pr-1">
                  {!products.length ? (
                    <p className="text-sm text-sage-600">No products yet. Add your first product with image upload from device.</p>
                  ) : (
                    products.map((product) => {
                      const effective = getEffectivePrice(product);
                      const showSale = product.onSale && product.salePercent > 0;
                      return (
                        <article key={product.id} className="rounded-xl border border-sage-200 bg-white p-2 transition hover:-translate-y-0.5 hover:shadow">
                          <div className="grid grid-cols-[64px_1fr_auto] items-center gap-2">
                            <img src={product.imageDataUrl} alt={product.name} className="h-16 w-16 rounded-lg object-cover" />
                            <div>
                              <h4 className="font-extrabold text-sage-800">{product.name}</h4>
                              <p className="line-clamp-2 text-xs text-sage-600">{product.description}</p>
                              <p className="text-xs font-bold text-sage-700">
                                {formatInr(effective)}
                                {showSale ? <span className="ml-2 text-sage-500 line-through">{formatInr(product.price)}</span> : null}
                              </p>
                              {showSale ? (
                                <span className="inline-block rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-rose-700">
                                  On Sale {product.salePercent}%
                                </span>
                              ) : null}
                              <p className="text-[11px] font-bold text-earth-700">Units available: {product.unitsAvailable}</p>
                              <p className="text-[11px] font-bold text-earth-700">Sold (completed): {soldByProduct.get(product.id) || 0}</p>
                            </div>
                            <button onClick={() => removeProduct(product.id)} className="rounded-full border border-sage-200 px-3 py-1 text-xs font-extrabold">
                              Delete
                            </button>
                          </div>
                        </article>
                      );
                    })
                  )}
                </div>
              </article>
            </section>
          )}

          {activeSection === "orders" && (
            <section className="glass-card p-5">
              <h3 className="font-display text-4xl font-semibold text-sage-800">Pending Orders</h3>
              <form onSubmit={addOrder} className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="text-sm font-bold text-sage-800">
                  Customer Name
                  <input
                    value={orderForm.customer}
                    onChange={(e) => setOrderForm((old) => ({ ...old, customer: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                    required
                  />
                </label>
                <label className="text-sm font-bold text-sage-800">
                  Product
                  <select
                    value={orderForm.productId}
                    onChange={(e) => setOrderForm((old) => ({ ...old, productId: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                    required
                  >
                    <option value="">Select product</option>
                    {products.map((product) => {
                      const stock = product.unitsAvailable;
                      return (
                        <option key={product.id} value={product.id} disabled={stock <= 0}>
                          {product.name} ({formatInr(getEffectivePrice(product))}) - {stock} units
                        </option>
                      );
                    })}
                  </select>
                </label>
                <label className="text-sm font-bold text-sage-800">
                  Quantity
                  <input
                    type="number"
                    min="1"
                    value={orderForm.quantity}
                    onChange={(e) => setOrderForm((old) => ({ ...old, quantity: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                    required
                  />
                </label>
                <label className="text-sm font-bold text-sage-800">
                  Order Status
                  <select
                    value={orderForm.status}
                    onChange={(e) => setOrderForm((old) => ({ ...old, status: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-2 outline-none focus:border-sage-400"
                  >
                    <option value="pending">Pending</option>
                    <option value="completed">Completed</option>
                  </select>
                </label>
                <button className="md:col-span-2 w-fit rounded-full bg-sage-700 px-5 py-2 text-xs font-extrabold text-white">Add Order</button>
                <p className="md:col-span-2 min-h-5 text-sm font-bold text-sage-700">{orderStatusMsg}</p>
              </form>

              <div className="mt-3 overflow-auto rounded-xl border border-sage-200 bg-white/80">
                <table className="min-w-[680px] w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wider text-sage-600">
                    <tr>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Product</th>
                      <th className="p-3">Qty</th>
                      <th className="p-3">Amount (INR)</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!orders.length ? (
                      <tr>
                        <td className="p-3 text-sage-600" colSpan={6}>
                          No orders added yet.
                        </td>
                      </tr>
                    ) : (
                      orders.map((order) => {
                        const product = products.find((item) => item.id === order.productId);
                        const amount = product ? getEffectivePrice(product) * order.quantity : 0;
                        return (
                          <tr key={order.id} className="border-t border-sage-100">
                            <td className="p-3">{order.customer}</td>
                            <td className="p-3">{product ? product.name : "Product Removed"}</td>
                            <td className="p-3">{order.quantity}</td>
                            <td className="p-3">{formatInr(amount)}</td>
                            <td className="p-3">
                              <span
                                className={`rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${
                                  order.status === "pending"
                                    ? "border border-amber-300 bg-amber-100 text-amber-700"
                                    : "border border-emerald-300 bg-emerald-100 text-emerald-700"
                                }`}
                              >
                                {order.status}
                              </span>
                            </td>
                            <td className="p-3 space-x-2">
                              <button onClick={() => toggleOrder(order.id)} className="rounded-full border border-sage-200 px-3 py-1 text-xs font-extrabold">
                                Toggle
                              </button>
                              <button onClick={() => deleteOrder(order.id)} className="rounded-full border border-sage-200 px-3 py-1 text-xs font-extrabold">
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeSection === "analytics" && (
            <section className="glass-card p-5">
              <h3 className="font-display text-4xl font-semibold text-sage-800">Product Demand Analytics</h3>
              <p className="mt-2 rounded-xl border border-dashed border-sage-300 p-3 text-sm text-sage-600">
                {analyticsRows[0] && analyticsRows[0].sold > 0
                  ? `${analyticsRows[0].name} is currently the most in-demand product with ${analyticsRows[0].sold} completed sales.`
                  : "No demand data yet. Add products and mark orders as completed."}
              </p>
              <div className="mt-4 grid gap-2">
                {!analyticsRows.length ? (
                  <p className="text-sm text-sage-600">Analytics will appear when products and completed orders are available.</p>
                ) : (
                  analyticsRows.map((row) => (
                    <article key={row.id} className="rounded-xl border border-sage-200 bg-white p-3">
                      <div className="mb-1 flex items-center justify-between text-sm font-bold text-sage-700">
                        <span>{row.name}</span>
                        <span>{row.sold} sold</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-sage-100">
                        <div className="h-full rounded-full bg-gradient-to-r from-sage-400 to-sage-700 transition-all" style={{ width: `${row.width}%` }} />
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          )}

          {activeSection === "revenue" && (
            <section className="grid gap-3 xl:grid-cols-2">
              <article className="glass-card p-5">
                <h3 className="font-display text-4xl font-semibold text-sage-800">Revenue Tracker</h3>
                <div className="mt-4 grid gap-2">
                  <Metric title="Total Revenue (Completed)" value={formatInr(revenueStats.completedRevenue)} />
                  <Metric title="Pending Pipeline Value" value={formatInr(revenueStats.pendingPipeline)} />
                  <Metric title="Average Completed Order Value" value={formatInr(revenueStats.averageCompletedOrderValue)} />
                  <Metric title="Completed Orders" value={String(revenueStats.completedCount)} />
                </div>
              </article>

              <article className="glass-card p-5">
                <h3 className="font-display text-4xl font-semibold text-sage-800">Revenue Notes</h3>
                <div className="mt-4 grid gap-2">
                  <Metric title="Total Orders" value={String(orders.length)} />
                  <Metric title="Current Pending Orders" value={String(pendingOrders)} />
                </div>
                <p className="mt-3 rounded-xl border border-dashed border-sage-300 p-3 text-sm text-sage-600">
                  {revenueStats.completedRevenue > 0
                    ? `Completed revenue is ${formatInr(revenueStats.completedRevenue)}. Pending pipeline stands at ${formatInr(revenueStats.pendingPipeline)}.`
                    : "No revenue trends yet. Add completed orders to start tracking."}
                </p>
              </article>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function Metric({ title, value }) {
  return (
    <article className="rounded-xl border border-sage-200 bg-white p-3">
      <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-sage-600">{title}</p>
      <strong className="mt-1 block font-display text-3xl text-sage-700">{value}</strong>
    </article>
  );
}
