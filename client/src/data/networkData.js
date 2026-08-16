// ---------------------------------------------------------------------------
// Network relation data — initial Connections, Requests, and Sent requests
// Used by the My Network page (/network)
// References user entries in TEAMMATES (teammates.js)
// ---------------------------------------------------------------------------

export const INITIAL_CONNECTIONS = [
  { id: "conn-1", userId: "arjun-mehta", connectedAt: "2 days ago" },
  { id: "conn-2", userId: "sneha-reddy", connectedAt: "1 week ago" },
  { id: "conn-3", userId: "ananya-gupta", connectedAt: "3 weeks ago" },
  { id: "conn-4", userId: "rohan-das", connectedAt: "1 month ago" },
];

export const INITIAL_REQUESTS = [
  {
    id: "req-1",
    fromUserId: "rahul-joshi",
    message: "Hi! I'd like to connect and collaborate on data/ML hackathon projects.",
    createdAt: "Yesterday",
  },
  {
    id: "req-2",
    fromUserId: "aditya-kumar",
    message: "Hey there, love your React & design system work! Let's connect.",
    createdAt: "3 days ago",
  },
  {
    id: "req-3",
    fromUserId: "meera-patel",
    message: null,
    createdAt: "4 days ago",
  },
];

export const INITIAL_SENT = [
  { id: "sent-1", toUserId: "vikram-singh", createdAt: "2 days ago" },
  { id: "sent-2", toUserId: "kavya-nair", createdAt: "4 days ago" },
  { id: "sent-3", toUserId: "ishita-bansal", createdAt: "1 week ago" },
];
