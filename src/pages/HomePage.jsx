import { useEffect, useState } from "react";
import SiteNav from "../components/SiteNav";

const highlights = [
  "100% plant-derived blends",
  "Slow-poured small batches",
  "Mindfully sourced ingredients"
];

const collections = [
  {
    title: "Lemon Zest Revival",
    copy: "Bright citrus-inspired herbal soap crafted for a fresh and radiant cleanse.",
    metaA: "Vitamin Boost",
    metaB: "Refreshing",
    image: "/images/soap-lemon.jpeg"
  },
  {
    title: "Almond Essence Bar",
    copy: "Nourishing almond milk blend for soft, hydrated, and comforted skin.",
    metaA: "Rich Moisture",
    metaB: "Best Seller",
    image: "/images/soap-almond.jpeg"
  },
  {
    title: "Golden Glow Tiger",
    copy: "Haldi-infused artisan bar designed to uplift skin tone with earthy warmth.",
    metaA: "Haldi Extract",
    metaB: "New",
    image: "/images/soap-golden-tiger.jpeg"
  }
];

const soapFeatures = [
  "Deep cleansing",
  "Skin nourishing",
  "Chemical-free",
  "Suitable for all skin types"
];

const signatureSoapFeatures = [
  "Luxury handcrafted finish",
  "Botanical aroma therapy",
  "Natural ingredient blend",
  "Small-batch artistry"
];

