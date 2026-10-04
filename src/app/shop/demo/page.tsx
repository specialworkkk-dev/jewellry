import Link from "next/link";
import { ArrowRight, BadgeCheck, MapPin, MessageCircle, ShoppingBag, Sparkles } from "lucide-react";
import { StoreImage } from "@/components/public/StoreImage";

const whatsappNumber = "919876543210";
const brandName = "LuxeStore";
const supportEmail = "support@luxestore.com";

const featuredProducts = [
  {
    name: "Royal Emerald Necklace",
    price: "₹58,900",
    image: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Pearl Halo Ring",
    price: "₹24,500",
    image: "https://images.unsplash.com/photo-1602173574767-37ac01994b2a?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Classic Gold Bangle",
    price: "₹36,200",
    image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=900&q=80",
  },
  {
    name: "Diamond Bridal Set",
    price: "₹89,900",
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&q=80",
  },
].map((product) => ({
  ...product,
  enquiryUrl: `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi ${brandName}, I want to enquire about ${product.name}.`)}`,
}));

export default function DemoStorePage() {
  return (
    <div className="min-h-screen bg-[#f9f6f2] text-gray-900">
      <header className="border-b border-amber-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold">L</div>
            <div>
              <p className="font-serif text-xl font-semibold">{brandName}</p>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-gray-600">
            <a href="#collection" className="hover:text-gray-900">Collection</a>
            <a href="#about" className="hover:text-gray-900">About</a>
            <a href="#contact" className="hover:text-gray-900">Contact</a>
          </nav>
          <a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi ${brandName}, I want to enquire about a jewellery piece.`)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-amber-500 text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-amber-600">
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.18),_transparent_50%)]" />
          <div className="max-w-6xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center relative z-10">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                <Sparkles className="w-3.5 h-3.5" /> Premium handcrafted jewellery
              </span>
              <h1 className="mt-6 text-4xl md:text-6xl font-serif font-bold tracking-tight">
                Crafted for life’s <span className="text-amber-600">beautiful moments</span>
              </h1>
              <p className="mt-5 text-lg text-gray-600 max-w-xl">
                Discover heirloom-worthy rings, necklaces, and bridal pieces designed with purity, beauty, and modern elegance.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <a href="#collection" className="inline-flex items-center gap-2 rounded-full bg-gray-900 text-white px-6 py-3 font-medium hover:bg-black">
                  <ShoppingBag className="w-4 h-4" /> Explore collection
                </a>
                <Link href="/register" className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 hover:border-gray-400">
                  Open your shop <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-amber-100 bg-white p-3 shadow-xl shadow-amber-100/50">
              <img
                src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1200&q=80"
                alt="Jewellery showcase"
                className="w-full h-[520px] object-cover rounded-[1.5rem]"
              />
            </div>
          </div>
        </section>

        <section id="collection" className="max-w-6xl mx-auto px-4 py-16">
          <div className="flex items-center justify-between gap-4 mb-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">Collection</p>
              <h2 className="mt-2 text-3xl font-serif font-bold">Featured designs</h2>
            </div>
            <span className="text-sm text-gray-500">Handpicked for ceremonies & daily shine</span>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <article key={product.name} className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow">
                <div className="aspect-[4/5] overflow-hidden">
                  <StoreImage
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-500">Fine jewellery</p>
                  <h3 className="mt-1 text-lg font-medium text-gray-900">{product.name}</h3>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-semibold text-gray-900">{product.price}</span>
                    <a href={product.enquiryUrl} target="_blank" rel="noreferrer" className="rounded-full bg-amber-500 px-3 py-1.5 text-xs font-medium text-white inline-flex items-center hover:bg-amber-600">Enquire</a>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="about" className="bg-white border-t border-amber-100">
          <div className="max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-gray-200 p-6 bg-gray-50">
              <BadgeCheck className="w-8 h-8 text-amber-600" />
              <h3 className="mt-4 text-xl font-semibold">Hallmarked quality</h3>
              <p className="mt-2 text-gray-600">Certified purity and authentic craftsmanship for every collection.</p>
            </div>
            <div className="rounded-2xl border border-gray-200 p-6 bg-gray-50">
              <MapPin className="w-8 h-8 text-amber-600" />
              <h3 className="mt-4 text-xl font-semibold">Trusted city location</h3>
              <p className="mt-2 text-gray-600">Convenient store visits, personal consultation, and jewellery guidance.</p>
            </div>
            <div className="rounded-2xl border border-gray-200 p-6 bg-gray-50">
              <MessageCircle className="w-8 h-8 text-amber-600" />
              <h3 className="mt-4 text-xl font-semibold">WhatsApp-first service</h3>
              <p className="mt-2 text-gray-600">Quick enquiries, product conversations, and direct customer support.</p>
            </div>
          </div>
        </section>
      </main>

      <footer id="contact" className="border-t border-amber-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <p>© 2026 {brandName}. Crafted for every celebration.</p>
          <div className="flex items-center gap-4">
            <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" className="hover:text-gray-900">WhatsApp</a>
            <a href={`mailto:${supportEmail}`} className="hover:text-gray-900">Email</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
