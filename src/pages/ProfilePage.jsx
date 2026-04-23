import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import SiteNav from "../components/SiteNav";
import { getOrders } from "../data/orderStorage";

const AUTH_STORAGE_KEY = "vrinda.currentUser";
const VALID_TABS = ["profile", "orders", "wishlist", "addresses", "settings"];

const wishlistItems = [
  {
    id: "W-01",
    name: "Lemon Fresh Ayur Soap",
    price: "Rs 349",
    image: "/images/soap-lemon.jpeg"
  },
  {
    id: "W-02",
    name: "Almond Milk Moisture Bar",
    price: "Rs 459",
    image: "/images/soap-almond.jpeg"
  },
  {
    id: "W-03",
    name: "Golden Tiger Haldi Soap",
    price: "Rs 479",
    image: "/images/soap-golden-tiger.jpeg"
  }
];

const savedAddresses = [
  {
    label: "Home",
    person: "Harshit Sharma",
    phone: "+91 98765 43210",
    line: "26, Green Valley Residency, Jaipur, Rajasthan 302001"
  },
  {
    label: "Office",
    person: "Harshit Sharma",
    phone: "+91 98765 43210",
    line: "4th Floor, Amber Business Park, MI Road, Jaipur 302004"
  }
];

const formatInr = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "-";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
};

