# Survivor Fantasy League

A Next.js React application for managing and competing in a Survivor Fantasy League with friends.

## Features

- **Landing Page**: Beautiful welcome page with Google Authentication integration
- **Google Sign-In**: Secure authentication using Google OAuth
- **Guest Access**: Option to continue without signing in
- **Modern UI**: Built with Tailwind CSS for a responsive design
- **TypeScript**: Fully typed codebase for better development experience

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm, yarn, pnpm, or bun

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up Google OAuth:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project
   - Enable the Google+ API
   - Create an OAuth 2.0 Web Application credential
   - Copy your Client ID
   - Add your localhost and production URLs to the authorized redirect URIs

3. Configure environment variables:
   - Copy `.env.local.example` to `.env.local`
   - Add your Google Client ID:
   ```bash
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_client_id_here
   ```

### Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

### Building for Production

```bash
npm run build
npm run start
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx       # Root layout with metadata
│   ├── page.tsx         # Landing page with Google Auth
│   └── globals.css      # Global Tailwind styles
└── ...
```

## Technologies Used

- **Next.js 16** - React framework for production
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first CSS framework
- **Google Sign-In** - OAuth authentication

## Next Steps

1. Implement backend API routes for user management
2. Add user session management with authentication tokens
3. Create protected routes and dashboard
4. Build fantasy league features
5. Add database integration

## Environment Variables

See `.env.local.example` for all required environment variables.

## License

MIT
