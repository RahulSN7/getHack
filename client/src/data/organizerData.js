// ---------------------------------------------------------------------------
// organizerData.js — Data source for Organizer Experience
// Connected with existing getHack hackathons, teammates, and teams data.
// ---------------------------------------------------------------------------

export const ORGANIZER_PROFILE = {
  id: "org-tech-community-india",
  name: "TechCommunity India",
  organization: "TechCommunity Foundation",
  email: "organizer@techcommunity.in",
  website: "https://techcommunity.in",
  location: "Bengaluru, India",
  description:
    "We build and empower India's largest developer community by organizing high-impact hackathons, technical workshops, and open-source initiatives.",
  totalHackathons: 8,
  activeHackathonsCount: 2,
  draftsCount: 3,
  completedCount: 3,
  joinedDate: "Jan 2024",
};

export const ORGANIZER_HACKATHONS = [
  {
    id: "hack-for-good-2025",
    name: "HackForGood 2025",
    status: "Active", // Active | Draft | Completed
    registrationStatus: "Registration Open", // Registration Open | Registration Closed
    mode: "Online",
    registrationDeadline: "2026-08-25T23:59:00+05:30",
    hackathonDate: "Aug 25–27, 2026",
    eventStartDate: "2026-08-25",
    eventEndDate: "2026-08-27",
    registrationsCount: 1248,
    teamsCount: 184,
    submissionsCount: 96,
    prizePool: "₹50,000",
    domain: "Social Impact",
  },
  {
    id: "build-with-ai",
    name: "BuildWithAI",
    status: "Active",
    registrationStatus: "Registration Open",
    mode: "Hybrid",
    location: "Bengaluru",
    registrationDeadline: "2026-09-20T23:59:00+05:30",
    hackathonDate: "Sep 29–Oct 02, 2026",
    eventStartDate: "2026-09-29",
    eventEndDate: "2026-10-02",
    registrationsCount: 578,
    teamsCount: 92,
    submissionsCount: 41,
    prizePool: "$2,500",
    domain: "Artificial Intelligence",
  },
  {
    id: "web3-innovation-summit",
    name: "Web3 Innovation Hackathon",
    status: "Draft",
    registrationStatus: "Registration Closed",
    mode: "Online",
    registrationDeadline: "2026-10-15T23:59:00+05:30",
    hackathonDate: "Oct 24–26, 2026",
    eventStartDate: "2026-10-24",
    eventEndDate: "2026-10-26",
    registrationsCount: 0,
    teamsCount: 0,
    submissionsCount: 0,
    prizePool: "$5,000",
    domain: "Blockchain & Web3",
  },
  {
    id: "cloud-native-fest",
    name: "Cloud Native Hackfest 2026",
    status: "Draft",
    registrationStatus: "Registration Closed",
    mode: "Online",
    registrationDeadline: "2026-11-01T23:59:00+05:30",
    hackathonDate: "Nov 12–14, 2026",
    eventStartDate: "2026-11-12",
    eventEndDate: "2026-11-14",
    registrationsCount: 0,
    teamsCount: 0,
    submissionsCount: 0,
    prizePool: "₹1,000,000",
    domain: "DevOps & Cloud",
  },
  {
    id: "designathon-2026",
    name: "Designathon 2026",
    status: "Draft",
    registrationStatus: "Registration Closed",
    mode: "Online",
    registrationDeadline: "2026-12-05T23:59:00+05:30",
    hackathonDate: "Dec 18–20, 2026",
    eventStartDate: "2026-12-18",
    eventEndDate: "2026-12-20",
    registrationsCount: 0,
    teamsCount: 0,
    submissionsCount: 0,
    prizePool: "₹75,000",
    domain: "UI/UX & Product Design",
  },
  {
    id: "fintech-disrupt-2025",
    name: "FinTech Disrupt Hackathon",
    status: "Completed",
    registrationStatus: "Registration Closed",
    mode: "Offline",
    location: "Mumbai",
    registrationDeadline: "2025-11-10T23:59:00+05:30",
    hackathonDate: "Nov 20–22, 2025",
    eventStartDate: "2025-11-20",
    eventEndDate: "2025-11-22",
    registrationsCount: 890,
    teamsCount: 142,
    submissionsCount: 110,
    prizePool: "₹2,00,000",
    domain: "FinTech",
  },
  {
    id: "cyber-defense-challenge",
    name: "National Cyber Defense Challenge",
    status: "Completed",
    registrationStatus: "Registration Closed",
    mode: "Online",
    registrationDeadline: "2025-08-15T23:59:00+05:30",
    hackathonDate: "Aug 22–24, 2025",
    eventStartDate: "2025-08-22",
    eventEndDate: "2025-08-24",
    registrationsCount: 1420,
    teamsCount: 210,
    submissionsCount: 165,
    prizePool: "$3,000",
    domain: "Cybersecurity",
  },
  {
    id: "open-data-hack-2025",
    name: "Open Data & GovTech Hackathon",
    status: "Completed",
    registrationStatus: "Registration Closed",
    mode: "Hybrid",
    location: "New Delhi",
    registrationDeadline: "2025-05-01T23:59:00+05:30",
    hackathonDate: "May 10–12, 2025",
    eventStartDate: "2025-05-10",
    eventEndDate: "2025-05-12",
    registrationsCount: 650,
    teamsCount: 98,
    submissionsCount: 78,
    prizePool: "₹1,50,000",
    domain: "GovTech",
  },
];

