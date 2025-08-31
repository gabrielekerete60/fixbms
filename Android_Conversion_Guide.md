
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

### 🏗️ Step 2: Initialize Your Android Project

This command tells Capacitor your app's name, gives it a unique package ID, and adds the native Android folder.

> Run the following commands:

```bash
npx cap init "BMS" "com.gabrielekerete.bms"
```
```bash
npx cap add android
```
**Note:** You might see a warning about a missing `public` or `www` directory. This is expected and will be resolved in the next step.

---

### 🔌 Step 3: Configure for a Live Server

Your app is dynamic and needs to talk to a live server. We must tell the native Android app to load your app from your local development server's URL.

1.  **Configure the Capacitor server URL:**
    > Open the `capacitor.config.ts` file that was created in your project root and **replace its entire contents** with the code below. **This is the most important step.**

    ```typescript
    import type { CapacitorConfig } from '@capacitor/cli';

    const config: CapacitorConfig = {
      appId: 'com.gabrielekerete.bms',
      appName: 'BMS',
      webDir: '.next',
      server: {
        url: 'http://10.0.2.2:9002',
        cleartext: true,
      },
    };

    export default config;
    ```
    **Why `10.0.2.2`?** This is a special IP address that the Android emulator uses to connect to your computer's `localhost`.
    - **If you are testing on a PHYSICAL DEVICE:** Replace `10.0.2.2` with your computer's local IP address (e.g., `http://192.168.1.10:9002`). You can find your IP address by running `ipconfig` (Windows) or `ifconfig` (macOS/Linux) in your terminal.
    - **For a REAL RELEASE:** You would use your live, deployed application URL (e.g., `https://your-live-app.com`).

2.  **Build Your Web App:** Now, create the production build of your app. This populates the `.next` directory that Capacitor uses as a base.
    ```bash
    npm run build
    ```

3.  **Sync with Capacitor:** Now that the build is done and the configuration is set, sync everything with the native project.
    ```bash
    npx cap sync
    ```

---

### 📱 Step 4: Run on Android

It's time to see your app running on an Android device! This requires two terminals running at the same time.

1.  **Terminal 1: Run your local server:** You must have your Next.js development server running for the app to connect to it.
    > Keep this terminal running.
    ```bash
    npm run dev
    ```

2.  **Terminal 2: Open in Android Studio:** This command will open the native Android project.
    ```bash
    npx cap open android
    ```

3.  **Run the App:**
    > Inside Android Studio, wait for the project to sync. Then, click the green "Run" button (▶️) at the top. You can choose to run it on an emulator or a physical Android device connected to your computer. The app will load its content from your running local server.

---

### ✨ Step 5: Prepare for the Google Play Store

When you are ready to release, you'll need to deploy your Next.js app to a hosting provider that supports Node.js (like Vercel, Firebase App Hosting, etc.).

1.  **Update `capacitor.config.ts`:** Change the `server.url` to your live application's URL.
2.  **Generate a Signed App Bundle:** In Android Studio, go to `Build > Generate Signed Bundle / APK...`. Follow the wizard to create a new keystore, which is a file that digitally signs your app.
3.  **Upload to Google Play:** Create a developer account on the [Google Play Console](https://play.google.com/console), create a new app listing, and upload the `.aab` file you generated.

And that's it! You've successfully configured your app for Android. Congratulations!
