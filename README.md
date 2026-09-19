# getHack

getHack is a full-stack web platform that helps developers discover
hackathons, find teammates with relevant skills, connect with other
participants, and collaborate on projects.

The platform supports both participants and organizers. Participants can
discover hackathons, build their network, find teammates, create teams,
send connection requests, and communicate with accepted connections.
Organizers can add, publish, and manage hackathon listings.

## Live Project

-   Frontend: https://gethack-tau.vercel.app/
-   Backend API: https://gethack.onrender.com/
-   Health Check: https://gethack.onrender.com/api/health

## Core Idea

getHack follows a simple product journey:

**Discover → Connect → Collaborate**

### Discover

-   Explore upcoming hackathons
-   Search and filter hackathons
-   View hackathon details
-   Save hackathons
-   Sort hackathons by deadline
-   Open external hackathon registration links

### Connect

-   Find developers, designers, and other participants
-   Search teammates based on skills and profile information
-   View public profiles
-   Send and receive connection requests
-   Build a personal network

### Collaborate

-   Create and manage teams
-   Send team requests
-   Connect with accepted users through chat
-   Communicate with teammates and connections
-   Manage notifications and network activity

## Features

### Participant Features

-   User registration and login
-   Email OTP verification
-   Google OAuth authentication
-   Profile creation and editing
-   Profile photo upload
-   Unique getHack user ID
-   Skill-based teammate discovery
-   Connection requests
-   My Network
-   My Teams
-   Team creation and management
-   Hackathon discovery
-   Hackathon search and filtering
-   Saved hackathons
-   Deadline-based sorting
-   External hackathon registration
-   Real-time messaging
-   Notifications
-   getHack AI assistant

### Organizer Features

Organizers have a dedicated organizer portal for:

-   Adding hackathons
-   Publishing hackathons
-   Editing hackathons
-   Managing hackathons
-   Adding hackathon images
-   Managing organizer profile information
-   Viewing organizer-owned hackathons

Organizer and participant accounts use separate roles:

-   `participant`
-   `organizer`

## getHack AI

getHack includes an AI assistant designed to help users interact with
the platform.

The assistant can help with:

-   Finding relevant hackathons
-   Finding teammates based on skills
-   Checking hackathon deadlines
-   Understanding skill requirements
-   Connecting users with relevant teammates
-   Handling natural-language searches

getHack AI is implemented as a global floating widget rather than a
separate route.

## Technology Stack

### Frontend

-   React
-   Vite
-   Tailwind CSS
-   React Router
-   Socket.IO client
-   Stream Chat client

### Backend

-   Node.js
-   Express.js
-   MongoDB
-   Mongoose
-   JWT authentication
-   Socket.IO
-   Google OAuth
-   Email OTP
-   Resend or configured SMTP email service

### Infrastructure and Services

-   MongoDB Atlas
-   Vercel
-   Render
-   Stream Chat
-   Google OAuth
-   Email delivery service

## Project Structure

``` text
getHack/
├── client/
│   ├── public/
│   └── src/
│       ├── components/
│       ├── contexts/
│       ├── pages/
│       ├── services/
│       ├── utils/
│       └── App.jsx
│
├── server/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── app.js
│
├── package.json
└── README.md
```

## Getting Started

### Prerequisites

Make sure the following are installed:

-   Node.js
-   npm
-   MongoDB Atlas account or MongoDB instance
-   Google OAuth credentials if Google login is enabled
-   Stream Chat credentials if chat is enabled
-   Email service credentials for OTP and transactional emails

### Clone the Repository

``` bash
git clone https://github.com/RahulSN7/getHack.git
cd getHack
```

### Install Dependencies

Install root dependencies:

``` bash
npm install
```

Install frontend dependencies:

``` bash
cd client
npm install
```

Install backend dependencies:

``` bash
cd ../server
npm install
```

Return to the project root:

``` bash
cd ..
```

## Environment Variables

Do not commit environment files or secret credentials to GitHub.

### Backend

Create a backend environment file according to the variables used by the
server configuration.

Typical production configuration includes values for:

``` env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
CLIENT_URL=https://gethack-tau.vercel.app

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://gethack-tau.vercel.app/api/auth/google/callback

STREAM_CHAT_API_KEY=your_stream_chat_api_key
STREAM_CHAT_API_SECRET=your_stream_chat_api_secret

RESEND_API_KEY=your_resend_api_key
```

Use the exact environment variable names required by the current server
implementation.

Never publish real secret values in the repository.

### Frontend

The frontend uses relative `/api` requests in production.

The Vercel deployment rewrites API requests to the Render backend.

Public client-side configuration such as the Stream Chat public API key
can be configured through the appropriate Vite environment variable.

Example:

``` env
VITE_STREAM_API_KEY=your_stream_public_api_key
```

Do not put private backend secrets in frontend environment variables.

## Running Locally

The project uses the root development script to run the frontend and
backend together.

From the project root:

``` bash
npm run dev
```

The development setup uses:

-   Frontend: Vite development server
-   Backend: Express server on port `5000`

The Vite development server proxies backend-related requests to the
local Express server.

## Backend Health Check

The backend provides a health endpoint:

``` text
GET /api/health
```

Example response:

``` json
{
  "success": true,
  "message": "getHack API is running"
}
```

## Authentication

getHack supports:

-   Email and password authentication
-   Email OTP verification
-   Google OAuth
-   JWT-based authentication
-   HTTP-only authentication cookies

Authentication routes include:

