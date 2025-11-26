import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Outfit, OutfitItem } from "@shared/types";
import { sanitizeInput, validateNumber, RateLimit } from "@/lib/security";

interface RatingDialogProps {
  outfit: Outfit | null;
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
  const [submitting, setSubmitting] = useState(false);
  const [clothingItems, setClothingItems] = useState<OutfitItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  // Clothing categories to detect (yainage90/fashion-object-detection classes)
  const CLOTHING_LABELS = [
    'bag', 'bottom', 'dress', 'hat', 'shoe', 'outer', 'top'
  ];

  useEffect(() => {
    if (open && outfit) {
      fetchClothingItems();
    } else {
      setClothingItems([]);
      setAnalysisError(null);
    }
  }, [open, outfit]);

  useEffect(() => {
    const updateImageSize = () => {
      if (imageRef.current) {
        setImageSize({
          width: imageRef.current.offsetWidth,
          height: imageRef.current.offsetHeight,
        });
      }
    };

    if (imageRef.current) {
      imageRef.current.addEventListener('load', updateImageSize);
      updateImageSize();
    }

    window.addEventListener('resize', updateImageSize);
    return () => window.removeEventListener('resize', updateImageSize);
  }, [outfit]);

  const fetchClothingItems = async () => {
    if (!outfit) return;

    setLoadingItems(true);
    setAnalysisError(null);
    
    try {
      const { data: existingItems, error: fetchError } = await supabase
        .from("outfit_items")
        .select("*")
        .eq("outfit_id", outfit.id);

      if (fetchError) throw fetchError;

      if (existingItems && existingItems.length > 0) {
        setClothingItems(existingItems);
      } else {
        console.log("Sending image URL to Edge Function:", outfit.image_url);

  const detectedItems = await analyzeWithHuggingFace(outfit.image_url);
  if (detectedItems) {
    setClothingItems(detectedItems);
  } else {
    setAnalysisError("Failed to detect clothing items");
  }
}
    } catch (error) {
      console.error("Error fetching clothing items:", error);
      setAnalysisError("Failed to load clothing detection");
    } finally {
      setLoadingItems(false);
    }
  };

async function analyzeWithHuggingFace(imageUrl: string) {
  try {
    const response = await fetch("http://localhost:54321/functions/v1/detect-clothes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_url: imageUrl }),
    });

    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Error with Hugging Face API:", error);
    return null;
  }
}


  const handleSubmitRating = async () => {
    if (!outfit || rating === 0) {
      toast.error("Please select a rating");
      return;
    }

    const userKey = `rating_${localStorage.getItem("rateMe.username") || "anonymous"}`;
    if (!RateLimit.checkLimit(userKey, 5, 1000 * 60 * 60)) {
      toast.error("Please wait a while before submitting more ratings");
      return;
    }

    setSubmitting(true);
    try {
      const sanitizedFeedback = sanitizeInput(feedback);
      const sanitizedUsername = sanitizeInput(username);
      
      if (!validateNumber(rating, 1, 10)) {
        toast.error("Invalid rating value");
        return;
      }

      const { error } = await supabase.from("ratings").insert([
        {
          outfit_id: outfit.id,
          score: rating,
          feedback: sanitizedFeedback,
          username: sanitizedUsername || "Anonymous",
        },
      ]);

      if (error) throw error;

      toast.success("Rating submitted successfully!");
      onOpenChange(false);
      onRatingSubmitted?.();
      
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
    onOpenChange(false);
  };

  if (!outfit) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-black border border-white/20 max-w-4xl">
        <div className="space-y-6">
          <div className="relative">
            <div className="relative bg-neutral-900 border border-white/10">
              <img
                ref={imageRef}
                src={outfit.image_url}
                alt="Outfit to rate"
                className="w-full h-auto object-contain"
              />
              
              {loadingItems && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="w-8 h-8 text-white animate-spin mx-auto mb-2" />
                    <p className="text-white text-sm font-sans">Analyzing with AI...</p>
                  </div>
                </div>
              )}

              {!loadingItems && clothingItems.map((item, idx) => {
                const x = item.bounding_box.x * imageSize.width;
                const y = item.bounding_box.y * imageSize.height;
                const width = item.bounding_box.width * imageSize.width;
                const height = item.bounding_box.height * imageSize.height;

                return (
                  <div
                    key={idx}
                    className="absolute group"
                    style={{
                      left: `${x}px`,
                      top: `${y}px`,
                      width: `${width}px`,
                      height: `${height}px`,
                    }}
                  >
                    <div className="absolute inset-0 border-2 border-white/40 group-hover:border-white transition-all duration-200"></div>
                    
                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                      <div className="bg-white text-black px-3 py-1 text-xs font-sans font-medium whitespace-nowrap shadow-lg">
                        {item.item_name}
                        <span className="text-gray-600 ml-2">
                          {Math.round(item.confidence * 100)}%
                        </span>
                      </div>
                      <div className="absolute left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-white"></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {!loadingItems && (
              <div className="mt-2">
                {analysisError ? (
                  <p className="text-xs text-red-400 font-sans">{analysisError}</p>
                ) : clothingItems.length > 0 ? (
                  <p className="text-xs text-gray-400 font-sans">
                    {clothingItems.length} item{clothingItems.length !== 1 ? 's' : ''} detected • Hover to see labels
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <label className="block text-white font-serif text-xl">
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
                  className={`w-8 h-8 sm:w-10 sm:h-10 font-bold text-xs sm:text-sm transition-all duration-200 transform hover:scale-110 disabled:opacity-50 border font-sans ${
                    score <= (hoverRating || rating)
                      ? "bg-white text-black border-white"
                      : "bg-black text-white border-white/30 hover:border-white"
                  }`}
                >
                  {score}
                </button>
              ))}
            </div>
            {rating > 0 && (
              <div className="text-center">
                <span className="text-2xl font-serif font-bold">
                  {rating}/10
                </span>
                <p className="text-gray-400 text-sm mt-1 font-sans">
                  {rating <= 3 && "Not a fan"}
                  {rating > 3 && rating <= 5 && "Could be better"}
                  {rating > 5 && rating <= 7 && "Pretty good"}
                  {rating > 7 && rating <= 9 && "Looks great"}
                  {rating === 10 && "Absolutely perfect"}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="block text-white font-sans text-sm tracking-wider uppercase">
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
              placeholder="Enter your name or leave blank for Anonymous"
              disabled={submitting}
              className="w-full bg-black border border-white/20 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white transition-all duration-200 disabled:opacity-50 font-sans"
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-white font-sans text-sm tracking-wider uppercase">
              Add feedback (optional)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(sanitizeInput(e.target.value))}
              placeholder="Share your thoughts..."
              disabled={submitting}
              className="w-full bg-black border border-white/20 px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:border-white transition-all duration-200 resize-none disabled:opacity-50 font-sans"
              rows={3}
            />
          </div>

          <button
            onClick={handleSubmitRating}
            disabled={rating === 0 || submitting}
            className={`w-full py-3 font-sans text-sm tracking-wider uppercase transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border ${
              rating === 0 || submitting
                ? "bg-neutral-800 text-gray-500 border-neutral-700"
                : "bg-white text-black border-white hover:bg-black hover:text-white"
            }`}
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Rating
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}