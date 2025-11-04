import { useState, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { Outfit } from "@shared/types";
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
    onOpenChange(false);
  };

  if (!outfit) return null;

  return (
    // Use standard modal dialog (portal + overlay). DialogContent size increased in the shared dialog component.
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-900/90 backdrop-blur-xl border-purple-500/20">
        <div className="space-y-6">
          <div className="relative rounded-xl overflow-hidden bg-slate-800 border border-purple-500/20">
            <img
              src={outfit.image_url}
              alt="Outfit to rate"
              className="w-full h-auto object-contain"
            />
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
  );
}