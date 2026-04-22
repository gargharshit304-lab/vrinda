import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";

const navLinkClass = ({ isActive }) =>
  `group relative rounded-full px-1 py-1 text-sm font-semibold tracking-[0.04em] transition-all duration-300 ease-in-out ${
    isActive ? "text-[#1f3d2b]" : "text-sage-700/75 hover:text-[#1f3d2b]"
  }`;

export default function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-3 z-30 mx-auto w-[min(1120px,94vw)] rounded-[28px] border px-4 py-3 backdrop-blur-2xl transition-all duration-300 ease-in-out md:px-5 ${
        scrolled
          ? "border-white/70 bg-white/78 shadow-[0_20px_50px_rgba(31,61,43,0.16)]"
          : "border-white/40 bg-white/55 shadow-[0_12px_35px_rgba(31,61,43,0.08)]"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <Link to="/" className="flex items-start gap-3" onClick={() => setMobileOpen(false)}>
          <span className="mt-1 grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-sage-700 to-sage-400 text-white shadow-md shadow-sage-800/15">
            <LeafIcon />
          </span>
          <span className="flex flex-col">
            <span className="font-display text-[2.05rem] font-semibold tracking-[0.08em] text-[#1f3d2b] md:text-[2.25rem]">
              Vrinda
            </span>
            <span className="text-[0.68rem] font-extrabold uppercase tracking-[0.34em] text-sage-700/75">
              Botanical Rituals
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-3 md:flex lg:gap-4">
          <NavLink to="/" className={navLinkClass}>
            <span className="relative inline-flex items-center pb-1.5">
              Home
              <span className="absolute -bottom-0.5 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full bg-[#1f3d2b] transition-all duration-300 group-hover:w-8" />
            </span>
          </NavLink>
          <NavLink to="/shop" className={navLinkClass}>
            <span className="relative inline-flex items-center pb-1.5">
              Shop
              <span className="absolute -bottom-0.5 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full bg-[#1f3d2b] transition-all duration-300 group-hover:w-8" />
            </span>
          </NavLink>
          <NavLink to="/login" className={navLinkClass}>
            <span className="relative inline-flex items-center pb-1.5">
              Login
              <span className="absolute -bottom-0.5 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full bg-[#1f3d2b] transition-all duration-300 group-hover:w-8" />
            </span>
          </NavLink>
          <NavLink to="/admin" className={navLinkClass}>
            <span className="relative inline-flex items-center pb-1.5">
              Admin
              <span className="absolute -bottom-0.5 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full bg-[#1f3d2b] transition-all duration-300 group-hover:w-8" />
            </span>
          </NavLink>
        </nav>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full border border-sage-200/70 bg-white/60 p-2 text-sage-800 transition duration-300 ease-in-out hover:-translate-y-0.5 hover:bg-white/80 hover:shadow-md md:hidden"
          aria-label="Toggle navigation menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((value) => !value)}
        >
          <span className="relative h-5 w-5">
            <span
              className={`absolute left-0 top-1 h-0.5 w-5 rounded-full bg-current transition duration-300 ${
                mobileOpen ? "translate-y-2 rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-2.5 h-0.5 w-5 rounded-full bg-current transition duration-300 ${
                mobileOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-4 h-0.5 w-5 rounded-full bg-current transition duration-300 ${
                mobileOpen ? "-translate-y-2 -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out md:hidden ${
          mobileOpen ? "mt-4 max-h-64 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <nav className="flex flex-col gap-2 pb-1 pt-1">
          <MobileLink to="/" onClick={() => setMobileOpen(false)}>
            Home
          </MobileLink>
          <MobileLink to="/shop" onClick={() => setMobileOpen(false)}>
            Shop
          </MobileLink>
          <MobileLink to="/login" onClick={() => setMobileOpen(false)}>
            Login
          </MobileLink>
          <MobileLink to="/admin" onClick={() => setMobileOpen(false)}>
            Admin
          </MobileLink>
        </nav>
      </div>
    </header>
  );
}

function MobileLink({ to, onClick, children }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `rounded-2xl border px-4 py-3 text-sm font-semibold tracking-[0.03em] transition duration-300 ease-in-out ${
          isActive
            ? "border-sage-700/20 bg-sage-700 text-white shadow-md"
            : "border-sage-200/80 bg-white/75 text-sage-800 hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

function LeafIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 text-white"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 4s-7 0-12 5S3 20 3 20s7 0 12-5 5-11 5-11Z" />
      <path d="M8 16c2-2 5-5 9-7" />
    </svg>
  );
}
