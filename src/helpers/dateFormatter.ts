import { formatDistanceToNowStrict } from "date-fns";

export function formateDOBDate(dateStr: string) {
  const [day, month, year] = dateStr.split("-").map(Number);
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${pad(day)}-${pad(month)}-${year}`;
}

export function formatChatDate(dateStr: string) {
  if (!dateStr) return "";

  const date = new Date(dateStr);

  if (isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTimeOnly(
  dateString: string,
  timeZone: string = 'Asia/Kolkata'
): string {
  if (!dateString) return ''

  return new Date(dateString).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone
  })
}


export const timeAgo = (dateString: string | Date): string => {
  if (!dateString) return "";

  const date = typeof dateString === "string"
    ? new Date(dateString)
    : dateString;

  if (isNaN(date.getTime())) return "";

  const secondsDiff = Math.floor(
    (Date.now() - date.getTime()) / 1000
  );

  if (secondsDiff < 10) return "Just now";

  return formatDistanceToNowStrict(date, {
    addSuffix: true,
  });
};



// Abbreviated time-ago for job listings — matches mobile app format
// "5m ago", "3h ago", "2d ago", "1w ago", "2mo ago", "1y ago"
export const getTimeAgoJobListing = (
  dateString: string
): string => {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return days === 1 ? "1d ago" : `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return weeks === 1 ? "1w ago" : `${weeks}w ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return months === 1 ? "1mo ago" : `${months}mo ago`;

  const years = Math.floor(days / 365);
  return years === 1 ? "1y ago" : `${years}y ago`;
};