export default function ProfilePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [orders, setOrders] = useState(() => getOrders());
  const [expandedOrderId, setExpandedOrderId] = useState("");

  const [profileForm, setProfileForm] = useState({
    fullName: "Harshit",
    email: "harshit@example.com",
    phone: "+91 98765 43210",
    address: "26, Green Valley Residency, Jaipur"
  });

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab && VALID_TABS.includes(tab)) {
      setActiveTab(tab);
      return;
    }
    setActiveTab("profile");
  }, [location.search]);

  useEffect(() => {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsedUser = JSON.parse(raw);
      setProfileForm((prev) => ({
        ...prev,
        fullName: parsedUser?.name || prev.fullName,
        email: parsedUser?.email || prev.email
      }));
    } catch {
      // Keep defaults if local storage data is malformed.
    }
  }, []);

  useEffect(() => {
    const syncOrders = () => setOrders(getOrders());
    window.addEventListener("storage", syncOrders);
    window.addEventListener("vrinda-orders-changed", syncOrders);
    return () => {
      window.removeEventListener("storage", syncOrders);
      window.removeEventListener("vrinda-orders-changed", syncOrders);
    };
  }, []);

  const currentUser = useMemo(() => {
    return {
      name: profileForm.fullName || "Harshit",
      email: profileForm.email || "harshit@example.com"
    };
  }, [profileForm.fullName, profileForm.email]);

  const initials =
    currentUser.name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "H";

  const openTab = (tab) => {
    setActiveTab(tab);
    navigate(tab === "profile" ? "/profile" : `/profile?tab=${tab}`);
  };

  const handleLogout = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    window.dispatchEvent(new Event("vrinda-auth-changed"));
    navigate("/");
  };

  return (
    <div className="pb-12">
      <SiteNav />
      <main className="mx-auto mt-6 w-[min(1200px,94vw)]">
        <section className="grid items-start gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="glass-card rounded-3xl border border-white/70 bg-[#f8f3ea]/90 p-5 shadow-[0_16px_30px_rgba(31,61,43,0.08)] lg:sticky lg:top-28">
            <div className="rounded-2xl border border-white/70 bg-white/70 p-4 text-center shadow-sm">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-sage-700 to-sage-500 text-lg font-extrabold text-white shadow-md">
                {initials}
              </div>
              <h1 className="mt-3 text-lg font-bold text-sage-800">{currentUser.name}</h1>
              <p className="text-sm text-sage-700/80">{currentUser.email}</p>
            </div>

            <div className="mt-4 hidden space-y-1.5 lg:block">
              <SidebarButton label="My Profile" active={activeTab === "profile"} onClick={() => openTab("profile")} />
              <SidebarButton label="My Orders" active={activeTab === "orders"} onClick={() => openTab("orders")} />
              <SidebarButton label="Wishlist" active={activeTab === "wishlist"} onClick={() => openTab("wishlist")} />
              <SidebarButton label="Addresses" active={activeTab === "addresses"} onClick={() => openTab("addresses")} />
              <SidebarButton label="Settings" active={activeTab === "settings"} onClick={() => openTab("settings")} />
              <button
                type="button"
                onClick={handleLogout}
                className="mt-2 w-full rounded-xl border border-rose-200/80 bg-rose-50 px-4 py-2.5 text-left text-sm font-semibold text-rose-700 transition duration-300 hover:bg-rose-100"
              >
                Logout
              </button>
            </div>
          </aside>

          <section className="space-y-4">
            <div className="glass-card rounded-2xl border border-white/70 bg-white/65 p-2 lg:hidden">
              <div className="flex gap-2 overflow-x-auto pb-1">
                <MobileTab label="Profile" active={activeTab === "profile"} onClick={() => openTab("profile")} />
                <MobileTab label="Orders" active={activeTab === "orders"} onClick={() => openTab("orders")} />
                <MobileTab label="Wishlist" active={activeTab === "wishlist"} onClick={() => openTab("wishlist")} />
                <MobileTab label="Addresses" active={activeTab === "addresses"} onClick={() => openTab("addresses")} />
                <MobileTab label="Settings" active={activeTab === "settings"} onClick={() => openTab("settings")} />
              </div>
            </div>

            <div key={activeTab} className="animate-fadeUp">
              {activeTab === "profile" && (
                <section className="glass-card rounded-3xl border border-white/70 bg-white/65 p-6 shadow-soft sm:p-8">
                  <div className="mb-5 flex items-center justify-between gap-2">
                    <h2 className="font-display text-4xl font-semibold text-sage-800">My Profile</h2>
                    <button
                      type="button"
                      onClick={() => setIsEditing((value) => !value)}
                      className="rounded-full bg-sage-700 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-white transition duration-300 hover:-translate-y-0.5 hover:bg-sage-800"
                    >
                      {isEditing ? "Save" : "Edit Profile"}
                    </button>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <ProfileField
                      label="Full Name"
                      value={profileForm.fullName}
                      disabled={!isEditing}
                      onChange={(value) => setProfileForm((prev) => ({ ...prev, fullName: value }))}
                    />
                    <ProfileField
                      label="Email"
                      value={profileForm.email}
                      disabled={!isEditing}
                      onChange={(value) => setProfileForm((prev) => ({ ...prev, email: value }))}
                    />
                    <ProfileField
                      label="Phone Number"
                      value={profileForm.phone}
                      disabled={!isEditing}
                      onChange={(value) => setProfileForm((prev) => ({ ...prev, phone: value }))}
                    />
                    <ProfileField
                      label="Address"
                      value={profileForm.address}
                      disabled={!isEditing}
                      onChange={(value) => setProfileForm((prev) => ({ ...prev, address: value }))}
                    />
                  </div>
                </section>
              )}

              {activeTab === "orders" && (
                <section className="space-y-3">
                  <h2 className="font-display text-4xl font-semibold text-sage-800">My Orders</h2>
                  {orders.length > 0 ? (
                    orders.map((order) => {
                      const isExpanded = expandedOrderId === order.id;

                      return (
                        <article
                          key={order.id}
                          className="glass-card rounded-3xl border border-white/70 bg-white/65 p-4 shadow-soft"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-sage-700/75">Order ID</p>
                              <p className="text-base font-extrabold text-sage-800">{order.id}</p>
                              <p className="text-sm font-medium text-sage-700">{formatDate(order.date)}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                                  order.status === "Delivered"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {order.status || "Processing"}
                              </span>
                              <button
                                type="button"
                                onClick={() => setExpandedOrderId((current) => (current === order.id ? "" : order.id))}
                                className="rounded-full border border-sage-200/80 bg-white/85 px-3 py-1.5 text-xs font-extrabold uppercase tracking-[0.1em] text-sage-800 transition duration-300 hover:-translate-y-0.5 hover:bg-white"
                              >
                                {isExpanded ? "Hide Details" : "View Details"}
                              </button>
                            </div>
                          </div>

                          {isExpanded ? (
                            <div className="mt-4 rounded-2xl border border-sage-200/70 bg-[#faf7f0]/85 p-4">
                              <div className="space-y-2">
                                {(order.items || []).map((item) => (
                                  <div key={`${order.id}-${item.id}`} className="flex items-start justify-between gap-3 text-sm">
                                    <p className="min-w-0 font-semibold text-sage-800">
                                      {item.name} <span className="font-medium text-sage-600">x {item.quantity}</span>
                                    </p>
                                    <p className="font-extrabold text-sage-800">{formatInr(Number(item.price || 0) * Number(item.quantity || 0))}</p>
                                  </div>
                                ))}
                              </div>

                              <div className="mt-3 h-px bg-sage-200/80" />
                              <div className="mt-3 flex items-center justify-between">
                                <p className="text-sm font-bold text-sage-700">Total</p>
                                <p className="text-base font-extrabold text-sage-800">{formatInr(order.total || 0)}</p>
                              </div>
                            </div>
                          ) : null}
                        </article>
                      );
                    })
                  ) : (
                    <div className="glass-card rounded-2xl border border-white/70 bg-white/65 p-6 text-sm font-medium text-sage-700">
                      You have not placed any orders yet.
                    </div>
                  )}
                </section>
              )}

              {activeTab === "wishlist" && (
                <section className="space-y-3">
                  <h2 className="font-display text-4xl font-semibold text-sage-800">Wishlist</h2>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {wishlistItems.map((item) => (
                      <article
                        key={item.id}
                        className="glass-card group rounded-3xl border border-white/70 bg-white/65 p-4 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_30px_rgba(31,61,43,0.12)]"
                      >
                        <div className="overflow-hidden rounded-2xl">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-44 w-full object-cover transition duration-700 group-hover:scale-105"
                          />
                        </div>
                        <h3 className="mt-3 text-base font-bold text-sage-800">{item.name}</h3>
                        <p className="text-sm font-semibold text-sage-700">{item.price}</p>
                        <button className="mt-3 w-full rounded-full bg-sage-700 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-white transition duration-300 hover:-translate-y-0.5 hover:bg-sage-800">
                          Move to Cart
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {activeTab === "addresses" && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-4xl font-semibold text-sage-800">Addresses</h2>
                    <button className="rounded-full border border-sage-200/80 bg-white/80 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-sage-800 transition duration-300 hover:-translate-y-0.5 hover:bg-white">
                      Add New Address
                    </button>
                  </div>

                  <div className="space-y-3">
                    {savedAddresses.map((address) => (
                      <article key={address.label} className="glass-card rounded-3xl border border-white/70 bg-white/65 p-5 shadow-soft">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-sage-800">{address.label}</h3>
                          <span className="rounded-full bg-sage-700/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-sage-700">
                            Default
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-semibold text-sage-700">{address.person}</p>
                        <p className="text-sm text-sage-700/85">{address.phone}</p>
                        <p className="mt-1 text-sm text-sage-700/85">{address.line}</p>
                      </article>
                    ))}
                  </div>
                </section>
              )}

              {activeTab === "settings" && (
                <section className="space-y-3">
                  <h2 className="font-display text-4xl font-semibold text-sage-800">Settings</h2>

                  <article className="glass-card rounded-3xl border border-white/70 bg-white/65 p-6 shadow-soft">
                    <h3 className="text-lg font-bold text-sage-800">Change Password</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <input
                        type="password"
                        placeholder="Current password"
                        className="rounded-xl border border-sage-200/80 bg-white/90 px-3 py-2.5 text-sm text-sage-800 outline-none transition focus:border-sage-400"
                      />
                      <input
                        type="password"
                        placeholder="New password"
                        className="rounded-xl border border-sage-200/80 bg-white/90 px-3 py-2.5 text-sm text-sage-800 outline-none transition focus:border-sage-400"
                      />
                    </div>
                    <button className="mt-4 rounded-full bg-sage-700 px-5 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-white transition duration-300 hover:-translate-y-0.5 hover:bg-sage-800">
                      Update Password
                    </button>
                  </article>

                  <article className="glass-card rounded-3xl border border-white/70 bg-white/65 p-6 shadow-soft">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold text-sage-800">Notifications</h3>
                        <p className="text-sm text-sage-700/85">Get order updates and new product alerts.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotificationsEnabled((value) => !value)}
                        className={`relative h-8 w-14 rounded-full transition duration-300 ${
                          notificationsEnabled ? "bg-sage-700" : "bg-sage-200"
                        }`}
                        aria-pressed={notificationsEnabled}
                      >
                        <span
                          className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-all duration-300 ${
                            notificationsEnabled ? "left-7" : "left-1"
                          }`}
                        />
                      </button>
                    </div>
                  </article>
                </section>
              )}
            </div>
          </section>
        </section>
      </main>
    </div>
  );
}

function SidebarButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl px-4 py-2.5 text-left text-sm font-semibold tracking-[0.02em] transition duration-300 ease-in-out ${
        active
          ? "bg-sage-700 text-white shadow-[0_10px_20px_rgba(31,61,43,0.22)]"
          : "text-sage-800 hover:bg-white/75 hover:text-[#1f3d2b]"
      }`}
    >
      {label}
    </button>
  );
}

function MobileTab({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-extrabold uppercase tracking-[0.08em] transition duration-300 ${
        active
          ? "bg-sage-700 text-white shadow-[0_10px_20px_rgba(31,61,43,0.22)]"
          : "bg-white/75 text-sage-800"
      }`}
    >
      {label}
    </button>
  );
}

function ProfileField({ label, value, onChange, disabled }) {
  return (
    <label className="text-sm font-bold text-sage-800">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className={`mt-1 w-full rounded-xl border px-3 py-3 text-sm outline-none transition ${
          disabled
            ? "border-sage-200/70 bg-sage-100/60 text-sage-700"
            : "border-sage-300/80 bg-white/90 text-sage-800 focus:border-sage-500"
        }`}
      />
    </label>
  );
}
