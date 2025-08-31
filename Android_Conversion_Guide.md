
# 🌟 Your Guide to Android Conversion 🌟

Hello there! This guide will walk you through converting your dynamic Next.js application into a native Android app using Capacitor. Because your app uses server features, we'll use a live development server to power the Android app.

Let's get started!

---

### ✅ Prerequisites: What You'll Need

Before we begin, make sure you have the following installed on your computer.

- **Android Studio**: The official tool for Android development. [Download it here](https://developer.android.com/studio).
- **Node.js & npm**: The backbone of your Next.js project. [Download it here](https://nodejs.org/).

---

### ⚙️ Step 1: Install Capacitor

First, let's add Capacitor to your project. This will create the native Android project.

> In your project's terminal, run the following command:

```bash
npm install @capacitor/core @capacitor/android @capacitor/cli
```

---

### 🔌 Step 2: Configure for Your Server

Your app is dynamic and needs to talk to a live server. We must tell the native Android app where to load your app from.

1.  **Create/Update the Capacitor Config:**
    > Open (or create) the `capacitor.config.ts` file in your project root and **replace its entire contents** with the code below. **This is the most important step.**

    ```typescript
    import type { CapacitorConfig } from '@capacitor/cli';

    const config: CapacitorConfig = {
      appId: 'com.gabrielekerete.bms',
      appName: 'BMS',
      webDir: '.next',
      server: {
        // For local development with the Android emulator
        // url: 'http://10.0.2.2:9002',
        
        // For a live app deployed to Vercel/other hosting
        url: 'https://management-app-bakery.vercel.app', 
        cleartext: true,
      },
    };

    export default config;
    ```
    **Important Note on URLs:**
    - **For Local Testing:** Use `http://10.0.2.2:9002` to connect to your computer's `localhost` from the Android emulator. If you test on a **physical device**, you must replace `10.0.2.2` with your computer's local network IP address (e.g., `http://192.168.1.10:9002`).
    - **For a Real Release:** Use your live, deployed application URL (e.g., `https://management-app-bakery.vercel.app`), as we have done now.

2.  **Build Your Web App:** Now, create the production build of your app. This populates the `.next` directory that Capacitor uses as a base.
    ```bash
    npm run build
    ```

---

### 🏗️ Step 3: Add the Android Platform

Now that the configuration is set, you can add the native Android folder to your project. If it already exists, you can skip this step.

> Run the following command:

```bash
npx cap add android
```
**Note:** You might see a warning like `sync could not run--missing .next directory`. This is expected if you haven't run `npm run build` yet. It will be resolved after you sync.

---

### 📱 Step 4: Run on Android

It's time to see your app running on an Android device! This requires two terminals running at the same time if you are testing locally.

1.  **If testing locally, run your local server:** You must have your Next.js development server running for the app to connect to it. For a live URL, you can skip this.
    > Keep this terminal running.
    ```bash
    npm run dev
    ```

2.  **Terminal 2: Sync and Open in Android Studio:** The `sync` command copies your web build and config into the native project. The `open` command opens it in Android Studio.
    ```bash
    npx cap sync
    ```
    ```bash
    npx cap open android
    ```

3.  **Run the App:**
    > Inside Android Studio, wait for the project to sync. Then, click the green "Run" button (▶️) at the top. You can choose to run it on an emulator or a physical Android device connected to your computer. The app will load its content from your specified server URL.

---

### ✨ Step 5: Prepare for the Google Play Store

When you are ready to release, you'll need to deploy your Next.js app to a hosting provider that supports Node.js (like Vercel, Firebase App Hosting, etc.).

1.  **Update `capacitor.config.ts`:** Ensure the `server.url` is your live application's URL.
2.  **Generate a Signed App Bundle:** In Android Studio, go to `Build > Generate Signed Bundle / APK...`. Follow the wizard to create a new keystore, which is a file that digitally signs your app.
3.  **Upload to Google Play:** Create a developer account on the [Google Play Console](https://play.google.com/console), create a new app listing, and upload the `.aab` file you generated.

And that's it! You've successfully configured your app for Android. Congratulations!
