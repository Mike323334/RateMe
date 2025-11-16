import { useState, useRef, useEffect } from "react";
import { Star, Upload, RotateCcw, Loader2, Grid } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import TypingInput from "../components/ui/typingInput";
import { SocialShareButtons } from "@/components/ui/social-share-buttons"; 

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
  const [username, setUsername] = useState<string>("");
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

  const calculateFileHash = async (file: File): Promise<string> => {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return hashHex;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!username.trim()) {
      toast.error("Please enter your username first");
      return;
    }

    setUploading(true);
    try {
      const fileHash = await calculateFileHash(file);

      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      const filePath = `outfits/${fileName}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("outfit-images")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data } = await supabase.storage
        .from("outfit-images")
        .getPublicUrl(filePath);

      // Defensive: determine image_path (some SDK versions return different shapes)
      console.log('uploadData:', uploadData);
      console.log('getPublicUrl data:', data);
      console.log('computed filePath:', filePath);

      const image_path_value =
        ((uploadData as any)?.path || (uploadData as any)?.Key || (uploadData as any)?.key) || filePath || `outfits/${fileName}`;

      // Save outfit record
      const { data: outfit, error: dbError } = await supabase
        .from("outfits")
        .insert([
          {
            image_url: data?.publicUrl,
            image_path: image_path_value,
            username: username.trim(),
            file_hash: fileHash,
          },
        ])
        .select()
        .single();

      if (dbError) throw dbError;

      setImageUrl(data.publicUrl);
      setOutfitId(outfit.id);
      toast.success("Image uploaded successfully!");
      resetRating();
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || "Error uploading image");
      if (fileInputRef.current) fileInputRef.current.value = "";
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
    setUsername("");
    resetRating();
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const averageRating =
    ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length).toFixed(
          1,
        )
      : 0;

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="w-full bg-black 
                   min-h-[130px] sm:min-h-[150px] md:min-h-[170px]
                   flex items-center px-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-6 sm:py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-black tracking-tighter">RATEME</h1>
              <p className="text-xs sm:text-sm text-gray-400 tracking-widest">RATE OUTFITS</p>
            </div>
       <div className="w-full px-3 mt-2 relative min-h-[60px] hidden sm:block">
          <TypingInput />  
        </div>

<div className="text-right flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
              <Link
                to="/gallery"
                className="flex items-center gap-2 px-6 py-2 border border-white text-white font-medium hover:bg-white hover:text-black transition-all duration-300 text-sm sm:text-base tracking-wide"
              >
                <Grid className="w-4 h-4" />
                <span className="whitespace-nowrap">VIEW GALLERY</span>
              </Link>
              <div className="border-l border-gray-700 pl-6">
                <div className="text-3xl sm:text-4xl font-black tracking-tighter">
                  {averageRating}
                </div>
                <p className="text-xs text-gray-400 tracking-widest mt-1">
                  AVG RATING
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-8 lg:px-12 py-12 sm:py-20">
        {/* Hero Section */}
        <div className="mb-16 sm:mb-24">
          <h2 className="text-5xl sm:text-7xl lg:text-8xl font-black tracking-tighter leading-tight mb-6">
            RATE YOUR
            <br />
            STYLE
          </h2>
          <p className="text-sm sm:text-base text-gray-400 tracking-widest max-w-2xl">
            UPLOAD OUTFITS AND GET HONEST FEEDBACK FROM THE COMMUNITY. DISCOVER WHAT WORKS.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Left Column - Upload and Rating */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Upload Section */}
            <div className="group relative">
              <div className="relative bg-black border border-gray-800 p-8 sm:p-12 transition-all duration-300">
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
                            if (fileInputRef.current)
                              fileInputRef.current.value = "";
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
                  <div className="space-y-6">
                    {/* Username input */}
                    <div className="space-y-2">
                      <label className="block text-white font-semibold text-sm">
                        Your username <span className="text-pink-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        className="w-full bg-slate-800/50 border border-purple-500/20 rounded-lg px-4 py-3 text-white placeholder-purple-300/40 focus:outline-none focus:border-purple-500/60 focus:ring-2 focus:ring-purple-500/20 transition-all duration-200"
                        maxLength={50}
                        required
                      />
                    </div>

                    {/* Upload area */}
                    <div
                      onClick={() => {
                        if (!username.trim()) {
                          toast.error("Please enter your username first");
                          return;
                        }
                        fileInputRef.current?.click();
                      }}
                      className={`cursor-pointer ${!username.trim() ? 'opacity-50' : ''}`}
                    >
                      <div className="flex flex-col items-center justify-center py-20 sm:py-32 text-center">
                        <h3 className="text-2xl sm:text-4xl font-black tracking-tighter mb-4">
                          UPLOAD OUTFIT
                        </h3>
                        <p className="text-sm sm:text-base text-gray-400 tracking-wide max-w-md mb-8">
                          {username.trim() 
                            ? "CLICK TO UPLOAD YOUR OUTFIT PHOTO"
                            : "ENTER YOUR USERNAME TO GET STARTED"}
                        </p>
                        <div className="w-12 h-12 border-2 border-white"></div>
                      </div>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (!username.trim()) {
                      toast.error("Please enter your username first");
                      return;
                    }
                    handleImageUpload(e);
                  }}
                  className="hidden"
                  disabled={uploading || submitting || !username.trim()}
                />
              </div>
            </div>
          </div>

          {/* Right Column - Ratings History */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tighter mb-2">
                RECENT RATINGS
              </h2>
              <div className="w-12 h-1 bg-white"></div>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {loading ? (
                <div className="text-center py-12 px-4">
                  <Loader2 className="w-12 h-12 text-purple-500/50 mx-auto mb-3 animate-spin" />
                  <p className="text-purple-300/50 text-sm">
                    Loading ratings...
                  </p>
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