// Detailed registrations list for selected hackathon
export const HACKATHON_REGISTRATIONS = {
  "hack-for-good-2025": [
    {
      id: "reg-1",
      userId: "m1",
      name: "Rahul Sharma",
      getHackId: "GH-7K4P2",
      email: "rahul.sharma@example.com",
      role: "Frontend Developer",
      registeredAt: "Aug 15, 2026",
      teamStatus: "In Team",
      teamName: "CodeCrafters",
    },
    {
      id: "reg-2",
      userId: "m2",
      name: "Priya Patel",
      getHackId: "GH-3M9N8",
      email: "priya.patel@example.com",
      role: "UI/UX Designer",
      registeredAt: "Aug 14, 2026",
      teamStatus: "In Team",
      teamName: "CodeCrafters",
    },
    {
      id: "reg-3",
      userId: "m3",
      name: "Arjun Verma",
      getHackId: "GH-5R2T1",
      email: "arjun.v@example.com",
      role: "Backend Developer",
      registeredAt: "Aug 14, 2026",
      teamStatus: "Looking for Team",
      teamName: null,
    },
    {
      id: "reg-4",
      userId: "m4",
      name: "Ananya Iyer",
      getHackId: "GH-9W4L6",
      email: "ananya.i@example.com",
      role: "AI / ML Engineer",
      registeredAt: "Aug 13, 2026",
      teamStatus: "In Team",
      teamName: "Neural Nexus",
    },
    {
      id: "reg-5",
      userId: "m5",
      name: "Rohan Kulkarni",
      getHackId: "GH-2B8V5",
      email: "rohan.k@example.com",
      role: "Fullstack Developer",
      registeredAt: "Aug 12, 2026",
      teamStatus: "Looking for Team",
      teamName: null,
    },
    {
      id: "reg-6",
      userId: "m6",
      name: "Sneha Reddy",
      getHackId: "GH-6F1X9",
      email: "sneha.r@example.com",
      role: "Product Manager",
      registeredAt: "Aug 11, 2026",
      teamStatus: "In Team",
      teamName: "EcoBuild",
    },
  ],
};

// Detailed teams list for selected hackathon
export const HACKATHON_TEAMS = {
  "hack-for-good-2025": [
    {
      id: "t1",
      name: "CodeCrafters",
      hackathonId: "hack-for-good-2025",
      status: "Looking for 1 member",
      size: 3,
      maxSize: 4,
      createdAt: "Aug 14, 2026",
      leader: "Rahul Sharma",
      members: [
        { name: "Rahul Sharma", role: "Frontend Lead", initial: "R", accent: "indigo" },
        { name: "Priya Patel", role: "UI/UX Designer", initial: "P", accent: "violet" },
        { name: "Vikram Das", role: "Backend Engineer", initial: "V", accent: "amber" },
      ],
    },
    {
      id: "t2",
      name: "Neural Nexus",
      hackathonId: "hack-for-good-2025",
      status: "Team Complete",
      size: 4,
      maxSize: 4,
      createdAt: "Aug 13, 2026",
      leader: "Ananya Iyer",
      members: [
        { name: "Ananya Iyer", role: "AI Engineer", initial: "A", accent: "emerald" },
        { name: "Devansh Mehta", role: "Data Scientist", initial: "D", accent: "blue" },
        { name: "Kavya Nair", role: "Fullstack Dev", initial: "K", accent: "rose" },
        { name: "Siddharth Roy", role: "MLOps", initial: "S", accent: "cyan" },
      ],
    },
    {
      id: "t3",
      name: "EcoBuild",
      hackathonId: "hack-for-good-2025",
      status: "Looking for 2 members",
      size: 2,
      maxSize: 4,
      createdAt: "Aug 11, 2026",
      leader: "Sneha Reddy",
      members: [
        { name: "Sneha Reddy", role: "Product Manager", initial: "S", accent: "rose" },
        { name: "Manish Joshi", role: "Frontend Developer", initial: "M", accent: "emerald" },
      ],
    },
  ],
};

