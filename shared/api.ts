import { supabase } from "@/lib/supabase";
import { OutfitWithRating } from "./types";

export async function getOutfit(outfitId: string): Promise<OutfitWithRating> {
  const { data, error } = await supabase
    .from("outfits")
    .select(`
      *,
      outfit_items (
        id,
        item_name,
        bounding_box,
        shopping_links (
          id,
          url,
          title,
          price
        )
      )
    `)
    .eq("id", outfitId)
    .single(); // get a single outfit

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Outfit not found");

  return data;
}
