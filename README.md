# Scribbler

A blogging platform built with Express.js, PostgreSQL, and EJS templates.

## Deployment to Vercel

### Prerequisites

1. A [Vercel](https://vercel.com) account
2. [Vercel CLI](https://vercel.com/docs/cli) installed (optional, for local testing)
3. A PostgreSQL database (you can use [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) or any other PostgreSQL provider)

### Steps to Deploy

1. **Install Vercel CLI** (optional)
   ```
   npm i -g vercel
   ```

2. **Login to Vercel** (if using CLI)
   ```
   vercel login
   ```

3. **Set up Environment Variables**
   
   In the Vercel dashboard, add the following environment variables:
   - `PG_USER`: PostgreSQL username
   - `PG_HOST`: PostgreSQL host
   - `PG_DATABASE`: PostgreSQL database name
   - `PG_PASSWORD`: PostgreSQL password
   - `PG_PORT`: PostgreSQL port (usually 5432)
   - `SESSION_SECRET`: Secret for session encryption
   - `GOOGLE_CLIENT_ID`: Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET`: Google OAuth client secret
   - `GOOGLE_CALLBACK_URL`: Callback URL for Google OAuth (should be `https://your-vercel-domain.vercel.app/auth/google/callback`)

4. **Deploy to Vercel**
   
   Using CLI:
   ```
   vercel
   ```
   
   Or connect your GitHub repository to Vercel for automatic deployments.

5. **Update Google OAuth Settings**
   
   Don't forget to update your Google OAuth authorized redirect URIs to include your Vercel domain.

## Database Setup

Make sure your PostgreSQL database has the following tables:

- `users`: For user information
- `blogs`: For blog posts
- `comments`: For blog comments
- `session`: For storing session data

## Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file based on `.env.example`
4. Run the application: `npm start` 