// Submissions list for selected hackathon
export const HACKATHON_SUBMISSIONS = {
  "hack-for-good-2025": [
    {
      id: "sub-1",
      projectName: "CleanWater Connect",
      teamName: "CodeCrafters",
      status: "Submitted", // Submitted | Under Review | Evaluated
      submittedAt: "Aug 27, 2026 · 14:30 IST",
      description: "Real-time IoT and community reporting platform for clean drinking water supply monitoring in rural areas.",
      techStack: ["React", "Node.js", "PostgreSQL", "Tailwind CSS"],
      demoUrl: "https://example.com/demo/cleanwater",
      githubUrl: "https://github.com/example/cleanwater-connect",
    },
    {
      id: "sub-2",
      projectName: "AgriVision AI",
      teamName: "Neural Nexus",
      status: "Under Review",
      submittedAt: "Aug 27, 2026 · 16:15 IST",
      description: "Computer-vision crop disease diagnostic mobile application assisting smallholder farmers in early blight detection.",
      techStack: ["Python", "TensorFlow", "React Native", "FastAPI"],
      demoUrl: "https://example.com/demo/agrivision",
      githubUrl: "https://github.com/example/agrivision-ai",
    },
  ],
};

// Timeline milestones for selected hackathon
export const HACKATHON_TIMELINE = {
  "hack-for-good-2025": [
    {
      title: "Registration Opens",
      date: "August 01, 2026 · 10:00 AM IST",
      status: "Completed",
      description: "Registration forms live on getHack portal.",
    },
    {
      title: "Registration Closes",
      date: "August 25, 2026 · 11:59 PM IST",
      status: "Upcoming",
      description: "Final deadline for team registration and participant confirmation.",
    },
    {
      title: "Hackathon Begins & Problem Statements Released",
      date: "August 26, 2026 · 09:00 AM IST",
      status: "Upcoming",
      description: "48-hour hacking window commences. Mentor check-ins open.",
    },
    {
      title: "Submission Deadline",
      date: "August 28, 2026 · 09:00 AM IST",
      status: "Upcoming",
      description: "GitHub repository and video demo submission portal closes.",
    },
    {
      title: "Winners Announced & Award Ceremony",
      date: "August 30, 2026 · 05:00 PM IST",
      status: "Upcoming",
      description: "Evaluation results and prize pool distribution ceremony.",
    },
  ],
};

// Announcements list for selected hackathon
export const HACKATHON_ANNOUNCEMENTS = {
  "hack-for-good-2025": [
    {
      id: "ann-1",
      title: "Mentorship Session Schedule Released!",
      date: "Aug 15, 2026",
      author: "Organizer Team",
      content:
        "We are excited to announce 1-on-1 mentorship office hours featuring senior engineers from Google, Microsoft, and AWS. Check your dashboard for room links.",
    },
    {
      id: "ann-2",
      title: "API Credits & Cloud Voucher Distribution",
      date: "Aug 10, 2026",
      author: "Tech Support",
      content:
        "All registered team leaders have been sent $100 cloud credits for building AI & Fullstack prototypes. Please verify your inbox.",
    },
  ],
};

// Settings data for selected hackathon
export const HACKATHON_SETTINGS = {
  "hack-for-good-2025": {
    name: "HackForGood 2025",
    organizer: "TechCommunity India",
    mode: "Online",
    fee: "Free",
    minTeamSize: 2,
    maxTeamSize: 4,
    registrationOpen: true,
    visibility: "Public",
    requireTeamApproval: false,
    maxParticipants: 2000,
  },
};
