export const CURRENCIES = [
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'CAD', symbol: 'CA$', label: 'CAD (CA$)' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (A$)' },
  { code: 'JPY', symbol: '¥', label: 'JPY (¥)' },
];

export const TRAVEL_STYLES = [
  {
    id: 'budget',
    title: 'Budget Explorer',
    description: 'Smart savings, public transit, hostels & street food',
    multiplier: 'Economical',
    badge: 'Affordable',
  },
  {
    id: 'balanced',
    title: 'Balanced Traveler',
    description: 'Comfortable hotels, iconic sights, good dining & fun',
    multiplier: 'Standard',
    badge: 'Most Popular',
  },
  {
    id: 'luxury',
    title: 'Luxury & Comfort',
    description: 'High-end stays, private tours, fine dining & VIP access',
    multiplier: 'Premium',
    badge: 'Exclusive',
  },
];

export const PACE_OPTIONS = [
  {
    id: 'relaxed',
    title: 'Relaxed',
    description: '1–2 activities per day. Plenty of downtime, coffee breaks, and slow wandering.',
  },
  {
    id: 'balanced',
    title: 'Balanced',
    description: '3–4 activities per day. Good mix of key attractions and personal exploration.',
  },
  {
    id: 'packed',
    title: 'Packed & Fast-Paced',
    description: '4–5 activities per day. Maximize every hour to see everything possible.',
  },
];

export const INTEREST_OPTIONS = [
  { id: 'sightseeing', label: 'Sightseeing', icon: 'Landmark' },
  { id: 'food', label: 'Food & Dining', icon: 'Utensils' },
  { id: 'culture', label: 'History & Culture', icon: 'Building' },
  { id: 'adventure', label: 'Adventure & Outdoors', icon: 'Compass' },
  { id: 'nature', label: 'Nature & Parks', icon: 'Trees' },
  { id: 'relaxation', label: 'Relaxation & Wellness', icon: 'Sparkles' },
  { id: 'shopping', label: 'Shopping & Boutiques', icon: 'ShoppingBag' },
  { id: 'nightlife', label: 'Nightlife & Bars', icon: 'Moon' },
];

export const ACCOMMODATION_OPTIONS = [
  'Boutique Hotel',
  '4-Star / 5-Star Hotel',
  'Cozy Bed & Breakfast',
  'Apartment / Airbnb',
  'Resort & Spa',
  'Social Hostel',
];

export const DIETARY_OPTIONS = [
  'None / Flexible',
  'Vegetarian',
  'Vegan',
  'Halal',
  'Kosher',
  'Gluten-Free',
  'Pescatarian',
];

export const ACCESSIBILITY_OPTIONS = [
  'None',
  'Wheelchair Accessible',
  'Elevator / Step-Free Access',
  'Low Physical Walking Required',
  'Visual or Hearing Assistance Needs',
];

export const POPULAR_DESTINATIONS = [
  {
    name: 'Kyoto, Japan',
    query: 'Kyoto',
    tag: 'Cultural Heritage',
    rating: '4.9',
    description: 'Serene bamboo groves, golden temples, and traditional geisha districts.',
    image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
    days: '5-7 Days',
    avgBudget: '$1,800',
  },
  {
    name: 'Amalfi Coast, Italy',
    query: 'Amalfi Coast',
    tag: 'Coastal Elegance',
    rating: '4.95',
    description: 'Dramatic cliffs, pastel villages, sparkling Mediterranean waters, and limoncello.',
    image: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80',
    days: '4-6 Days',
    avgBudget: '$2,400',
  },
  {
    name: 'Swiss Alps, Switzerland',
    query: 'Swiss Alps',
    tag: 'Alpine Wonder',
    rating: '4.9',
    description: 'Snow-capped peaks, crystal mountain lakes, scenic cogwheel trains, and hiking.',
    image: 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=800&q=80',
    days: '6-8 Days',
    avgBudget: '$3,100',
  },
  {
    name: 'Paris, France',
    query: 'Paris',
    tag: 'Art & Romance',
    rating: '4.85',
    description: 'Iconic monuments, world-class art collections, Seine walks, and boulangeries.',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80',
    days: '4-5 Days',
    avgBudget: '$2,100',
  },
  {
    name: 'Bali, Indonesia',
    query: 'Bali',
    tag: 'Tropical Bliss',
    rating: '4.88',
    description: 'Lush rice terraces, spiritual water temples, surf breaks, and wellness sanctuaries.',
    image: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80',
    days: '7-10 Days',
    avgBudget: '$1,200',
  },
  {
    name: 'Banff, Canada',
    query: 'Banff',
    tag: 'Pure Nature',
    rating: '4.92',
    description: 'Turquoise glacial lakes, majestic Canadian Rockies, and pristine wildlife.',
    image: 'https://images.unsplash.com/photo-1517760444937-f6397edcbbcd?auto=format&fit=crop&w=800&q=80',
    days: '5-7 Days',
    avgBudget: '$1,900',
  },
];
