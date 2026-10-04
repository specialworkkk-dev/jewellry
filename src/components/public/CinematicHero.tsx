"use client";

interface CinematicHeroProps {
  coverUrl?: string;
  shopName: string;
  shortDescription?: string;
}

export function CinematicHero({ coverUrl, shopName, shortDescription }: CinematicHeroProps) {
  return (
    <div className="relative w-full h-[60vh] md:h-[75vh] lg:h-[85vh] overflow-hidden bg-gray-900 flex items-center justify-center">
      {/* Background Media */}
      {coverUrl ? (
        <img
          src={coverUrl}
          alt={shopName}
          className="absolute inset-0 w-full h-full object-cover animate-in fade-in zoom-in duration-1000"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-300 via-yellow-500 to-amber-600" />
      )}

      {/* Overlay to ensure text readability without killing the vibrant color */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Hero Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto flex flex-col items-center">
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif text-white tracking-wide drop-shadow-lg animate-in slide-in-from-bottom-8 fade-in duration-700">
          {shopName}
        </h1>
        
        <div className="w-24 h-[1px] bg-amber-400 my-6 md:my-8 animate-in zoom-in fade-in duration-700 delay-300 fill-mode-both" />

        <p className="text-lg md:text-2xl text-white font-medium max-w-2xl drop-shadow-md animate-in slide-in-from-bottom-8 fade-in duration-700 delay-500 fill-mode-both">
          {shortDescription || "Discover Timeless Elegance and Master Craftsmanship"}
        </p>

        <div className="mt-10 animate-in fade-in duration-700 delay-700 fill-mode-both">
          <button 
            onClick={() => document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' })}
            className="px-8 py-3 bg-transparent border border-white/50 text-white hover:bg-white hover:text-black transition-all duration-300 tracking-widest text-sm uppercase"
          >
            Explore Collection
          </button>
        </div>
      </div>
    </div>
  );
}
