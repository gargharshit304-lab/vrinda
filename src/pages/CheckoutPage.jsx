import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import SiteNav from "../components/SiteNav";
import { clearCart, getCartItems } from "../data/cartStorage";
import { addOrder } from "../data/orderStorage";
import { createOrderRequest } from "../data/orderApi";
import { fetchUserProfile } from "../data/userApi";
import { getAuthToken } from "../data/authStorage";

const deliveryFee = 49;

const initialForm = {
  fullName: "",
  phone: "",
  addressLine: "",
  city: "",
  state: "",
  pincode: "",
  paymentMethod: "",
  upiId: ""
};

const checkoutSteps = [
  { id: 1, title: "Shipping Address" },
  { id: 2, title: "Payment Method" },
  { id: 3, title: "Order Review" }
];

const formatInr = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
};

const getAddressId = (address, index = 0) => String(address?.id || address?._id || `address-${index}`);

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState(() => getCartItems());
  const [formData, setFormData] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profile, setProfile] = useState({ name: "", email: "", phone: "", addresses: [] });
  const [selectedAddressId, setSelectedAddressId] = useState("new");
  const user = getStoredUser();
  const isAdminUser = user?.role === "admin";

  if (isAdminUser) {
    return <Navigate to="/admin" replace />;
  }

  useEffect(() => {
    const syncCart = () => setCartItems(getCartItems());
    window.addEventListener("storage", syncCart);
    window.addEventListener("vrinda-cart-changed", syncCart);
    return () => {
      window.removeEventListener("storage", syncCart);
      window.removeEventListener("vrinda-cart-changed", syncCart);
    };
  }, []);

  useEffect(() => {
    if (!getAuthToken()) {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      if (!getAuthToken()) {
        return;
      }

      try {
        setProfileLoading(true);
        const data = await fetchUserProfile();

        if (cancelled) {
          return;
        }

        const addresses = Array.isArray(data?.addresses) ? data.addresses : [];
        const defaultAddress = addresses.find((address) => address?.isDefault) || addresses[0] || null;

        setProfile({
          name: data?.name || "",
          email: data?.email || "",
          phone: data?.phone || "",
          addresses
        });

        if (defaultAddress) {
          setSelectedAddressId(getAddressId(defaultAddress));
          setFormData((current) => ({
            ...current,
            fullName: defaultAddress.fullName || data?.name || "",
            phone: defaultAddress.phone || data?.phone || "",
            addressLine: defaultAddress.addressLine || "",
            city: defaultAddress.city || "",
            state: defaultAddress.state || "",
            pincode: defaultAddress.pincode || ""
          }));
        } else {
          setSelectedAddressId("new");
          setFormData((current) => ({
            ...current,
            fullName: data?.name || "",
            phone: data?.phone || "",
            addressLine: "",
            city: "",
            state: "",
            pincode: ""
          }));
        }
      } catch (error) {
        if (!cancelled) {
          setErrors((current) => ({
            ...current,
            profile: error?.message || "Unable to load profile data."
          }));
        }
      } finally {
        if (!cancelled) {
          setProfileLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const subtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0),
    [cartItems]
  );

  const total = subtotal > 0 ? subtotal + deliveryFee : 0;

  const syncSelectionToForm = (address) => {
    if (!address) {
      return;
    }

    setFormData((current) => ({
      ...current,
      fullName: address.fullName || profile.name || "",
      phone: address.phone || profile.phone || "",
      addressLine: address.addressLine || "",
      city: address.city || "",
      state: address.state || "",
      pincode: address.pincode || ""
    }));
  };

  const handleAddressSelection = (event) => {
    const nextId = event.target.value;
    setSelectedAddressId(nextId);

    if (nextId === "new") {
      setFormData((current) => ({
        ...current,
        fullName: profile.name || current.fullName || "",
        phone: profile.phone || "",
        addressLine: "",
        city: "",
        state: "",
        pincode: ""
      }));
      return;
    }

    const existingAddress = profile.addresses.find((address, index) => getAddressId(address, index) === nextId);
    syncSelectionToForm(existingAddress);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (["fullName", "phone", "addressLine", "city", "state", "pincode"].includes(name) && selectedAddressId !== "new") {
      setSelectedAddressId("new");
    }

    setFormData((current) => ({ ...current, [name]: value }));
  };

  const validateStep = (step) => {
    const nextErrors = {};

    if (cartItems.length === 0) {
      nextErrors.cart = "Your cart is empty. Please add items before checkout.";
      return nextErrors;
    }

    if (step === 1) {
      const phoneDigits = formData.phone.replace(/\D/g, "");
      const pincodeDigits = formData.pincode.replace(/\D/g, "");

      if (!formData.fullName.trim()) nextErrors.fullName = "Full name is required.";
      if (!phoneDigits) nextErrors.phone = "Phone number is required.";
      else if (!/^\d{10}$/.test(phoneDigits)) nextErrors.phone = "Phone number must be exactly 10 digits.";
      if (!formData.addressLine.trim()) nextErrors.addressLine = "Address line is required.";
      if (!formData.city.trim()) nextErrors.city = "City is required.";
      if (!formData.state.trim()) nextErrors.state = "State is required.";
      if (!pincodeDigits) nextErrors.pincode = "Pincode is required.";
      else if (!/^\d{6}$/.test(pincodeDigits)) nextErrors.pincode = "Pincode must be exactly 6 digits.";
    }

    if (step === 2) {
      if (!formData.paymentMethod) {
        nextErrors.paymentMethod = "Please select a payment method.";
      }

      if (formData.paymentMethod === "upi" && !formData.upiId.trim()) {
        nextErrors.upiId = "Please enter a UPI ID.";
      }
    }

    return nextErrors;
  };

  const goToNextStep = () => {
    const nextErrors = validateStep(currentStep);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setCurrentStep((step) => Math.min(3, step + 1));
    setErrors({});
  };

  const goToPreviousStep = () => {
    setCurrentStep((step) => Math.max(1, step - 1));
    setErrors({});
  };

  const buildShippingAddress = () => ({
    fullName: formData.fullName.trim(),
    phone: formData.phone.replace(/\D/g, ""),
    addressLine: formData.addressLine.trim(),
    city: formData.city.trim(),
    state: formData.state.trim(),
    pincode: formData.pincode.replace(/\D/g, "")
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    const nextErrors = validateStep(3);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!cartItems || cartItems.length === 0) {
      setErrors({ cart: "Your cart is empty. Please add items before checkout." });
      return;
    }

    if (!getAuthToken()) {
      setErrors({ cart: "Please sign in to place your order." });
      navigate("/login");
      return;
    }

    try {
      setIsSubmitting(true);

      const shippingAddress = buildShippingAddress();
      const orderPayload = {
        items: cartItems.map((item) => ({
          productId: item.productId || item.id,
          quantity: Number(item.quantity || 1),
          price: Number(item.price || 0)
        })),
        shippingAddress,
        paymentMethod: formData.paymentMethod === "upi" ? "FAKE_UPI" : "COD"
      };

      const apiOrder = await createOrderRequest(orderPayload);

      const orderData = {
        id: apiOrder?.orderNumber || apiOrder?._id || `VR-${Date.now().toString().slice(-8)}`,
        date: apiOrder?.createdAt || new Date().toISOString(),
        items: cartItems.map((item) => ({
          id: item.productId || item.id,
          name: item.name,
          price: Number(item.price || 0),
          quantity: Number(item.quantity || 0)
        })),
        total: Number(apiOrder?.totalAmount) || total,
        status: "Pending",
        paymentMethod: formData.paymentMethod === "upi" ? "Fake UPI" : "Cash on Delivery",
        deliveryInfo: "Expected delivery in 3-5 business days",
        shippingAddress
      };

      addOrder(orderData);
      clearCart();
      setCartItems([]);
      setFormData(initialForm);
      setErrors({});

      try {
        const refreshedProfile = await fetchUserProfile();
        setProfile({
          name: refreshedProfile?.name || "",
          email: refreshedProfile?.email || "",
          phone: refreshedProfile?.phone || "",
          addresses: Array.isArray(refreshedProfile?.addresses) ? refreshedProfile.addresses : []
        });
      } catch {
        // Non-blocking refresh after order creation.
      }

      navigate("/order-confirmation", { state: { order: orderData } });
    } catch (error) {
      setErrors({ cart: error.message || "Unable to place order right now." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const shippingDisplay = [formData.addressLine, formData.city, formData.state, formData.pincode].filter(Boolean).join(", ");

  return (
    <div className="pb-16">
      <SiteNav />

      <main className="mx-auto w-[min(1200px,94vw)] pt-6">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-sage-700/70">Secure Checkout</p>
            <h1 className="mt-2 font-display text-5xl leading-none text-sage-800">Checkout</h1>
          </div>
          <Link to="/cart" className="text-sm font-semibold text-sage-700 transition duration-300 hover:text-sage-900">
            Back to cart
          </Link>
        </div>

        {errors.cart ? (
          <section className="mb-5 rounded-[26px] border border-amber-200 bg-amber-50 px-5 py-4 text-amber-800 shadow-soft">
            <p className="text-sm font-semibold">{errors.cart}</p>
          </section>
        ) : null}

        {errors.profile ? (
          <section className="mb-5 rounded-[26px] border border-rose-200 bg-rose-50 px-5 py-4 text-rose-700 shadow-soft">
            <p className="text-sm font-semibold">{errors.profile}</p>
          </section>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
          <form onSubmit={handleSubmit} className="glass-card rounded-[30px] border border-white/70 bg-white/72 p-5 shadow-soft md:p-7">
            <div className="mb-5">
              <h2 className="font-display text-3xl text-sage-800">Checkout Steps</h2>
              <p className="mt-2 text-sm leading-relaxed text-sage-700">
                Complete shipping, choose payment, and review your order before placing it.
              </p>
              {profileLoading ? <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-sage-600">Loading saved profile...</p> : null}
            </div>

            <div className="mb-6 grid gap-2 sm:grid-cols-3">
              {checkoutSteps.map((step) => {
                const isActive = currentStep === step.id;
                const isDone = currentStep > step.id;
                return (
                  <div
                    key={step.id}
                    className={`rounded-2xl border px-3 py-3 transition duration-300 ${
                      isActive
                        ? "border-sage-500 bg-sage-700/10"
                        : isDone
                        ? "border-emerald-200 bg-emerald-50"
                        : "border-sage-200/80 bg-white/70"
                    }`}
                  >
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-sage-700/75">Step {step.id}</p>
                    <p className="mt-1 text-sm font-semibold text-sage-800">{step.title}</p>
                  </div>
                );
              })}
            </div>

            {currentStep === 1 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-extrabold text-sage-800">Shipping Address</h3>
                  {profile.addresses.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setSelectedAddressId("new")}
                      className="rounded-full border border-sage-200/80 bg-white/85 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.08em] text-sage-800 transition duration-300 hover:bg-white"
                    >
                      Add New Address
                    </button>
                  ) : null}
                </div>

                {profile.addresses.length > 0 ? (
                  <label className="block space-y-1.5">
                    <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-sage-700/90">Select Address</span>
                    <select
                      value={selectedAddressId}
                      onChange={handleAddressSelection}
                      className="w-full rounded-2xl border border-sage-200/85 bg-white px-4 py-3 text-sm text-sage-800 outline-none transition focus:border-sage-400"
                    >
                      <option value="new">Add New Address</option>
                      {profile.addresses.map((address, index) => {
                        const addressId = getAddressId(address, index);
                        return (
                          <option key={addressId} value={addressId}>
                            {address.fullName || "Saved address"} - {address.addressLine || "Address"}
                          </option>
                        );
                      })}
                    </select>
                  </label>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Full Name"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Your full name"
                    error={errors.fullName}
                    className="sm:col-span-2"
                  />
                  <Field
                    label="Phone Number"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="10-digit phone number"
                    error={errors.phone}
                  />
                  <Field label="City" name="city" value={formData.city} onChange={handleChange} placeholder="Jaipur" error={errors.city} />
                  <Field label="State" name="state" value={formData.state} onChange={handleChange} placeholder="Rajasthan" error={errors.state} />
                  <Field
                    label="Address Line"
                    name="addressLine"
                    value={formData.addressLine}
                    onChange={handleChange}
                    placeholder="House no., street, area"
                    error={errors.addressLine}
                    as="textarea"
                    className="sm:col-span-2"
                  />
                  <Field
                    label="Pincode"
                    name="pincode"
                    value={formData.pincode}
                    onChange={handleChange}
                    placeholder="302001"
                    error={errors.pincode}
                  />
                </div>
              </div>
            ) : null}

            {currentStep === 2 ? (
              <div>
                <h3 className="mb-3 text-lg font-extrabold text-sage-800">Payment Method</h3>
                <div className="space-y-3">
                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-sage-200/80 bg-white/85 p-4 transition hover:border-sage-300">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={formData.paymentMethod === "cod"}
                      onChange={handleChange}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-bold text-sage-800">Cash on Delivery (COD)</p>
                      <p className="text-xs text-sage-700">Pay with cash when your order arrives.</p>
                    </div>
                  </label>

                  <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-sage-200/80 bg-white/85 p-4 transition hover:border-sage-300">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="upi"
                      checked={formData.paymentMethod === "upi"}
                      onChange={handleChange}
                      className="mt-1"
                    />
                    <div>
                      <p className="text-sm font-bold text-sage-800">Fake UPI</p>
                      <p className="text-xs text-sage-700">UI demo only. No real payment integration.</p>
                    </div>
                  </label>

                  {formData.paymentMethod === "upi" ? (
                    <Field
                      label="UPI ID"
                      name="upiId"
                      value={formData.upiId}
                      onChange={handleChange}
                      placeholder="name@upi"
                      error={errors.upiId}
                    />
                  ) : null}
                </div>
                {errors.paymentMethod ? <p className="mt-2 text-xs font-medium text-rose-600">{errors.paymentMethod}</p> : null}
              </div>
            ) : null}

            {currentStep === 3 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-extrabold text-sage-800">Order Review</h3>

                <section className="rounded-2xl border border-sage-200/80 bg-white/85 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-sage-700/75">Shipping</p>
                  <p className="mt-1 text-sm font-semibold text-sage-800">{formData.fullName}</p>
                  <p className="text-sm text-sage-700">{formData.phone}</p>
                  <p className="text-sm text-sage-700">{shippingDisplay || "No address selected yet."}</p>
                </section>

                <section className="rounded-2xl border border-sage-200/80 bg-white/85 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-sage-700/75">Payment</p>
                  <p className="mt-1 text-sm font-semibold text-sage-800">
                    {formData.paymentMethod === "upi" ? "Fake UPI" : "Cash on Delivery"}
                  </p>
                  {formData.paymentMethod === "upi" ? <p className="text-sm text-sage-700">UPI ID: {formData.upiId}</p> : null}
                </section>

                <section className="rounded-2xl border border-sage-200/80 bg-white/85 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-sage-700/75">Items</p>
                  <div className="mt-2 space-y-2">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                        <p className="min-w-0 font-semibold text-sage-800">
                          {item.name} <span className="font-medium text-sage-600">x {item.quantity}</span>
                        </p>
                        <p className="font-extrabold text-sage-800">{formatInr(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  className="rounded-full border border-sage-200/80 bg-white/85 px-6 py-3 text-sm font-bold text-sage-800 transition duration-300 hover:bg-white"
                >
                  Back
                </button>
              ) : null}

              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={goToNextStep}
                  className="rounded-full bg-gradient-to-r from-sage-800 to-sage-600 px-6 py-3 text-sm font-extrabold tracking-[0.04em] text-white shadow-[0_14px_28px_rgba(31,61,43,0.24)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(31,61,43,0.3)]"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-full bg-gradient-to-r from-sage-800 to-sage-600 px-6 py-3 text-sm font-extrabold tracking-[0.04em] text-white shadow-[0_14px_28px_rgba(31,61,43,0.24)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(31,61,43,0.3)]"
                >
                  {isSubmitting ? "Placing Order..." : "Place Order"}
                </button>
              )}

              <button
                type="button"
                onClick={() => navigate("/cart")}
                className="rounded-full border border-sage-200/80 bg-white/85 px-6 py-3 text-sm font-bold text-sage-800 transition duration-300 hover:bg-white"
              >
                Review Cart
              </button>
            </div>
          </form>

          <aside className="glass-card h-fit rounded-[30px] border border-white/70 bg-white/74 p-5 shadow-soft lg:sticky lg:top-28">
            <h2 className="font-display text-3xl text-sage-800">Order summary</h2>

            <div className="mt-5 space-y-3 rounded-2xl border border-sage-200/70 bg-[#faf7f0]/90 p-4">
              {cartItems.length > 0 ? (
                cartItems.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-4 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-sage-800">
                        {item.name} <span className="text-sage-600">x {item.quantity}</span>
                      </p>
                      <p className="mt-1 text-sage-700">{formatInr(item.price)}</p>
                    </div>
                    <span className="font-extrabold text-sage-800">{formatInr(item.price * item.quantity)}</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-sage-700">No items in cart.</p>
              )}

              <div className="h-px bg-sage-200/80" />
              <SummaryRow label="Total price" value={formatInr(total)} strong />
            </div>

            <div className="mt-4 rounded-2xl border border-sage-200/80 bg-white/80 p-4 text-sm leading-relaxed text-sage-700">
              Saved addresses are loaded from your profile. When you use a new shipping address, it is saved to your profile automatically after order placement.
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

function Field({ label, name, value, onChange, placeholder, error, as = "input", className = "" }) {
  const commonClassName = `w-full rounded-2xl border px-4 py-3 text-sm text-sage-800 outline-none transition focus:border-sage-400 ${
    error ? "border-rose-300 bg-rose-50/60" : "border-sage-200/85 bg-white"
  }`;

  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-sage-700/90">{label}</span>
      {as === "textarea" ? (
        <textarea
          name={name}
          value={value}
          onChange={onChange}
          rows={4}
          placeholder={placeholder}
          className={`${commonClassName} resize-none`}
        />
      ) : (
        <input name={name} value={value} onChange={onChange} placeholder={placeholder} className={commonClassName} />
      )}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
    </label>
  );
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div className={`flex items-center justify-between gap-3 ${strong ? "text-base" : "text-sm"}`}>
      <span className={`font-medium text-sage-700 ${strong ? "font-bold text-sage-800" : ""}`}>{label}</span>
      <span className={`font-extrabold text-sage-800 ${strong ? "text-lg" : ""}`}>{value}</span>
    </div>
  );
}