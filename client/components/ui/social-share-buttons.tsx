import { useState } from 'react';
import { Instagram, Facebook, Music } from 'lucide-react';
import { toast } from 'sonner';
import {
  shareToInstagram,
  shareToTikTok,
  shareToFacebook,
} from '@/lib/share-utils';
import { OutfitWithRating } from '@shared/types';

interface SocialShareButtonsProps {
  outfit: OutfitWithRating;
}

export function SocialShareButtons({ outfit }: SocialShareButtonsProps) {
  const [isSharing, setIsSharing] = useState<string | null>(null);

  const handleShare = async (platform: 'instagram' | 'tiktok' | 'facebook') => {
    setIsSharing(platform);
    try {
      switch (platform) {
        case 'instagram':
          await shareToInstagram({
            imageUrl: outfit.image_url,
            outfitId: outfit.id,
            username: outfit.username,
            rating: outfit.averageRating,
            platform: 'instagram',
          });
          toast.success('Image ready! Uploading to Instagram...');
          break;

        case 'tiktok':
          await shareToTikTok({
            imageUrl: outfit.image_url,
            outfitId: outfit.id,
            username: outfit.username,
            rating: outfit.averageRating,
            platform: 'tiktok',
          });
          toast.success('Image ready! Opening TikTok upload...');
          break;

        case 'facebook':
          await shareToFacebook({
            imageUrl: outfit.image_url,
            outfitId: outfit.id,
            username: outfit.username,
            rating: outfit.averageRating,
            platform: 'facebook',
          });
          toast.success('Sharing to Facebook...');
          break;
      }
    } catch (error) {
      console.error(`Error sharing to ${platform}:`, error);
      toast.error(`Failed to share to ${platform}`);
    } finally {
      setIsSharing(null);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {/* Instagram */}
      <button
        onClick={() => handleShare('instagram')}
        disabled={isSharing !== null}
        className="p-1.5 rounded-lg bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Share to Instagram"
      >
        <Instagram className="w-3.5 h-3.5" />
      </button>

      {/* TikTok */}
      <button
        onClick={() => handleShare('tiktok')}
        disabled={isSharing !== null}
        className="p-1.5 rounded-lg bg-black border border-white text-white hover:bg-gray-900 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Share to TikTok"
      >
        <Music className="w-3.5 h-3.5" />
      </button>

      {/* Facebook */}
      <button
        onClick={() => handleShare('facebook')}
        disabled={isSharing !== null}
        className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Share to Facebook"
      >
        <Facebook className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

