import { useState, useEffect } from "react";
import { Star, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { RatingDialog } from "@/components/ui/rating-dialog";
import { Outfit, Rating, OutfitWithRating } from "@shared/types";

export default function Gallery() {
  const [outfits, setOutfits] = useState<OutfitWithRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOutfit, setSelectedOutfit] = useState<OutfitWithRating | null>(null);
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false);

  useEffect(() => {
    loadOutfitsWithRatings();
  }, []);

  const loadOutfitsWithRatings = async () => {
    try {
      setLoading(true);
      console.log('Loading outfits...');

      // Get all outfits
      const { data: outfitsData, error: outfitsError } = await supabase
        .from("outfits")
        .select(`
          id,
          created_at,
          image_url,
          image_path,
          file_hash,
          username
        `)
        .order("created_at", { ascending: false });

      console.log('Outfits response:', { outfitsData, outfitsError });

      if (outfitsError) throw outfitsError;

      if (!outfitsData) {
        throw new Error('No outfits data returned from Supabase');
      }
      
      if (outfitsData.length === 0) {
        setOutfits([]);
        setLoading(false);
        return;
      }

      // Get all ratings (include tags)
      const { data: ratingsData, error: ratingsError } = await supabase
        .from("ratings")
        .select(`
          id,
          created_at,
          outfit_id,
          score,
          feedback,
          username,
          tags
        `);

      if (ratingsError) throw ratingsError;

      console.log('Ratings response:', { ratingsData, ratingsError });

      // Calculate average rating for each outfit
      const outfitMap = new Map<
        string,
        { 
          count: number; 
          sum: number; 
          outfit: (typeof outfitsData)[0];
          ratings: Rating[];
        }
      >();

      outfitsData.forEach((outfit) => {
        outfitMap.set(outfit.id, { count: 0, sum: 0, outfit, ratings: [] });
      });

      ratingsData?.forEach((rating) => {
        const entry = outfitMap.get(rating.outfit_id);
        if (entry) {
          entry.count += 1;
          entry.sum += rating.score;
          // Ensure the username is preserved when adding to ratings array
          entry.ratings.push({
            ...rating,
            username: rating.username || "Anonymous" // Explicitly handle the username
          });
        }
      });

      // Convert to array with calculated averages and score (1-100), then sort by score100 desc
      const outfitsWithRatings: OutfitWithRating[] = outfitsData
        .map((outfit) => {
          const entry = outfitMap.get(outfit.id);
          if (!entry) {
            return {
              ...outfit,
              averageRating: 0,
              totalRatings: 0,
              latestRatings: [],
              score100: 0,
            };
          }

          const avg = entry.count > 0 ? entry.sum / entry.count : 0;
          const score100 = Math.round(avg * 10); // convert 1-10 scale to 1-100 (10-100), round to nearest

          return {
            ...outfit,
            username: outfit.username || "Anonymous",
            averageRating: avg,
            totalRatings: entry.count,
            latestRatings: entry.ratings
              .sort((a, b) => new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime())
              .slice(0, 3),
            score100,
          };
        })
        // Sort by score100 (desc), then newest created_at as tiebreaker
        .sort((a, b) => {
          if ((b.score100 || 0) !== (a.score100 || 0)) return (b.score100 || 0) - (a.score100 || 0);
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        })
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
      if (error instanceof Error) {
        toast.error(`Failed to load outfits: ${error.message}`);
      } else {
        toast.error("Failed to load outfits");
      }
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
              No outfits yet
            </h2>
            <p className="text-purple-300/60 mb-6">
              Go to the
              <Link
                to="/"
                className="text-purple-400 hover:text-purple-300 mx-1 underline"
              >
                upload page
              </Link>
              to add your first outfit!
            </p>
          </div>
        ) : (
          <div>
            <p className="text-purple-300/70 mb-6 text-sm">
              Showing {outfits.length} outfit{outfits.length !== 1 ? "s" : ""}{" "}
              {outfits.some(o => o.totalRatings > 0) 
                ? `(${outfits.filter(o => o.totalRatings > 0).length} with ratings)`
                : "(No ratings yet)"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {outfits.map((outfit, idx) => (
                <div
                  key={outfit.id}
                  onClick={() => {
                    setSelectedOutfit(outfit);
                    setRatingDialogOpen(true);
                  }}
                  className={`group relative rounded-xl overflow-hidden transition-all duration-300 transform hover:-translate-y-1 cursor-pointer backdrop-blur-xl ${
                    idx === 0
                      ? "bg-slate-900/80 border-2 border-yellow-400/60 shadow-lg shadow-yellow-400/30 hover:shadow-xl hover:shadow-yellow-400/40"
                      : idx === 1
                      ? "bg-slate-900/75 border-2 border-gray-300/50 shadow-lg shadow-gray-300/20 hover:shadow-xl hover:shadow-gray-300/30"
                      : idx === 2
                      ? "bg-slate-900/70 border-2 border-orange-400/50 shadow-lg shadow-orange-400/20 hover:shadow-xl hover:shadow-orange-400/30"
                      : "bg-slate-900/60 border border-purple-500/20 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-500/20"
                  }`}
                >
                  <div className="relative aspect-square overflow-hidden bg-slate-800 flex items-center justify-center">
                    {/* Rank badge (left) */}
                    <div className="absolute left-3 top-3 z-20">
                      <div className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-white text-xs font-bold shadow-md ${
                        idx === 0
                          ? "bg-gradient-to-r from-yellow-500 to-yellow-600"
                          : idx === 1
                          ? "bg-gradient-to-r from-gray-300 to-gray-400 text-slate-800"
                          : idx === 2
                          ? "bg-gradient-to-r from-orange-400 to-orange-600"
                          : "bg-gradient-to-r from-purple-600 to-pink-500"
                      }`}>
                        {idx === 0 ? "🥇 #1" : idx === 1 ? "🥈 #2" : idx === 2 ? "🥉 #3" : `#${idx + 1}`}
                      </div>
                    </div>
                    {/* Average rating pill (right) */}
                    <div className="absolute right-3 top-3 z-20">
                      <div className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-black/60 text-white text-xs font-medium shadow-sm">
                        {outfit.averageRating.toFixed(1)}/10
                      </div>
                    </div>
                    <img
                      src={outfit.image_url}
                      alt="Outfit"
                      className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-300"
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
                        <div className="flex items-baseline gap-2">
                          <p className="text-lg font-bold text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text">
                            {outfit.averageRating.toFixed(1)}
                          </p>
                          <span className="text-sm text-purple-300/80">by {outfit.username}</span>
                        </div>
                        <p className="text-purple-300/60 text-xs">
                          {outfit.totalRatings} rating
                          {outfit.totalRatings !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <Star className="w-4 h-4 text-pink-400 fill-pink-400" />
                    </div>

                    {/* Recent Ratings */}
                    {outfit.latestRatings.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-purple-500/20">
                        <div className="space-y-2">
                          {outfit.latestRatings.map((rating, idx) => (
                            <div key={idx} className="flex items-start justify-between text-xs">
                              <div className="flex-1">
                                <p className="text-purple-200/90 font-medium">
                                  {rating.username || "Anonymous"}
                                </p>
                                      {rating.feedback && (
                                        <p className="text-purple-300/60 text-xs line-clamp-1 mt-0.5">
                                          {rating.feedback}
                                        </p>
                                      )}
                                      {rating.tags && rating.tags.length > 0 && (
                                        <div className="mt-1 flex flex-wrap gap-1">
                                          {rating.tags.map((t, i) => (
                                            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-slate-700/60 text-purple-200">{t}</span>
                                          ))}
                                        </div>
                                      )}
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                <Star className="w-3 h-3 text-pink-400 fill-pink-400" />
                                <span className="text-purple-200/90 font-medium">
                                  {rating.score}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Rating Dialog */}
      <RatingDialog
        outfit={selectedOutfit}
        open={ratingDialogOpen}
        onOpenChange={setRatingDialogOpen}
        onRatingSubmitted={loadOutfitsWithRatings}
      />

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