``` text
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
GET  /api/auth/google/callback
```

## Database

getHack uses MongoDB with Mongoose.

The primary user collection is:

``` text
users
```

The production database is hosted through MongoDB Atlas.

The application stores information such as:

-   User accounts
-   Roles
-   Profiles
-   Skills
-   Profile photos
-   Hackathons
-   Teams
-   Connections
-   Notifications
-   Other application data

The database name used by production configuration is:

``` text
getHack
```

## API Architecture

The frontend communicates with the backend using relative API paths:

``` text
/api/...
```

In production:

``` text
Vercel
   |
   v
getHack Frontend
   |
   v
Vercel Rewrite
   |
   v
Render
   |
   v
Express API
   |
   v
MongoDB Atlas
```

Uploads are served through the `/uploads` path and proxied to the
backend in production.

## Chat

getHack uses Stream Chat for messaging.

Chat access is intended for users who have an accepted connection.

The application supports:

-   Direct conversations
-   Group conversations
-   Unread messages
-   Favorites
-   Message reactions
-   Replies
-   Message actions
-   Message editing within the allowed time
-   Message deletion
-   Message copying
-   Mobile long-press message actions

## Notifications

The application provides notifications for relevant user activity such
as:

-   Connection requests
-   Connection updates
-   Team-related activity
-   Other application events

Socket-based functionality is used where real-time updates are required.

## SEO

getHack includes a dedicated SEO implementation for its public pages.

### Public Page SEO

The main indexable pages include:

-   `/`
-   `/hackathons`
-   `/teammates`
-   Public hackathon detail pages
-   Public team pages
-   Public participant profiles
-   Public organizer profiles

### Private Page Protection

Private/authenticated pages use `noindex` where appropriate, including:

-   `/login`
-   `/signup`
-   `/messages`
-   `/network`
-   `/create-team`
-   `/organizer`
-   Organizer management pages
-   Private profile pages

### SEO Features

-   Page-specific titles
-   Meta descriptions
-   Canonical URLs
-   Open Graph metadata
-   Twitter Card metadata
-   WebSite JSON-LD
-   Event JSON-LD for hackathons
-   robots.txt
-   Dynamic sitemap.xml
-   Google Search Console verification
-   Production-domain SEO URLs

Production SEO domain:

``` text
https://gethack-tau.vercel.app/
```

## Deployment

### Frontend

The frontend is deployed on Vercel.

The Vercel configuration handles rewrites for:

``` text
/api/*
/uploads/*
/sitemap.xml
/robots.txt
```

These routes are forwarded to the Render backend where required.

### Backend

The Express backend is deployed on Render.

Production backend:

``` text
https://gethack.onrender.com
```

### Database

Production database:

``` text
MongoDB Atlas
```

### Production Flow

``` text
User
 |
 v
Vercel
 |
 +---- Frontend
 |
 +---- /api/* ------> Render
 |                      |
 |                      v
 |                  Express API
 |                      |
 |                      v
 |                 MongoDB Atlas
 |
 +---- /uploads/* ----> Render
 |
 +---- /sitemap.xml --> Render
 |
 +---- /robots.txt ---> Render
```

## Security

Important security practices used by the project include:

-   HTTP-only authentication cookies
-   Secure cookies in production
-   Environment variables for secrets
-   Backend-only private credentials
-   Role-based access
-   Authenticated private routes
-   Protected API endpoints
-   No production secrets committed to Git

Never commit:

``` text
.env
.env.local
private API keys
JWT secrets
OAuth client secrets
database passwords
Stream Chat private secrets
```

If a secret is accidentally exposed, rotate it immediately.

## Development Guidelines

When modifying the project:

1.  Inspect the existing implementation before making changes.
2.  Reuse existing components, services, utilities, and API patterns
    where possible.
3.  Avoid unnecessary architectural changes.
4.  Keep participant and organizer roles separate.
5.  Preserve the existing Vercel-to-Render deployment architecture.
6.  Use relative `/api` paths from the frontend.
7.  Do not hardcode localhost URLs into production-facing code.
8.  Do not expose backend secrets to the frontend.
9.  Test both desktop and mobile layouts.
10. Run the production build before committing significant frontend
    changes.

## Production Build

Build the frontend:

``` bash
cd client
npm run build
```

A successful build should complete without compilation errors.

## Project Goals

getHack is designed to make it easier for developers and creators to:

-   Discover opportunities
-   Find people with complementary skills
-   Build teams
-   Connect with other participants
-   Collaborate on projects
-   Participate in hackathons
-   Help organizers publish and manage hackathons

## Roadmap

Potential future improvements include:

-   Better search and recommendation systems
-   Improved AI teammate matching
-   Advanced hackathon discovery
-   Better team collaboration tools
-   Performance optimization and route-level code splitting
-   Improved analytics for organizers
-   Additional collaboration features
-   Custom production domain and expanded brand presence

## Contributing

Contributions and improvements should follow the existing project
architecture and coding patterns.

Before submitting changes:

1.  Test the affected feature.
2.  Check desktop and mobile behavior.
3.  Run the frontend production build.
4.  Verify that no secrets or environment files are included.
5.  Review the Git diff for unrelated changes.

## License

Add the project's chosen license here before publishing the repository
as an open-source project.

## Author

**Rahul Singh Negi**

GitHub: https://github.com/RahulSN7

------------------------------------------------------------------------

Built with React, Node.js, Express, MongoDB, and a focus on making
hackathon discovery and team collaboration easier.
