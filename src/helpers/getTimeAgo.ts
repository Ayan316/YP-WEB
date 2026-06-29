/**
 * Convert a date string to abbreviated "time ago" format
 * Matches the mobile app format: "5m ago", "3h ago", "2d ago", "1w ago", "2mo ago", "1y ago"
 * Example: "2026-01-07T06:40:04.390700+00:00" → "2mo ago"
 */
export const getTimeAgo = (dateString: string): string => {
  if (!dateString) return '';

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? '1d ago' : `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return weeks === 1 ? '1w ago' : `${weeks}w ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? '1mo ago' : `${months}mo ago`;

  const years = Math.floor(days / 365);
  return years === 1 ? '1y ago' : `${years}y ago`;
};