export default function HomePage() {
  const [parallaxY, setParallaxY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const value = window.scrollY * 0.2;
      setParallaxY(Math.min(value, 130));
    };

    const revealElements = Array.from(document.querySelectorAll(".section-reveal"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.15 }
    );

    revealElements.forEach((element) => observer.observe(element));
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="pb-20">
      <SiteNav />
      <main className="space-y-10 pt-6">
        <section className="relative min-h-[82vh] overflow-hidden">
          <div
            className="hero-bg-layer"
            style={{ transform: `translateY(${parallaxY}px) scale(1.08)` }}
            aria-hidden="true"
          />
          <div className="hero-overlay" aria-hidden="true" />

          <div className="mx-auto flex min-h-[82vh] w-[min(1120px,94vw)] items-center py-10 md:py-16">
            <section className="section-reveal glass-card hero-float max-w-3xl overflow-hidden rounded-[28px] border border-white/45 bg-white/16 p-8 shadow-2xl backdrop-blur-xl md:p-14">
              <p className="mb-5 inline-flex rounded-full border border-white/45 bg-white/25 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.2em] text-earth-100">
                Botanical Rituals
              </p>
              <h1 className="max-w-3xl font-display text-5xl font-bold leading-[0.9] text-white md:text-7xl">
                Stillness, bottled in herbs and flame.
              </h1>
              <p className="mt-6 max-w-2xl text-base text-earth-100/95 md:text-lg">
                Vrinda creates premium herbal essentials and artisan candles designed for serene mornings, grounded evenings, and homes that feel intentionally calm.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button className="premium-btn">Explore Collection</button>
                <button className="rounded-full border border-white/55 bg-white/20 px-6 py-3 text-sm font-extrabold text-white transition duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-lg">
                  Watch Ritual Film
                </button>
              </div>
              <div className="mt-7 flex flex-wrap gap-4 text-sm font-semibold text-earth-100">
                {highlights.map((item) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <i className="h-2 w-2 rounded-full bg-emerald-200" />
                    {item}
                  </span>
                ))}
              </div>
            </section>
          </div>
        </section>

        <section className="section-reveal mx-auto w-[min(1120px,94vw)]">
          <article className="glass-card overflow-hidden rounded-[30px] border border-white/60 bg-gradient-to-br from-[#f9f5ed]/90 via-[#f7f3ea]/85 to-[#edf3ea]/80 p-5 shadow-soft md:p-8">
            <div className="grid items-center gap-6 lg:grid-cols-[1.02fr_0.98fr]">
              <div className="overflow-hidden rounded-[24px] border border-white/55">
                <img
                  src="/images/soap-velvet-rose.jpeg"
                  alt="Handcrafted herbal soaps"
                  className="h-full min-h-[280px] w-full object-cover transition duration-500 ease-in-out hover:scale-105"
                />
              </div>

              <div className="space-y-4">
                <p className="inline-flex rounded-full border border-sage-200/80 bg-white/75 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.16em] text-sage-700">
                  Herbal Care
                </p>
                <h2 className="font-display text-5xl leading-[0.92] text-sage-800">Herbal Soaps</h2>
                <h3 className="text-lg font-semibold text-sage-700">Gentle. Nourishing. Naturally beautiful.</h3>
                <p className="max-w-2xl text-sm leading-relaxed text-sage-700 md:text-base">
                  Our herbal soaps are handcrafted using botanical extracts, essential oils, and natural ingredients that cleanse deeply while remaining gentle on your skin. Each bar is designed to restore balance, hydration, and a natural glow.
                </p>

                <ul className="grid gap-2 text-sm font-semibold text-sage-800 sm:grid-cols-2">
                  {soapFeatures.map((item) => (
                    <li key={item} className="inline-flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sage-700 text-xs font-bold text-white">
                        ✓
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <button className="premium-btn mt-2">Explore Soaps</button>
              </div>
            </div>
          </article>
        </section>

        <section className="section-reveal mx-auto w-[min(1120px,94vw)]">
          <article className="glass-card overflow-hidden rounded-[30px] border border-white/60 bg-gradient-to-br from-[#edf3ea]/85 via-[#f8f5ee]/85 to-[#f6f1e7]/88 p-5 shadow-soft md:p-8">
            <div className="grid items-center gap-6 lg:grid-cols-[0.98fr_1.02fr]">
              <div className="order-2 space-y-4 lg:order-1">
                <p className="inline-flex rounded-full border border-sage-200/80 bg-white/75 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.16em] text-sage-700">
                  Signature Collection
                </p>
                <h2 className="font-display text-5xl leading-[0.92] text-sage-800">Signature Soaps</h2>
                <h3 className="text-lg font-semibold text-sage-700">Crafted textures. Botanical comfort.</h3>
                <p className="max-w-2xl text-sm leading-relaxed text-sage-700 md:text-base">
                  Our signature soaps blend premium extracts, natural oils, and skin-loving botanicals to deliver a nourishing ritual in every wash. Each handcrafted bar is thoughtfully designed to elevate your daily routine with softness, glow, and comfort.
                </p>

                <ul className="grid gap-2 text-sm font-semibold text-sage-800 sm:grid-cols-2">
                  {signatureSoapFeatures.map((item) => (
                    <li key={item} className="inline-flex items-center gap-2">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-sage-700 text-xs font-bold text-white">
                        ✓
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <button className="premium-btn mt-2">Explore Signature Soaps</button>
              </div>

              <div className="order-1 overflow-hidden rounded-[24px] border border-white/55 lg:order-2">
                <img
                  src="/images/soap-saffron.jpeg"
                  alt="Signature saffron soap collection"
                  className="h-full min-h-[280px] w-full object-cover transition duration-500 ease-in-out hover:scale-105"
                />
              </div>
            </div>
          </article>
        </section>

        <section className="mx-auto grid w-[min(1120px,94vw)] gap-5 section-reveal md:grid-cols-3">
          {collections.map((card, index) => (
            <article
              key={card.title}
              className="glass-card group overflow-hidden p-5 transition duration-300 ease-in-out hover:-translate-y-1.5 hover:shadow-2xl"
              style={{ transitionDelay: `${index * 90}ms` }}
            >
              <div className="mb-4 h-48 overflow-hidden rounded-2xl">
                <img
                  src={card.image}
                  alt={card.title}
                  className="h-full w-full object-cover transition duration-500 ease-in-out group-hover:scale-110"
                />
              </div>
              <h2 className="font-display text-3xl font-semibold text-sage-800">{card.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-sage-700">{card.copy}</p>
              <div className="mt-5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-sage-600">
                <span>{card.metaA}</span>
                <span>{card.metaB}</span>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
