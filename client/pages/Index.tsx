import { useState, useRef, useEffect } from "react";
import { Star, Upload, RotateCcw, Loader2, Grid } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Rating {
  id: string;
  score: number;
  feedback: string;
  created_at: string;
  outfit_id: string;
}

interface Outfit {
  id: string;
  image_url: string;
  created_at: string;
}

export default function RateMe() {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [outfitId, setOutfitId] = useState<string>("");
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>("");
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load ratings on component mount
  useEffect(() => {
    loadRatings();
  }, []);

  const loadRatings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("ratings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRatings(data || []);
    } catch (error) {
      console.error("Error loading ratings:", error);
      toast.error("Failed to load ratings");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`;

      // Upload image to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("outfit-images")
        .upload(`outfits/${fileName}`, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage
        .from("outfit-images")
        .getPublicUrl(`outfits/${fileName}`);

      // Save outfit record to database
      const { data: outfitData, error: dbError } = await supabase
        .from("outfits")
        .insert([
          {
            image_url: publicUrl,
            image_path: uploadData.path,
          },
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      setImageUrl(publicUrl);
      setOutfitId(outfitData.id);
      resetRating();
      toast.success("Image uploaded successfully!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitRating = async () => {
    if (rating === 0 || !outfitId) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);
    try {
      const { data: newRating, error } = await supabase
        .from("ratings")
        .insert([
          {
            outfit_id: outfitId,
            score: rating,
            feedback: feedback,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setRatings([newRating, ...ratings]);
      setImageUrl("");
      setOutfitId("");
      resetRating();
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Rating submitted!");
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error("Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  const resetRating = () => {
    setRating(0);
    setFeedback("");
  };

  const handleReset = () => {
    setImageUrl("");
    setOutfitId("");
    resetRating();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const averageRating =
    ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(
          1
        )
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <header className="border-b border-purple-500/20 backdrop-blur-xl bg-slate-950/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
                RateMe
              </h1>
              <p className="text-purple-300/70 text-sm sm:text-base mt-1">
                Rate outfits on a scale of 1-10
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-bold text-transparent bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text">
                {averageRating}
              </div>
              <p className="text-purple-300/60 text-xs sm:text-sm">
                Avg Rating ({ratings.length})
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column - Upload and Rating */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Upload Section */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-purple-500/30 p-4 sm:p-6 transition-all duration-300">
                {imageUrl ? (
                  <div className="space-y-6">
                    <div className="relative rounded-xl overflow-hidden bg-slate-800 border border-purple-500/20">
                      <img
                        src={imageUrl}
                        alt="Outfit"
                        className="w-full h-auto object-contain"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                        <button
                          onClick={() => {
                            setImageUrl("");
                            setOutfitId("");
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="w-full bg-red-500/90 hover:bg-red-600 text-white font-semibold py-2 rounded-lg transition-colors duration-200"
                        >
                          Remove Image
                        </button>
                      </div>
                    </div>

                    {/* Rating Section */}
                    <div className="space-y-4">
                      <label className="block text-white font-semibold text-lg">
                        Rate this outfit
                      </label>
                      <div className="flex justify-center gap-2 sm:gap-3">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                          <button
                            key={score}
                            onClick={() => setRating(score)}
                            onMouseEnter={() => setHoverRating(score)}
                            onMouseLeave={() => setHoverRating(0)}
                            disabled={submitting}
                            className={`w-10 sm:w-12 h-10 sm:h-12 rounded-lg font-bold text-sm sm:text-base transition-all duration-200 transform hover:scale-110 disabled:opacity-50 ${
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

                    {/* Feedback Section */}
                    <div className="space-y-2">
                      <label className="block text-white font-semibold text-sm">
                        Add feedback (optional)
                      </label>
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Share your thoughts about this outfit..."
                        disabled={submitting}
                        className="w-full bg-slate-800/50 border border-purple-500/20 rounded-lg px-4 py-3 text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200 resize-none disabled:opacity-50"
                        rows={3}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleSubmitRating}
                        disabled={rating === 0 || submitting}
                        className={`flex-1 py-3 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                          rating === 0 || submitting
                            ? "bg-slate-700/50 text-slate-400"
                            : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/50"
                        }`}
                      >
                        {submitting && (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        Submit Rating
                      </button>
                      <button
                        onClick={handleReset}
                        disabled={submitting}
                        className="px-4 py-3 rounded-lg font-semibold bg-slate-800/50 text-purple-300 border border-purple-500/20 hover:border-purple-500/60 transition-all duration-200 hover:bg-slate-800 disabled:opacity-50"
                      >
                        <RotateCcw className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col items-center justify-center py-12 sm:py-16">
                      <div className="relative mb-6">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-xl opacity-30"></div>
                        <div className="relative w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                          <Upload className="w-10 h-10 text-white" />
                        </div>
                      </div>
                      <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 text-center">
                        Upload an outfit
                      </h3>
                      <p className="text-purple-300/60 text-center text-sm sm:text-base max-w-sm">
                        Click to select an image or drag and drop your outfit
                        photo
                      </p>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading || submitting}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Ratings History */}
          <div className="space-y-4">
            <h2 className="text-xl sm:text-2xl font-bold text-white px-4 sm:px-0">
              Recent Ratings
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {loading ? (
                <div className="text-center py-12 px-4">
                  <Loader2 className="w-12 h-12 text-purple-500/50 mx-auto mb-3 animate-spin" />
                  <p className="text-purple-300/50 text-sm">Loading ratings...</p>
                </div>
              ) : ratings.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <Star className="w-12 h-12 text-purple-500/30 mx-auto mb-3" />
                  <p className="text-purple-300/50 text-sm">
                    No ratings yet. Upload an outfit to get started!
                  </p>
                </div>
              ) : (
                ratings.map((r) => (
                  <div
                    key={r.id}
                    className="bg-slate-900/60 backdrop-blur-xl rounded-xl border border-purple-500/20 p-4 sm:p-5 hover:border-purple-500/40 transition-all duration-200 group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex gap-1">
                        {[...Array(10)].map((_, i) => (
                          <div
                            key={i}
                            className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-all duration-200 ${
                              i < r.score
                                ? "bg-gradient-to-r from-purple-500 to-pink-500"
                                : "bg-slate-700/50"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-lg sm:text-xl font-bold text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text">
                        {r.score}
                      </span>
                    </div>
                    {r.feedback && (
                      <p className="text-purple-200/80 text-sm line-clamp-2 mb-2">
                        {r.feedback}
                      </p>
                    )}
                    <p className="text-purple-300/40 text-xs">
                      {new Date(r.created_at).toLocaleDateString()}{" "}
                      {new Date(r.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 backdrop-blur-xl bg-slate-950/50 mt-12 sm:mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 text-center">
          <p className="text-purple-300/60 text-sm">
            RateMe © 2024 • Rate outfits, get honest feedback
          </p>
        </div>
      </footer>
    </div>
  );
}
