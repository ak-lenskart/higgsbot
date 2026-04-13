import type { Scene } from '../types/models';
import { v4 as uuid } from 'uuid';

export function createDefaultScenes(): Scene[] {
  const now = Date.now();
  const scenes: Array<Omit<Scene, 'id' | 'createdAt' | 'totalGenerations' | 'approvalRate' | 'active'>> = [
    { name: 'Cafe', description: 'Cozy cafe with warm lighting and coffee cups', promptFragment: 'sitting at a cozy cafe table with warm ambient lighting, coffee cup nearby', category: 'indoor' },
    { name: 'Balcony', description: 'Urban balcony with city skyline views', promptFragment: 'standing on a modern apartment balcony overlooking the city skyline', category: 'outdoor' },
    { name: 'Cobblestone Street', description: 'European-style cobblestone street', promptFragment: 'walking down a charming cobblestone street in a European-style neighborhood', category: 'urban' },
    { name: 'Metro/Train', description: 'Inside a metro train or station', promptFragment: 'inside a modern metro train, sitting by the window with reflections', category: 'urban' },
    { name: 'Mirror Selfie', description: 'Full-length mirror selfie setup', promptFragment: 'taking a mirror selfie in a clean, well-lit space with a full-length mirror', category: 'indoor' },
    { name: 'Cafe Laptop', description: 'Working at a cafe with laptop', promptFragment: 'working at a cafe table with a laptop, focused and stylish', category: 'indoor' },
    { name: 'Golden Window', description: 'Golden hour light streaming through a window', promptFragment: 'bathed in warm golden hour light streaming through a large window', category: 'indoor' },
    { name: 'Boutique', description: 'Inside a trendy boutique or shop', promptFragment: 'browsing inside a trendy boutique shop with stylish decor', category: 'indoor' },
    { name: 'Blue Hour', description: 'Outdoor scene during blue hour twilight', promptFragment: 'standing outdoors during blue hour with soft twilight tones in the sky', category: 'outdoor' },
    { name: 'Park Bench', description: 'Sitting on a park bench in greenery', promptFragment: 'sitting casually on a park bench surrounded by lush green trees', category: 'outdoor' },
    { name: 'Brunch', description: 'Brunch table setting with food', promptFragment: 'at a beautiful brunch table with pastries and fresh juice', category: 'lifestyle' },
    { name: 'Apartment Stairs', description: 'Sitting on apartment building stairs', promptFragment: 'sitting on the steps of a stylish apartment building entrance', category: 'urban' },
    { name: 'Candid Laugh', description: 'Candid laughing moment', promptFragment: 'caught in a natural candid laugh, genuine joy on face', category: 'lifestyle' },
    { name: 'Taxi/Uber', description: 'Inside a taxi or ride-share', promptFragment: 'sitting in the back seat of a taxi, city lights visible through the window', category: 'urban' },
    { name: 'Flower Market', description: 'Browsing a colorful flower market', promptFragment: 'walking through a colorful outdoor flower market with blooms everywhere', category: 'outdoor' },
    { name: 'Restaurant', description: 'Upscale restaurant dining', promptFragment: 'seated at an upscale restaurant table with moody ambient lighting', category: 'indoor' },
    { name: 'Phone Walk', description: 'Walking while using phone', promptFragment: 'walking down a street casually checking phone, urban backdrop', category: 'urban' },
    { name: 'Rooftop', description: 'Rooftop with city panorama', promptFragment: 'standing on a rooftop terrace with a panoramic city view behind', category: 'outdoor' },
    { name: 'Bedroom', description: 'Cozy bedroom morning scene', promptFragment: 'in a bright, cozy bedroom with soft morning light and clean linens', category: 'indoor' },
    { name: 'Bathroom', description: 'Clean modern bathroom', promptFragment: 'in a clean modern bathroom with marble surfaces and soft lighting', category: 'indoor' },
    { name: 'Coffee Walk', description: 'Walking with coffee cup in hand', promptFragment: 'walking confidently holding a takeaway coffee cup, morning energy', category: 'lifestyle' },
    { name: 'Airport', description: 'Airport terminal or lounge', promptFragment: 'in an airport terminal with large windows, travel-ready look', category: 'urban' },
    { name: 'Window Read', description: 'Reading by a window', promptFragment: 'reading a book by a sunlit window in a quiet indoor space', category: 'indoor' },
    { name: 'Hair Tuck', description: 'Casual hair tuck pose', promptFragment: 'casually tucking hair behind ear with a relaxed confident expression', category: 'lifestyle' },
    { name: 'Rainy Street', description: 'Walking on a rainy street', promptFragment: 'on a rain-slicked city street with reflections and moody atmosphere', category: 'urban' },
    { name: 'Cafe Reflection', description: 'Thoughtful moment in a cafe', promptFragment: 'gazing thoughtfully through a cafe window with a warm drink nearby', category: 'indoor' },
    { name: 'Friends Bokeh', description: 'With blurred friends in background', promptFragment: 'in focus with friends chatting in soft bokeh background, social vibe', category: 'lifestyle' },
    { name: 'Skincare', description: 'Post-skincare fresh-faced look', promptFragment: 'with fresh dewy skin in a bright bathroom, post-skincare glow', category: 'lifestyle' },
    { name: 'Cafe Notebook', description: 'Writing in a notebook at cafe', promptFragment: 'writing in a notebook at a cafe, creatively focused with coffee nearby', category: 'indoor' },
    { name: 'Neutral Portrait', description: 'Clean neutral background portrait', promptFragment: 'standing against a clean neutral background, minimal and editorial', category: 'indoor' },
  ];

  return scenes.map((s) => ({
    ...s,
    id: uuid(),
    active: true,
    totalGenerations: 0,
    approvalRate: null,
    createdAt: now,
  }));
}
