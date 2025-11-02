import { useState, useEffect } from "react";
import { Star, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface OutfitWithRating {
  id: string;
  image_url: string;
  created_at: string;
  file_hash: string | null;
  averageRating: number;
  totalRatings: number;
}

export default function Gallery() {
  const [outfits, setOutfits] = useState<OutfitWithRating[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOutfitsWithRatings();
  }, []);

  const loadOutfitsWithRatings = async () => {
    try {
      setLoading(true);

      // Get all outfits
      const { data: outfitsData, error: outfitsError } = await supabase
        .from("outfits")
        .select("*")
        .order("created_at", { ascending: false });

      if (outfitsError) throw outfitsError;

      if (!outfitsData || outfitsData.length === 0) {
        setOutfits([]);
        setLoading(false);
        return;
      }

      // Get all ratings
      const { data: ratingsData, error: ratingsError } = await supabase
        .from("ratings")
        .select("outfit_id, score");

      if (ratingsError) throw ratingsError;

      // Calculate average rating for each outfit
      const outfitMap = new Map<
        string,
        { count: number; sum: number; outfit: (typeof outfitsData)[0] }
      >();

      outfitsData.forEach((outfit) => {
        outfitMap.set(outfit.id, { count: 0, sum: 0, outfit });
      });

      ratingsData?.forEach((rating) => {
        const entry = outfitMap.get(rating.outfit_id);
        if (entry) {
          entry.count += 1;
          entry.sum += rating.score;
        }
      });

      // Convert to array with calculated averages and sort by rating
      const outfitsWithRatings: OutfitWithRating[] = Array.from(
        outfitMap.values(),
      )
        .map(({ outfit, count, sum }) => ({
          id: outfit.id,
          image_url: outfit.image_url,
          created_at: outfit.created_at,
          file_hash: outfit.file_hash,
          averageRating: count > 0 ? sum / count : 0,
          totalRatings: count,
        }))
        .filter((outfit) => outfit.totalRatings > 0) // Only show outfits with ratings
        .sort((a, b) => b.averageRating - a.averageRating) // Sort by rating descending
        .filter((outfit, index, self) => {
          // Remove duplicates: compare by file_hash (actual photo content)
          // If file_hash is null, fall back to image_url comparison
          if (outfit.file_hash) {
            return (
              index === self.findIndex((o) => o.file_hash === outfit.file_hash)
            );
          }
          return (
            index === self.findIndex((o) => o.image_url === outfit.image_url)
          );
        });

      setOutfits(outfitsWithRatings);
    } catch (error) {
      console.error("Error loading outfits:", error);
      toast.error("Failed to load outfits");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <header className="border-b border-purple-500/20 backdrop-blur-xl bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors duration-200"
            >
              <ArrowLeft className="w-6 h-6 text-purple-400" />
            </Link>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                Top Rated Outfits
              </h1>
              <p className="text-purple-300/70 text-sm sm:text-base mt-1">
                Browse outfits sorted by best rating
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-12 h-12 text-purple-500/50 animate-spin mb-4" />
            <p className="text-purple-300/50">Loading outfits...</p>
          </div>
        ) : outfits.length === 0 ? (
          <div className="text-center py-24">
            <Star className="w-16 h-16 text-purple-500/30 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">
              No rated outfits yet
            </h2>
            <p className="text-purple-300/60 mb-6">
              Go to the
              <Link
                to="/"
                className="text-purple-400 hover:text-purple-300 mx-1 underline"
              >
                rating page
              </Link>
              to start rating outfits!
            </p>
          </div>
        ) : (
          <div>
            <p className="text-purple-300/70 mb-6 text-sm">
              Showing {outfits.length} rated outfit
              {outfits.length !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {outfits.map((outfit) => (
                <div
                  key={outfit.id}
                  className="group relative rounded-xl overflow-hidden bg-slate-900/60 backdrop-blur-xl border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/20"
                >
                  <div className="relative aspect-square overflow-hidden bg-slate-800">
                    <img
                      src={outfit.image_url}
                      alt="Outfit"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  <div className="p-4 relative z-10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex gap-1">
                        {[...Array(10)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                              i < Math.round(outfit.averageRating)
                                ? "bg-gradient-to-r from-purple-500 to-pink-500"
                                : "bg-slate-700/50"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-lg font-bold text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text">
                          {outfit.averageRating.toFixed(1)}
                        </p>
                        <p className="text-purple-300/60 text-xs">
                          {outfit.totalRatings} rating
                          {outfit.totalRatings !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <Star className="w-4 h-4 text-pink-400 fill-pink-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 backdrop-blur-xl bg-slate-950/50 mt-12 sm:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 text-center">
          <p className="text-purple-300/60 text-sm">
            RateMe © 2024 • Rate outfits, get honest feedback
          </p>
        </div>
      </footer>
    </div>
  );
}
