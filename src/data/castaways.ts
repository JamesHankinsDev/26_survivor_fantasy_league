import type { Castaway } from '@/components/CastawayCard';

// Temporary placeholder roster for Season 50.
// The real roster couldn't be scraped automatically (site redirected to an
// auth/consent page). Replace these entries with the official cast names and
// image URLs when available.
const CASTAWAYS: Castaway[] = Array.from({ length: 20 }).map((_, i) => ({
  id: `castaway-${i + 1}`,
  name: `Castaway ${i + 1}`,
  image: `/images/castaway-${i + 1}.svg`,
  bio: 'Bio and stats coming soon.',
  stats: {},
}));

export default CASTAWAYS;
