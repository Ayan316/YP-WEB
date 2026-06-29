// src/lib/endpoints.ts
//
// Backend endpoint catalog. Values are the AUTHORITATIVE resolved backend paths
// from artifacts/migration-map.json (the real fetch() URLs in src/app/api/*),
// NOT the "(confirm)" guesses in REQUIREMENTS §4.5.
//
// CRITICAL: public reads forward to /api/web/* (web API, soft/none auth); gated
// writes and account reads forward to /api/mobile/* (strict auth). Both bases
// are appended to ${BACKEND_URL} by src/lib/api.ts. No "(confirm)" residue.

export const EP = {
  // public reads (auth none|soft) — /api/web/*
  jobsList: "/api/web/jobs",
  jobDetail: "/api/web/job",
  similarJobs: "/api/web/company/similar-jobs",
  companiesList: "/api/web/companies",
  companyDetail: "/api/web/company-details",
  companyJobs: "/api/web/company/jobs-list",
  eventsList: "/api/web/events",
  eventDetails: "/api/web/event",
  feed: "/api/web/feeds",
  commentsList: "/api/web/user/feed/comments",
  resourcesCats: "/api/web/resources/categories",
  resourcesList: "/api/web/resources/list",
  resourceDetail: "/api/web/resources/detail",
  skills: "/api/web/skills",
  locations: "/api/web/user-locations",
  institutions: "/api/web/institutions",
  filterList: "/api/web/user/search-filters",
  // get-user is a soft public read consumed by authed client components (ChatPanel/UserInfo)
  connectionUserProfile: "/api/web/user/get-profile",
  contactUs: "/api/web/user/contact-us",

  // gated writes/account reads (auth strict) — /api/mobile/*
  saveJob: "/api/mobile/user/save-job",
  unsaveJob: "/api/mobile/user/remove-job",
  savedJobs: "/api/mobile/user/saved-jobs",
  // Public (soft-auth) recommendations — works for logged-out visitors too.
  recommendedJobs: "/api/web/user/recommended-jobs",
  appliedJob: "/api/mobile/user/applied-jobs",
  appliedJobsList: "/api/mobile/user/applied-jobs-list",
  followCompany: "/api/mobile/company/follow",
  followings: "/api/mobile/user/followings",
  reaction: "/api/mobile/user/feed/reaction",
  addComment: "/api/mobile/user/feed/add-comment",
  // delete-comment also forwards here today (confirmed bug — relies on an action flag)
  updateComment: "/api/mobile/user/feed/update-comment",
  repost: "/api/mobile/user/feed/share",
  blockUser: "/api/mobile/user/block",
  unblockUser: "/api/mobile/user/unblock",
  blockedList: "/api/mobile/user/blocked-list",
  reportUser: "/api/mobile/user/report",
  myReports: "/api/mobile/user/my-reports",
  acceptTerms: "/api/mobile/user/accept-terms",
  termsStatus: "/api/mobile/user/terms-status",
  notifications: "/api/mobile/notifications",
  notifRead: "/api/mobile/notifications/read-status",
  notifRemove: "/api/mobile/notifications/remove",
  // all-message-users AND search-connected-users both hit conversations (confirmed dup)
  conversation: "/api/mobile/user/conversation",
  conversations: "/api/mobile/user/conversations",
  sendMessage: "/api/mobile/user/conversation/add-message",
  sendConnection: "/api/mobile/user/send-connection-request",
  sendingConn: "/api/mobile/user/sending-connection",
  receiveConn: "/api/mobile/user/receive-connection-request",
  declinedConn: "/api/mobile/user/declined-connection-request",
  updateConn: "/api/mobile/user/update-connection-status",
  deleteConn: "/api/mobile/user/delete-connections",
  userConnections: "/api/mobile/user/connections",
  profileData: "/api/mobile/profile",
  createProfile: "/api/mobile/V1/create-profile",
  updateProfile: "/api/mobile/update-profile",
  uploadProfileImg: "/api/mobile/V1/upload-profile-img", // multipart -> api.postForm
  aiQuestions: "/api/mobile/questions",
  aiAddSummary: "/api/mobile/add-summary",
  eventCreateBooking: "/api/mobile/event/create-booking",
  eventCheckAvail: "/api/mobile/event/check-availability",
  eventApplyCoupon: "/api/mobile/event/apply-coupon",
  eventConfirmPayment: "/api/mobile/event/confirm-payment", // payment-critical -> keep explicit + idempotency
  eventCancelBooking: "/api/mobile/event/cancel-booking",
  eventMyBookings: "/api/mobile/event/my-bookings",
  eventBookingDetail: "/api/mobile/event/booking-detail",
} as const;

export type EndpointKey = keyof typeof EP;
