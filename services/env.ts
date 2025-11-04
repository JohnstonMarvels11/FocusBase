// --- DEPLOYMENT & ENVIRONMENT VARIABLE GUIDE ---

// This file provides guidance on deploying the application to hosting services like Vercel and GoDaddy.
// It is for documentation purposes only; the application code no longer imports this file directly.

/*
 * =================================================================================================
 * Gemini API Key Configuration for Production (Vercel, GoDaddy, etc.)
 * =================================================================================================
 *
 * The application is designed to securely read your Gemini API key from an environment variable
 * named `API_KEY`. This is a security best practice and is required for deployment.
 *
 * How to set it up on Vercel:
 * 1. Go to your project's dashboard on Vercel.
 * 2. Navigate to the "Settings" tab.
 * 3. Click on "Environment Variables" in the left sidebar.
 * 4. Add a new variable:
 *    - Name: API_KEY
 *    - Value: Paste your Gemini API key here (e.g., "AIzaSy...")
 * 5. Save the variable. Vercel will automatically make it available to your application during the build and at runtime.
 *
 * You do not need to change any code for this to work.
 *
 * =================================================================================================
 * Using a GoDaddy Domain with Vercel
 * =================================================================================================
 *
 * 1. Deploy your project to Vercel first.
 * 2. In your Vercel project's "Settings" -> "Domains" tab, add your GoDaddy domain name.
 * 3. Vercel will provide you with DNS records (usually an A record or CNAME record) to configure.
 * 4. Log in to your GoDaddy account and navigate to your domain's DNS management page.
 * 5. Add or update the DNS records as instructed by Vercel.
 * 6. It may take some time for DNS changes to propagate. Vercel will automatically configure SSL for your custom domain.
 *
 * =================================================================================================
 * Build Process on Vercel
 * =================================================================================================
 *
 * This project uses JSX/TSX without an explicit build configuration file (like package.json or vite.config.js).
 * When deploying to Vercel, you might need to configure the "Framework Preset".
 * If Vercel does not auto-detect the setup, you may need to adopt a standard build tool like Vite or Create React App.
 *
 * For a simple setup, ensure your `index.html` is at the root. Vercel's "Other" preset for static sites
 * should work if a build step is not required by your development environment.
 *
 */

// This line is no longer used by the application but is kept for reference.
export const GEMINI_API_KEY = process.env.API_KEY;
