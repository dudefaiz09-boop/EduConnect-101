# EduConnect Deployment Guide

This application is optimized for deployment on Google Cloud and as a hybrid mobile app using Capacitor.

## 1. Deploying to Google Cloud (Cloud Run)

The application includes a `Dockerfile` and is ready for Google Cloud Run.

### Prerequisites
- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed.
- A Google Cloud Project with billing enabled.

### Steps
1. **Using Cloud Build (Recommended):**
   ```bash
   gcloud builds submit --config cloudbuild.yaml --substitutions=_GEMINI_API_KEY=[GEMINI_KEY],_FIREBASE_API_KEY=[FB_KEY],_FIREBASE_AUTH_DOMAIN=[FB_DOMAIN],_FIREBASE_PROJECT_ID=[FB_ID],_FIREBASE_STORAGE_BUCKET=[FB_BUCKET],_FIREBASE_MESSAGING_SENDER_ID=[FB_SENDER_ID],_FIREBASE_APP_ID=[FB_APP_ID]
   ```

2. **Manual Docker Build (Using Build Args):**
   ```bash
   # Build
   docker build \
     --build-arg GEMINI_API_KEY=[GEMINI_KEY] \
     --build-arg VITE_FIREBASE_API_KEY=[FB_KEY] \
     --build-arg VITE_FIREBASE_AUTH_DOMAIN=[FB_DOMAIN] \
     --build-arg VITE_FIREBASE_PROJECT_ID=[FB_ID] \
     --build-arg VITE_FIREBASE_STORAGE_BUCKET=[FB_BUCKET] \
     --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID=[FB_SENDER_ID] \
     --build-arg VITE_FIREBASE_APP_ID=[FB_APP_ID] \
     -t gcr.io/[PROJECT_ID]/educonnect .

   # Push
   docker push gcr.io/[PROJECT_ID]/educonnect

   # Deploy
   gcloud run deploy educonnect \
     --image gcr.io/[PROJECT_ID]/educonnect \
     --platform managed \
     --set-env-vars="GEMINI_API_KEY=[GEMINI_KEY],VITE_FIREBASE_API_KEY=[FB_KEY],VITE_FIREBASE_AUTH_DOMAIN=[FB_DOMAIN],VITE_FIREBASE_PROJECT_ID=[FB_ID],VITE_FIREBASE_STORAGE_BUCKET=[FB_BUCKET],VITE_FIREBASE_MESSAGING_SENDER_ID=[FB_SENDER_ID],VITE_FIREBASE_APP_ID=[FB_APP_ID]"
   ```

## 2. Deploying to Mobile (iOS & Android)

The app uses **Capacitor** to wrap the web application into native containers.

### Prerequisites
- Node.js and npm installed.
- For Android: [Android Studio](https://developer.android.com/studio).
- For iOS: [Xcode](https://developer.apple.com/xcode/) (requires a Mac).

### Steps
1. **Build the web project:**
   ```bash
   npm run build
   ```
2. **Sync with Capacitor:**
   ```bash
   npx cap sync
   ```
3. **Open in Native IDE:**
   - **Android:** `npx cap open android`
   - **iOS:** `npx cap open ios`
4. **Build and Test:** Use the native IDE (Android Studio/Xcode) to run the app on an emulator or a physical device.

## 3. Environment Variables

Ensure the following environment variables are set in your production environment:
- `GEMINI_API_KEY`: Your Google Gemini API key.
- `PORT`: (Managed by Cloud Run, usually 8080).
- `NODE_ENV`: Set to `production`.

## 4. Progressive Web App (PWA)

The app is already configured with a `manifest.webmanifest`. It can be installed directly from the browser on most mobile devices by selecting "Add to Home Screen".
