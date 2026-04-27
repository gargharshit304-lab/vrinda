import { useEffect, useMemo, useState } from "react";
import SiteNav from "../components/SiteNav";
import { fetchMyOrders } from "../data/orderApi";

const formatInr = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(amount) || 0);

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

const getStatusMeta = (status) => {
  const normalized = String(status || "processing").trim().toLowerCase();

  if (normalized === "packed") {
    return { label: "Packed", className: "status-packed" };
  }

  if (normalized === "delivered") {
    return { label: "Delivered", className: "status-delivered" };
  }

  if (normalized === "shipped") {
    return { label: "Out for Delivery", className: "status-out-for-delivery" };
  }

  return { label: "Pending", className: "status-pending" };
};

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError("");
        const data = await fetchMyOrders();
        if (!cancelled) {
          setOrders(data);
        }
      } catch {
        if (!cancelled) {
          setError("We could not load your orders right now.");
          setOrders([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchOrders();

    return () => {
      cancelled = true;
    };
  }, []);

  const orderCards = useMemo(
    () =>
      orders.map((order) => {
        const statusMeta = getStatusMeta(order.orderStatus);
        const orderNumber = order.orderNumber || order._id;
        const items = Array.isArray(order.items) ? order.items : [];
        const totalAmount = order.totalAmount ?? order.totalPrice ?? 0;

        return (
          <article
            key={order._id || orderNumber}
            className="glass-card rounded-3xl border border-white/70 bg-white/70 p-5 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_30px_rgba(31,61,43,0.12)] sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-sage-700/75">Order ID</p>
                <p className="text-lg font-extrabold text-sage-800">{orderNumber}</p>
                <p className="text-sm font-medium text-sage-700">Placed on {formatDate(order.createdAt)}</p>
              </div>

              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${statusMeta.className}`}>
                {statusMeta.label}
              </span>
            </div>

            <div className="mt-5 rounded-2xl border border-sage-200/70 bg-[#faf7f0]/90 p-4">
              <p className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-sage-700/75">Products</p>
              <div className="mt-3 space-y-3">
                {items.map((item, index) => {
                  const productName = item.product?.name || item.name || "Product";
                  const quantity = Number(item.quantity) || 0;
                  const price = Number(item.price) || 0;

                  return (
                    <div key={`${orderNumber}-${item.product?._id || item.name || index}`} className="flex items-start justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-semibold text-sage-800">{productName}</p>
                        <p className="mt-1 text-xs font-medium text-sage-600">Quantity: {quantity}</p>
                      </div>
                      <p className="shrink-0 font-extrabold text-sage-800">{formatInr(price * quantity)}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-sage-200/70 pt-4">
              <p className="text-sm font-bold text-sage-700">Total Price</p>
              <p className="text-lg font-extrabold text-sage-800">{formatInr(totalAmount)}</p>
            </div>
          </article>
        );
      }),
    [orders]
  );

  return (
    <div className="pb-12">
      <SiteNav />

      <main className="mx-auto mt-6 w-[min(1120px,94vw)]">
        <section className="glass-card rounded-[30px] border border-white/70 bg-white/65 p-5 shadow-soft sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-sage-700/75">Order History</p>
              <h1 className="mt-1 font-display text-4xl font-semibold text-sage-800">My Orders</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-sage-700">
                Track every order you have placed, including its current status and the products inside it.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 rounded-3xl border border-sage-200/70 bg-[#faf7f0]/90 p-6 text-sm font-medium text-sage-700">
              Loading your orders...
            </div>
          ) : error ? (
            <div className="mt-6 rounded-3xl border border-rose-200/70 bg-rose-50/95 p-6 text-sm font-medium text-rose-700">
              {error}
            </div>
          ) : orders.length > 0 ? (
            <div className="mt-6 grid gap-4">
              {orderCards}
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-sage-200/70 bg-[#faf7f0]/90 p-8 text-center">
              <p className="text-base font-semibold text-sage-800">Your orders will appear here</p>
              <p className="mt-2 text-sm text-sage-700">Once you place an order, it will show up in this history view.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}