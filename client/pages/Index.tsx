import { useState, useEffect } from "react";
import { Star, Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { RatingDialog } from "@/components/ui/rating-dialog";
import { OutfitWithRating } from "@shared/types";
import { SocialShareButtons } from "@/components/ui/social-share-buttons";
import { Outfit, Rating } from "@shared/types";

export default function Index() {
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
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 py-8 sm:py-12">
          <div className="flex items-start justify-between">
            <div>
              <Link
                to="/gallery"
                className="inline-block mb-6 text-sm tracking-[0.2em] uppercase font-sans text-gray-400 hover:text-white transition-colors duration-200"
              >
                ← Upload Here
              </Link>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight mb-4">
                TOP RATED OUTFITS
              </h1>
              <div className="w-24 h-px bg-white mb-4"></div>
              <p className="text-xs sm:text-sm text-gray-400 tracking-[0.2em] uppercase font-sans font-light">
                Ranked by community ratings
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 py-12 sm:py-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32">
            <Loader2 className="w-12 h-12 text-gray-500 animate-spin mb-6" />
            <p className="text-gray-400 tracking-[0.2em] uppercase font-sans text-sm">Loading...</p>
          </div>
        ) : outfits.length === 0 ? (
          <div className="text-center py-32 border border-white/10">
            <h2 className="text-4xl font-serif font-bold tracking-tight mb-6">
              NO OUTFITS YET
            </h2>
            <p className="text-gray-400 mb-8 tracking-wide font-sans">
              Go to the{" "}
              <Link
                to="/gallery"
                className="text-white underline hover:no-underline"
              >
                upload page
              </Link>{" "}
              to add your first outfit
            </p>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-400 tracking-[0.2em] uppercase font-sans mb-12">
              {outfits.length} Outfit{outfits.length !== 1 ? "s" : ""} {outfits.some(o => o.totalRatings > 0) 
                ? `• ${outfits.filter(o => o.totalRatings > 0).length} with ratings`
                : "• No ratings yet"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
              {outfits.map((outfit, idx) => (
                <div
                  key={outfit.id}
                  onClick={() => {
                    setSelectedOutfit(outfit);
                    setRatingDialogOpen(true);
                  }}
                  className={`group relative overflow-hidden transition-all duration-300 cursor-pointer border ${
                    idx === 0
                      ? "border-white shadow-lg animate-subtle-lean"
                      : idx === 1
                      ? "border-gray-400 animate-subtle-lean"
                      : idx === 2
                      ? "border-gray-500 animate-subtle-lean"
                      : "border-white/20 hover:border-white"
                  }`}
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-neutral-900 flex items-center justify-center">
                    {/* Rank badge */}
                    <div className="absolute left-4 top-4 z-20">
                      <div className={`inline-flex items-center justify-center px-3 py-1 text-xs font-sans tracking-wider uppercase ${
                        idx === 0
                          ? "bg-white text-black"
                          : idx === 1
                          ? "bg-gray-300 text-black"
                          : idx === 2
                          ? "bg-gray-400 text-black"
                          : "bg-black text-white border border-white/30"
                      }`}>
                        {idx === 0 ? "№ 1" : idx === 1 ? "№ 2" : idx === 2 ? "№ 3" : `№ ${idx + 1}`}
                      </div>
                    </div>
                    {/* Average rating */}
                    <div className="absolute right-4 top-4 z-20">
                      <div className="inline-flex items-center justify-center px-3 py-1 bg-black/80 text-white text-xs font-sans">
                        {outfit.averageRating.toFixed(1)}/10
                      </div>
                    </div>
                    <img
                      src={outfit.image_url}
                      alt="Outfit"
                      className="max-w-full max-h-full object-contain group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  <div className="p-5 bg-neutral-900/50 border-t border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex gap-0.5">
                        {[...Array(10)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-1.5 h-1.5 ${
                              i < Math.round(outfit.averageRating)
                                ? "bg-white"
                                : "bg-white/20"
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="flex items-end justify-between mb-4">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <p className="text-xl font-serif font-bold">
                            {outfit.averageRating.toFixed(1)}
                          </p>
                          <span className="text-xs text-gray-400 font-sans">by {outfit.username}</span>
                        </div>
                        <p className="text-gray-400 text-xs font-sans">
                          {outfit.totalRatings} rating{outfit.totalRatings !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <Star className="w-4 h-4 text-white fill-white" />
                    </div>

                    {/* Social Share Buttons */}
                    <div className="border-t border-white/10 pt-4">
                      <SocialShareButtons outfit={outfit} />
                    </div>

                    {/* Recent Ratings */}
                    {outfit.latestRatings.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="space-y-3">
                          {outfit.latestRatings.map((rating, idx) => (
                            <div key={idx} className="flex items-start justify-between text-xs">
                              <div className="flex-1">
                                <p className="text-white font-sans font-medium">
                                  {rating.username || "Anonymous"}
                                </p>
                                    {rating.feedback && (
                                      <p className="text-gray-400 text-xs line-clamp-1 mt-1 font-sans">
                                        {rating.feedback}
                                      </p>
                                    )}
                                    {rating.tags && rating.tags.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-1">
                                        {rating.tags.map((t, i) => (
                                          <span key={i} className="text-xs px-2 py-0.5 bg-neutral-800 text-gray-300 font-sans">{t}</span>
                                        ))}
                                      </div>
                                    )}
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                <Star className="w-3 h-3 text-white fill-white" />
                                <span className="text-white font-sans font-medium">
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
      <footer className="border-t border-white/10 mt-16 sm:mt-24">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 py-10 text-center">
          <p className="text-gray-500 text-xs tracking-[0.3em] uppercase font-sans">
            RateMe © 2025
          </p>
        </div>
      </footer>
    </div>
  );
}
