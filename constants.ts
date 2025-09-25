import { AspectRatio, GenerationModel, ImageFilter } from './types';

export const ASPECT_RATIOS: AspectRatio[] = ["1:1", "3:4", "4:3", "9:16", "16:9"];

export const AVAILABLE_MODELS: { name: string, id: GenerationModel }[] = [
    { name: 'VXDL 1 (Fused)', id: 'vxdl-1-fused' },
    { name: 'Imagen 4 Pro', id: 'imagen-4.0-generate-001' },
    { name: 'VXDL 1 ULTRA', id: 'gemini-2.5-flash-image-preview' },
];

export const IMAGE_FILTERS: ImageFilter[] = ['None', 'Grayscale', 'Sepia', 'Invert', 'Blur'];

export const STYLE_PRESETS: { name: string, keywords: string }[] = [
  { name: 'Cinematic', keywords: 'cinematic, film grain, dramatic lighting, professional cinematography' },
  { name: 'Photorealistic', keywords: 'photorealistic, 8k, ultra detailed, sharp focus, high quality photo' },
  { name: 'Hyper-realistic', keywords: 'hyperrealistic, masterpiece, best quality, ultra-detailed, cinematic photography, sharp focus, professional color grading, 8k' },
  { name: 'Anime', keywords: 'anime style, vibrant colors, clean line art, studio ghibli inspired' },
  { name: 'Fantasy', keywords: 'fantasy art, epic, magical, glowing elements, matte painting' },
  { name: 'Cyberpunk', keywords: 'cyberpunk, neon lights, futuristic city, dystopian, high tech' },
  { name: 'Vintage', keywords: 'vintage photo, sepia tones, 1950s photograph, grainy' }
];

export const DETAIL_LEVELS: { [key: number]: string } = {
    1: 'simple sketch, basic shapes',
    2: '', // Normal - No extra keywords
    3: 'detailed, intricate details',
    4: 'highly detailed, professional digital art',
    5: 'hyperrealistic, 8k resolution, masterpiece, breathtaking detail'
};

export const COS_STYLE_PRESETS: { name: string, promptId: string, category: string }[] = [
  // Professional
  { name: 'Professional Headshot', promptId: 'pro_headshot_1', category: 'Professional' },
  { name: 'Gourmet Food Photo', promptId: 'food_photography_1', category: 'Professional' },
  
  // Studio Shoots
  { name: 'Minimalist White Studio', promptId: 'studio_minimalist_1', category: 'Studio Shoots' },
  { name: 'Dark & Moody Studio', promptId: 'studio_dark_moody_1', category: 'Studio Shoots' },
  { name: 'Neon Noir Studio', promptId: 'studio_neon_noir_1', category: 'Studio Shoots' },
  { name: 'Vibrant Color Backdrop', promptId: 'studio_color_backdrop_1', category: 'Studio Shoots' },

  // Photography
  { name: 'Golden Hour Portrait', promptId: 'golden_hour_1', category: 'Photography' },
  { name: 'Film Noir Lighting', promptId: 'photo_film_noir_1', category: 'Photography' },
  
  // Pose & Viewpoint
  { name: 'Create New Poses', promptId: 'pose_variation_1', category: 'Pose & Viewpoint' },
  { name: 'Side Profile View', promptId: 'pose_side_profile_1', category: 'Pose & Viewpoint' },
  { name: 'Dramatic Low Angle', promptId: 'pose_low_angle_1', category: 'Pose & Viewpoint' },
  { name: 'From Behind View', promptId: 'pose_from_behind_1', category: 'Pose & Viewpoint' },
  { name: '3/4 View Portrait', promptId: 'pose_3_4_view_1', category: 'Pose & Viewpoint' },
  { name: 'Dynamic Action Pose', promptId: 'pose_action_1', category: 'Pose & Viewpoint' },
  { name: 'Candid Laughter Pose', promptId: 'pose_candid_1', category: 'Pose & Viewpoint' },
  { name: 'Full Body Shot', promptId: 'pose_full_body_1', category: 'Pose & Viewpoint' },

  // Themed Outfits & Wardrobe
  { name: 'Streetwear Style', promptId: 'outfit_streetwear_1', category: 'Themed Outfits & Wardrobe' },
  { name: 'Formal Gala Attire', promptId: 'outfit_formal_1', category: 'Themed Outfits & Wardrobe' },
  { name: 'Vintage 1920s Look', promptId: 'outfit_vintage_20s_1', category: 'Themed Outfits & Wardrobe' },
  { name: 'Sci-Fi Explorer Outfit', promptId: 'outfit_scifi_1', category: 'Themed Outfits & Wardrobe' },
  { name: 'Bohemian Festival Wear', promptId: 'outfit_bohemian_1', category: 'Themed Outfits & Wardrobe' },
  
  // Artistic & Character
  { name: 'Comic Book Style', promptId: 'comic_style_1', category: 'Artistic' },
  { name: 'Watercolor Painting', promptId: 'art_watercolor_1', category: 'Artistic' },
  { name: 'Fantasy RPG Portrait', promptId: 'rpg_character_1', category: 'Character Design' },
  { name: 'Cyberpunk Cyborg', promptId: 'char_cyborg_1', category: 'Character Design' },
  
  // Special
  { name: 'PERSONA', promptId: 'persona_modeling_poses_1', category: 'PERSONA' },
];
