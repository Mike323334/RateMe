import { useState, useRef, useEffect } from "react";
import { Star, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Tooltip, TooltipTrigger, TooltipContent } from "../components/ui/tooltip";

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
  username: string;
}

interface OutfitWithAvg {
  id: string;
  image_url: string;
  username: string;
  averageRating: number;
}

export default function Gallery() {
  const [imageUrl, setImageUrl] = useState<string>("");
  const [outfitId, setOutfitId] = useState<string>("");
  const [username, setUsername] = useState<string>("");
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>("");
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [outfitsWithAvg, setOutfitsWithAvg] = useState<OutfitWithAvg[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New state for clothing items detected with bounding boxes
  const [detectedItems, setDetectedItems] = useState<
    {
      item_name: string;
      bounding_box: { x: number; y: number; width: number; height: number };
      confidence: number;
    }[]
  >([]);

  useEffect(() => {
    loadRatings();
  }, []);

  const loadRatings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("ratings")
        .select("*, outfits(*)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRatings(data || []);

      const outfitMap = new Map<string, { outfit: Outfit; ratings: Rating[] }>();
      (data || []).forEach((rating: any) => {
        const outfit = rating.outfits;
        if (outfit) {
          if (!outfitMap.has(outfit.id)) {
            outfitMap.set(outfit.id, { outfit, ratings: [] });
          }
          outfitMap.get(outfit.id)!.ratings.push(rating);
        }
      });

      const outfitsWithAvg: OutfitWithAvg[] = Array.from(outfitMap.values()).map(({ outfit, ratings }) => {
        const avg = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length : 0;
        return {
          id: outfit.id,
          image_url: outfit.image_url,
          username: outfit.username,
          averageRating: avg,
        };
      });

      setOutfitsWithAvg(outfitsWithAvg);
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

  const resizeImageToInstagram = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      const url = URL.createObjectURL(file);

      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = 1350;
        const ctx = canvas.getContext("2d");

        const imgRatio = img.width / img.height;
        const canvasRatio = canvas.width / canvas.height;
        let drawWidth, drawHeight, drawX, drawY;
        if (imgRatio > canvasRatio) {
          drawHeight = canvas.height;
          drawWidth = imgRatio * canvas.height;
          drawX = (canvas.width - drawWidth) / 2;
          drawY = 0;
        } else {
          drawWidth = canvas.width;
          drawHeight = canvas.width / imgRatio;
          drawX = 0;
          drawY = (canvas.height - drawHeight) / 2;
        }
        ctx!.drawImage(img, drawX, drawY, drawWidth, drawHeight);

        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob failed"));
        }, "image/jpeg", 0.95);

        URL.revokeObjectURL(url);
      };

      img.onerror = () => reject(new Error("Image load error"));
      img.src = url;
    });
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
      const resizedBlob = await resizeImageToInstagram(file);

      const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
      const filePath = `outfits/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("outfit-images")
        .upload(filePath, resizedBlob);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = await supabase.storage
        .from("outfit-images")
        .getPublicUrl(filePath);

      const image_path_value =
        ((uploadData as any)?.path || (uploadData as any)?.Key || (uploadData as any)?.key) || filePath || `outfits/${fileName}`;

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

      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/analyze-outfit`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ outfitId: outfit.id }),
        });

        if (response.ok) {
          const result = await response.json();
          toast.success(`AI analysis complete! Found ${result.itemsDetected} clothing items.`);
          setDetectedItems(result.items || []);
        } else {
          console.error('AI analysis failed');
        }
      } catch (analysisError) {
        console.error('Error triggering AI analysis:', analysisError);
      }

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
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 py-8 sm:py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif font-bold tracking-tight mb-2">
                RATEME
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 tracking-[0.3em] uppercase font-sans font-light">
                Editorial Fashion Rating
              </p>
            </div>
            <div className="flex items-center gap-8">
              <Link
                to="/"
                className="px-6 py-3 border border-white text-white font-sans text-sm tracking-wider uppercase hover:bg-white hover:text-black transition-all duration-300"
              >
                Gallery
              </Link>
              <div className="text-right border-l border-white/20 pl-8">
                <div className="text-4xl sm:text-5xl font-serif font-bold">
                  {averageRating}
                </div>
                <p className="text-xs text-gray-400 tracking-[0.2em] uppercase font-sans mt-1">
                  Average
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 py-16 sm:py-24">
        {/* Hero Section */}
        <div className="mb-20 sm:mb-32">
          <h2 className="text-6xl sm:text-8xl lg:text-9xl font-serif font-bold tracking-tight leading-[0.9] mb-8">
            RATE YOUR
            <br />
            STYLE
          </h2>
          <div className="w-24 h-px bg-white mb-8"></div>
          <p className="text-sm sm:text-base text-gray-400 tracking-[0.2em] uppercase font-sans font-light max-w-2xl">
            Upload outfits and receive honest feedback from the community
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Upload and Rating */}
          <div className="border border-white/20">
            <div className="p-8 sm:p-12">
              {imageUrl ? (
                <div className="space-y-8">
                  <div className="relative bg-neutral-900 border border-white/10">
                    <img
                      src={imageUrl}
                      alt="Outfit"
                      className="w-full h-auto object-contain"
                    />
                    {/* Bounding boxes overlay */}
                    {detectedItems.map((item, index) => (
                      <Tooltip key={index}>
                        <TooltipTrigger asChild>
                          <div
                            className="absolute border-2 border-yellow-400 pointer-events-auto"
                            style={{
                              top: `${item.bounding_box.y * 100}%`,
                              left: `${item.bounding_box.x * 100}%`,
                              width: `${item.bounding_box.width * 100}%`,
                              height: `${item.bounding_box.height * 100}%`,
                              boxShadow: "0 0 5px 2px rgba(255, 255, 0, 0.7)",
                              cursor: "pointer",
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" align="center">
                          {item.item_name} ({(item.confidence * 100).toFixed(1)}%)
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    <button
                      onClick={() => {
                        setImageUrl("");
                        setOutfitId("");
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="absolute bottom-4 left-4 right-4 bg-black/80 hover:bg-white hover:text-black text-white font-sans text-sm tracking-wider uppercase py-3 transition-all duration-300 border border-white/20"
                    >
                      Remove Image
                    </button>
                  </div>

                  {/* Rating Section */}
                  <div className="space-y-6">
                    <label className="block text-white font-serif text-2xl">
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
                          className={`w-10 sm:w-12 h-10 sm:h-12 border font-sans text-sm sm:text-base transition-all duration-200 disabled:opacity-50 ${
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
                        <span className="text-3xl font-serif font-bold">{rating}/10</span>
                        <p className="text-gray-400 text-sm mt-2 font-sans">
                          {rating <= 3 && "Not a fan"}
                          {rating > 3 && rating <= 5 && "Could be better"}
                          {rating > 5 && rating <= 7 && "Pretty good"}
                          {rating > 7 && rating <= 9 && "Looks great"}
                          {rating === 10 && "Absolutely perfect"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Feedback Section */}
                  <div className="space-y-3">
                    <label className="block text-white font-sans text-sm tracking-wider uppercase">
                      Add feedback (optional)
                    </label>
                    <textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Share your thoughts..."
                      disabled={submitting}
                      className="w-full bg-black border border-white/20 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white transition-all duration-200 resize-none disabled:opacity-50 font-sans"
                      rows={4}
                    />
                  </div>

                  <button
                    onClick={handleSubmitRating}
                    disabled={submitting || rating === 0}
                    className="w-full bg-white text-black font-sans text-sm tracking-wider uppercase py-3 hover:bg-black hover:text-white hover:border-white border border-white transition-all duration-300 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="inline w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Rating"
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="block text-white font-sans text-sm tracking-wider uppercase">
                      Username
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className="w-full bg-black border border-white/20 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white transition-all duration-200 font-sans"
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="block text-white font-sans text-sm tracking-wider uppercase">
                      Upload Outfit
                    </label>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      accept="image/*"
                      disabled={uploading || !username.trim()}
                      className="w-full bg-black border border-white/20 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-white transition-all duration-200 font-sans file:mr-4 file:py-4 file:px-6 file:border-0 file:bg-white file:text-black file:font-sans file:text-sm file:tracking-wider file:uppercase hover:file:bg-black hover:file:text-white disabled:opacity-50"
                    />
                    {uploading && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" />
                        <span className="text-white font-sans text-sm">Uploading...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Gallery */}
          <div className="border border-white/20">
            <div className="p-8 sm:p-12">
              <h3 className="text-2xl font-serif font-bold mb-8">Community Gallery</h3>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : outfitsWithAvg.length === 0 ? (
                <p className="text-gray-400 text-center py-12">No outfits rated yet.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {outfitsWithAvg.map((outfit) => (
                    <div key={outfit.id} className="group cursor-pointer">
                      <div className="aspect-square bg-neutral-900 border border-white/10 overflow-hidden mb-2">
                        <img
                          src={outfit.image_url}
                          alt={`Outfit by ${outfit.username}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < Math.round(outfit.averageRating / 2)
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-600"
                              }`}
                            />
                          ))}
                          <span className="text-sm text-gray-400 ml-1">
                            {outfit.averageRating.toFixed(1)}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400 font-sans uppercase tracking-wider">
                          {outfit.username}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
