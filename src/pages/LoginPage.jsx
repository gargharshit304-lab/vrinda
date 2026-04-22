import { useEffect, useMemo, useState } from "react";
import SiteNav from "../components/SiteNav";

const STORAGE_KEY = "vrinda.demoAccount";

const slides = [
  "https://images.unsplash.com/photo-1608571423539-e951a5f2f25f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1528219089976-0757f9fbb6bb?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1496417263034-38ec4f0b665a?auto=format&fit=crop&w=1200&q=80"
];

export default function LoginPage() {
  const [tab, setTab] = useState("signin");
  const [slideIndex, setSlideIndex] = useState(0);
  const [signinStatus, setSigninStatus] = useState("");
  const [signupStatus, setSignupStatus] = useState("");
  const [toast, setToast] = useState({ show: false, kind: "success", text: "" });

  const [signinForm, setSigninForm] = useState({ email: "", password: "", rememberMe: false });
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false
  });

  const panelMeta = useMemo(
    () =>
      tab === "signin"
        ? { title: "Welcome back", copy: "Sign in with your email and password to continue." }
        : { title: "Create your account", copy: "Set up a new Vrinda account with your email and password." },
    [tab]
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlideIndex((current) => (current + 1) % slides.length);
    }, 3000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast.show) {
      return undefined;
    }
    const timer = window.setTimeout(() => setToast((old) => ({ ...old, show: false })), 2200);
    return () => window.clearTimeout(timer);
  }, [toast.show]);

  const showToast = (kind, text) => {
    setToast({ show: true, kind, text });
  };

  const readAccount = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  };

  const saveAccount = (account) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
  };

  const handleSignup = (event) => {
    event.preventDefault();
    const { name, email, password, confirmPassword, acceptTerms } = signupForm;

    if (!name.trim() || !email.trim() || !password || !confirmPassword) {
      setSignupStatus("Please complete every field.");
      showToast("error", "Signup unsuccessful");
      return;
    }

    if (!acceptTerms) {
      setSignupStatus("Please agree to the terms before creating an account.");
      showToast("error", "Signup unsuccessful");
      return;
    }

    if (password.length < 8) {
      setSignupStatus("Password must be at least 8 characters long.");
      showToast("error", "Signup unsuccessful");
      return;
    }

    if (password !== confirmPassword) {
      setSignupStatus("Passwords do not match.");
      showToast("error", "Signup unsuccessful");
      return;
    }

    saveAccount({ name: name.trim(), email: email.trim().toLowerCase(), password });
    setSignupStatus(`Account created for ${name.trim()}. You can sign in now.`);
    showToast("success", "Signup successful");
    setSignupForm({ name: "", email: "", password: "", confirmPassword: "", acceptTerms: false });

    window.setTimeout(() => {
      setTab("signin");
      setSigninForm((prev) => ({ ...prev, email: email.trim().toLowerCase(), password: "" }));
    }, 1200);
  };

  const handleSignin = (event) => {
    event.preventDefault();
    const account = readAccount();
    const email = signinForm.email.trim().toLowerCase();

    if (!email || !signinForm.password) {
      setSigninStatus("Enter your email and password.");
      return;
    }

    if (!account) {
      setSigninStatus("No account exists yet. Switch to Sign Up first.");
      return;
    }

    if (account.email !== email || account.password !== signinForm.password) {
      setSigninStatus("Email or password is incorrect.");
      return;
    }

    setSigninStatus(`Signed in as ${account.name}.`);
  };

  return (
    <div className="pb-10">
      <SiteNav />
      <main className="mx-auto mt-6 grid w-[min(1280px,94vw)] overflow-hidden rounded-[32px] border border-sage-200/80 bg-white/50 shadow-soft backdrop-blur lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative min-h-[380px] overflow-hidden">
          {slides.map((slide, idx) => (
            <img
              key={slide}
              src={slide}
              alt="Vrinda showcase"
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                idx === slideIndex ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/10 to-black/20" />
        </section>

        <section className="relative bg-white/80 p-6 sm:p-10">
          <div
            className={`pointer-events-none absolute right-4 top-4 rounded-xl border px-4 py-2 text-sm font-bold ${
              toast.kind === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-rose-200 bg-rose-50 text-rose-700"
            } transition ${toast.show ? "opacity-100" : "opacity-0"}`}
          >
            {toast.text}
          </div>

          <h1 className="font-display text-5xl font-bold leading-none text-sage-800">Vrinda</h1>

          <div className="mt-5 inline-flex rounded-full border border-sage-200 bg-white p-1">
            <button
              onClick={() => {
                setTab("signin");
                setSignupStatus("");
              }}
              className={`rounded-full px-4 py-2 text-sm font-extrabold transition ${
                tab === "signin" ? "bg-sage-700 text-white" : "text-sage-700"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setTab("signup");
                setSigninStatus("");
              }}
              className={`rounded-full px-4 py-2 text-sm font-extrabold transition ${
                tab === "signup" ? "bg-sage-700 text-white" : "text-sage-700"
              }`}
            >
              Sign Up
            </button>
          </div>

          <div className="mt-5">
            <h2 className="font-display text-4xl font-semibold leading-[0.95] text-sage-900">{panelMeta.title}</h2>
            <p className="mt-2 text-sm text-sage-600">{panelMeta.copy}</p>
          </div>

          {tab === "signin" ? (
            <form onSubmit={handleSignin} className="mt-6 space-y-3">
              <label className="block text-sm font-bold text-sage-800">
                Email address
                <input
                  type="email"
                  required
                  value={signinForm.email}
                  onChange={(event) => setSigninForm((old) => ({ ...old, email: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-3 outline-none transition focus:border-sage-400"
                />
              </label>

              <label className="block text-sm font-bold text-sage-800">
                Password
                <input
                  type="password"
                  required
                  value={signinForm.password}
                  onChange={(event) => setSigninForm((old) => ({ ...old, password: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-3 outline-none transition focus:border-sage-400"
                />
              </label>

              <button className="w-full rounded-full bg-gradient-to-r from-sage-700 to-sage-500 px-5 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:shadow-lg">
                Sign In
              </button>
              <p className="min-h-5 text-sm font-bold text-sage-700">{signinStatus}</p>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="mt-6 space-y-3">
              <label className="block text-sm font-bold text-sage-800">
                Full name
                <input
                  type="text"
                  required
                  value={signupForm.name}
                  onChange={(event) => setSignupForm((old) => ({ ...old, name: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-3 outline-none transition focus:border-sage-400"
                />
              </label>

              <label className="block text-sm font-bold text-sage-800">
                Email address
                <input
                  type="email"
                  required
                  value={signupForm.email}
                  onChange={(event) => setSignupForm((old) => ({ ...old, email: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-3 outline-none transition focus:border-sage-400"
                />
              </label>

              <label className="block text-sm font-bold text-sage-800">
                Create password
                <input
                  type="password"
                  required
                  minLength={8}
                  value={signupForm.password}
                  onChange={(event) => setSignupForm((old) => ({ ...old, password: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-3 outline-none transition focus:border-sage-400"
                />
              </label>

              <label className="block text-sm font-bold text-sage-800">
                Confirm password
                <input
                  type="password"
                  required
                  minLength={8}
                  value={signupForm.confirmPassword}
                  onChange={(event) => setSignupForm((old) => ({ ...old, confirmPassword: event.target.value }))}
                  className="mt-1 w-full rounded-xl border border-sage-200 bg-white px-3 py-3 outline-none transition focus:border-sage-400"
                />
              </label>

              <label className="flex items-center gap-2 text-sm font-semibold text-sage-700">
                <input
                  type="checkbox"
                  checked={signupForm.acceptTerms}
                  onChange={(event) => setSignupForm((old) => ({ ...old, acceptTerms: event.target.checked }))}
                />
                I agree to the terms
              </label>

              <button className="w-full rounded-full bg-gradient-to-r from-sage-700 to-sage-500 px-5 py-3 text-sm font-extrabold text-white transition hover:-translate-y-0.5 hover:shadow-lg">
                Create Account
              </button>
              <p className="min-h-5 text-sm font-bold text-sage-700">{signupStatus}</p>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
