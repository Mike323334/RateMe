import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, Star, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { OutfitWithRating, OutfitItemWithLinks } from "@shared/types";
import { sanitizeInput, validateNumber, RateLimit } from "@/lib/security";
import { getOutfit } from "@shared/api";


interface RatingDialogProps {
  outfit: OutfitWithRating | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRatingSubmitted?: () => void;
}

export function RatingDialog({
  outfit,
  open,
  onOpenChange,
  onRatingSubmitted,
}: RatingDialogProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [username, setUsername] = useState(() => localStorage.getItem("rateMe.username") || "");
  const [availableTags] = useState<string[]>([
    "Casual",
    "Streetwear",
    "Formal",
    "Semi-formal",
    "Business Casual",
    "Sporty",
    "Athleisure",
    "Vintage",
    "Retro",
    "Y2K",
    "Minimalist",
    "Aesthetic",
    "Chic",
    "Boho / Bohemian",
    "Preppy",
    "Edgy",
    "Grunge",
    "Elegant",
    "Luxury",
    "High Fashion / Haute Couture",
    // Vibe / Trend Tags
    "Clean Fit",
    "Old Money",
    "Techwear",
    "Soft Girl",
    "E-boy / E-girl",
    "Baddie",
    "Academia",
    "Dark Academia",
    "Light Academia",
    "K-fashion",
    "Street Goth",
  ]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [outfitItems, setOutfitItems] = useState<OutfitItemWithLinks[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Initializing...");

  const runServerSideDetection = async () => {
    if (!outfit) return;
    
    try {
      setLoadingItems(true);
      setStatusMessage("Analyzing outfit with Google Vision AI...");
      
      // Call the dedicated analyze-outfit function
      const response = await fetch('/.netlify/functions/analyze-outfit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ outfitId: outfit.id }),
      });

      if (!response.ok) {
        // Try to parse error message, but handle empty responses
        let errorMessage = 'Failed to analyze outfit';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If JSON parsing fails, use status text
          errorMessage = `Server error: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      // Fetch the updated outfit with detected items
      setStatusMessage("Loading detected items...");
      const updatedOutfit = await getOutfit(outfit.id);
      
      if (updatedOutfit.items && updatedOutfit.items.length > 0) {
        setOutfitItems(updatedOutfit.items);
        toast.success(`Detected ${updatedOutfit.items.length} clothing item(s)!`);
      } else {
        toast.info("No clothing items detected in this image.");
      }
    } catch (err) {
      console.error("Server-side detection failed:", err);
      toast.error(err instanceof Error ? err.message : "AI Detection failed. Please try again.");
    } finally {
      setLoadingItems(false);
    }
  };

  // Load outfit items when dialog opens
  useEffect(() => {
    if (open && outfit) {
      // If items are already loaded in the outfit object, use them
      if (outfit.items && outfit.items.length > 0) {
        setOutfitItems(outfit.items);
        return;
      }

      // Otherwise, try to fetch from API first (legacy/server-side)
      setLoadingItems(true);
      setStatusMessage("Checking server...");
      
      // Try to get from server first (maybe they were saved previously)
      getOutfit(outfit.id)
        .then((fullOutfit) => {
          if (fullOutfit.items && fullOutfit.items.length > 0) {
            setOutfitItems(fullOutfit.items);
            setLoadingItems(false);
          } else {
            // If no items on server, don't auto-detect (user can click "Detect Clothing" button)
            setLoadingItems(false);
          }
        })
        .catch((error) => {
          console.error("Error loading outfit items from server:", error);
          // Don't auto-detect on error
          setLoadingItems(false);
        });
    }
  }, [open, outfit]);

  const handleSubmitRating = async () => {
    if (!outfit || rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    // Check rate limiting (5 ratings per hour per user)
    const userKey = `rating_${localStorage.getItem("rateMe.username") || "anonymous"}`;
    if (!RateLimit.checkLimit(userKey, 5, 1000 * 60 * 60)) {
      toast.error("Please wait a while before submitting more ratings");
      return;
    }

    setSubmitting(true);
    try {
      // Sanitize and validate data before submission
      const sanitizedFeedback = sanitizeInput(feedback);
      const sanitizedUsername = sanitizeInput(username);
      
      // Validate score is within bounds
      if (!validateNumber(rating, 1, 10)) {
        toast.error("Invalid rating value");
        return;
      }

      const payload: any = {
        outfit_id: outfit.id,
        score: rating,
        feedback: sanitizedFeedback,
        username: sanitizedUsername || "Anonymous",
      };

      if (selectedTags && selectedTags.length > 0) {
        payload.tags = selectedTags.map((t) => sanitizeInput(t));
      }

      const { error } = await supabase.from("ratings").insert([payload]);

      if (error) throw error;

      toast.success("Rating submitted successfully!");
      onOpenChange(false);
      onRatingSubmitted?.();
      
      // Reset form
      setRating(0);
      setFeedback("");
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error("Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setFeedback("");
    setSelectedTags([]);
    setOutfitItems([]);
    setLoadingItems(false);
    onOpenChange(false);
  };

  if (!outfit) return null;

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="bg-slate-900/90 backdrop-blur-xl border-purple-500/20">
          <div className="space-y-6">
            <div className="relative rounded-xl overflow-hidden bg-slate-800 border border-purple-500/20">
              <img
                src={outfit.image_url}
                alt="Outfit to rate"
                className="w-full h-auto object-contain"
              />
              {/* Outfit Items Overlay */}
              {loadingItems && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400 mb-2" />
                  <p className="text-white font-medium text-sm">{statusMessage}</p>
                </div>
              )}
              
              {!loadingItems && outfitItems.length === 0 && (
                 <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                    <div className="bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                        <p className="text-white/80 text-xs font-medium">No items detected</p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => {
                                const fakeItems: OutfitItemWithLinks[] = [
                                    {
                                        id: 'test-1',
                                        outfit_id: outfit.id,
                                        item_name: 'Test Shirt',
                                        created_at: new Date().toISOString(),
                                        bounding_box: { x: 0.2, y: 0.2, width: 0.3, height: 0.3 },
                                        confidence: 0.99,
                                        shopping_links: []
                                    },
                                    {
                                        id: 'test-2',
                                        outfit_id: outfit.id,
                                        item_name: 'Test Pants',
                                        created_at: new Date().toISOString(),
                                        bounding_box: { x: 0.5, y: 0.6, width: 0.3, height: 0.4 },
                                        confidence: 0.95,
                                        shopping_links: []
                                    }
                                ];
                                setOutfitItems(fakeItems);
                            }}
                            className="bg-slate-700 hover:bg-slate-600 text-white text-xs px-3 py-1.5 rounded-full shadow-lg transition-colors"
                        >
                            Simulate
                        </button>
                        <button 
                            onClick={runServerSideDetection}
                            className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1.5 rounded-full shadow-lg transition-colors flex items-center gap-1"
                        >
                            <ShoppingBag className="w-3 h-3" />
                            Detect Clothing
                        </button>
                    </div>
                 </div>
              )}

              {!loadingItems && outfitItems.length > 0 && outfitItems.map((item) => (
                <div
                  key={item.id}
                  className="absolute flex items-center justify-center"
                  style={{
                    left: `${item.bounding_box.x * 100}%`,
                    top: `${item.bounding_box.y * 100}%`,
                    width: `${item.bounding_box.width * 100}%`,
                    height: `${item.bounding_box.height * 100}%`,
                  }}
                >
                  <span className="bg-black/70 backdrop-blur-md text-white text-[10px] font-medium px-2 py-1 rounded-full border border-white/20 shadow-sm whitespace-nowrap">
                    {item.item_name}
                  </span>
                </div>
              ))}
            </div>

          {/* Rating Section */}
          <div className="space-y-4">
            <label className="block text-white font-semibold text-lg">
              Rate this outfit
            </label>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                <button
                  key={score}
                  onClick={() => setRating(score)}
                  onMouseEnter={() => setHoverRating(score)}
                  onMouseLeave={() => setHoverRating(0)}
                  disabled={submitting}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg font-bold text-xs sm:text-sm transition-all duration-200 transform hover:scale-110 disabled:opacity-50 ${
                    score <= (hoverRating || rating)
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50"
                      : "bg-slate-800/50 text-purple-300/60 border border-purple-500/20 hover:border-purple-500/50"
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
            {rating > 0 && (
              <div className="text-center">
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {rating}/10
                </span>
                <p className="text-purple-300/60 text-sm mt-1">
                  {rating <= 3 && "Not a fan"}
                  {rating > 3 && rating <= 5 && "Could be better"}
                  {rating > 5 && rating <= 7 && "Pretty good!"}
                  {rating > 7 && rating <= 9 && "Looks great!"}
                  {rating === 10 && "Absolutely fire! 🔥"}
                </p>
              </div>
            )}
          </div>

          {/* Username Section */}
          <div className="space-y-2">
            <label className="block text-white font-semibold text-sm">
              Your name (optional)
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => {
                const newUsername = sanitizeInput(e.target.value);
                setUsername(newUsername);
                localStorage.setItem("rateMe.username", newUsername);
              }}
              placeholder="Enter your name or leave blank to post as Anonymous"
              disabled={submitting}
              className="w-full bg-slate-800/50 border border-purple-500/20 rounded-lg px-4 py-3 text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 disabled:opacity-50"
              maxLength={50}
            />
          </div>

          {/* Tags Section */}
          <div className="space-y-2">
            <label className="block text-white font-semibold text-sm">
              Select tags (click to add, click again to remove). Order is preserved by selection time.
            </label>
            <div className="flex flex-wrap gap-2">
              {availableTags.map((tag) => {
                const selected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      if (selected) {
                        setSelectedTags(selectedTags.filter((t) => t !== tag));
                      } else {
                        setSelectedTags([...selectedTags, tag]);
                      }
                    }}
                    className={`px-2 py-1 text-xs rounded-md transition-all duration-150 ${selected ? 'bg-purple-600 text-white' : 'bg-slate-800/50 text-purple-300 border border-purple-500/20 hover:bg-slate-800/70'}`}
                    disabled={submitting}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>

            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((t, i) => (
                  <span key={t} className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs font-medium">
                    <span className="font-bold">{i + 1}.</span> {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Feedback Section */}
          <div className="space-y-2">
            <label className="block text-white font-semibold text-sm">
              Add feedback (optional)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(sanitizeInput(e.target.value))}
              placeholder="Share your thoughts about this outfit..."
              disabled={submitting}
              className="w-full bg-slate-800/50 border border-purple-500/20 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 resize-none disabled:opacity-50"
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmitRating}
            disabled={rating === 0 || submitting}
            className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              rating === 0 || submitting
                ? "bg-slate-700/50 text-slate-400"
                : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/50"
            }`}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Rating
          </button>
        </div>
      </DialogContent>
    </Dialog>
    </TooltipProvider>
  );
}
