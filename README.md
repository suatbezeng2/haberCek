# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at `src/app/page.tsx`.

## Running the Application

### Development

To run the application in development mode:

```bash
npm run dev
```

This will typically start the server on `http://localhost:9002` (as configured in `package.json`).

### Production Build & Start

To build and start the application for production:

```bash
npm run build
npm run start
```
This will typically start the server on `http://localhost:3000` (default Next.js port for `npm start`) unless configured otherwise.

## API Endpoint for Content Extraction

This application provides an API endpoint at `/api/extract` for fetching and processing content from a given URL.

*   **Path:** `/api/extract`
*   **Method:** `POST`
*   **Request Body (JSON):**
    ```json
    {
      "url": "https://example.com/article-to-extract"
    }
    ```
*   **Responses:**
    *   `200 OK`: Content extracted successfully. The body will contain the extracted title, content, and webhook status.
        ```json
        {
          "title": "Extracted Title",
          "content": "Extracted text content...",
          "webhook_status": "success", // Can be "success" or "failed"
          // "webhook_error": "Details if webhook notification failed" // Present if webhook_status is "failed"
          // "sourceUrl": "https://example.com/article-to-extract" // The original URL processed
        }
        ```
    *   `400 Bad Request`: If the `url` is missing or invalid in the request body.
        ```json
        {
          "error": "URL is required and must be a string"
        }
        ```
    *   `500 Internal Server Error`: If there's an error during content extraction from the target URL or an unhandled server error.
        ```json
        {
          "error": "Failed to extract content from URL. An unknown error occurred.", // Or a more specific error
          "sourceUrl": "https://example.com/article-to-extract"
        }
        ```
        Note: If content extraction is successful but the subsequent webhook notification (to `MAKE_WEBHOOK_URL`) fails, the API will still return a `200 OK` status but include `webhook_status: "failed"` and `webhook_error` in the response.

## Environment Variables

*   `MAKE_WEBHOOK_URL`: (Server-side, Required for custom webhook) This is the URL of an *external* webhook where **this application will send the extracted content *to*** after processing.
    *   If not set, a default placeholder Make.com URL is used by the server API (see `src/app/api/extract/route.ts`).
    *   For local development, you **must** set this in a `.env.local` file in the root of your project if you want to use your own webhook:
        ```
        MAKE_WEBHOOK_URL=your_actual_external_make_webhook_url_here
        ```
    *   **Important:** When deploying your application to Firebase, ensure this environment variable is set in your Firebase Cloud Functions environment. You can do this via the Firebase CLI or the Google Cloud Console.
        Example using Firebase CLI:
        ```bash
        firebase functions:config:set make.webhook_url="your_actual_external_make_webhook_url_here"
        # After setting, deploy your functions for the config to take effect if they are already deployed
        # firebase deploy --only functions 
        ```
        The code in `src/app/api/extract/route.ts` will automatically try to pick up `process.env.MAKE_WEBHOOK_URL`. For Firebase Functions, you would set it as `make.webhook_url` and Firebase automatically makes it available as `process.env.MAKE_WEBHOOK_URL`.
    *   **Check Server Logs:** The application logs which webhook URL it's using upon startup and during API calls. Check your Firebase Cloud Functions logs to confirm if your `MAKE_WEBHOOK_URL` is being used or if it's falling back to the default.

## Configuring with Make.com (or other webhook consumers)

There are two parts to configuring Make.com with this application:

### 1. Sending a URL *to this application* for extraction

To have Make.com send a URL to **this application** for content extraction:

1.  **Determine your application's Base URL:**
    *   **Local Development:** If you are running `npm run dev`, your Next.js application's base URL is likely `http://localhost:9002`. If you are using a development tunnel like Cloud Workstations, use the provided public URL (e.g., `https://*.cloudworkstations.dev`).
    *   **Deployed Application (Firebase):** After deploying to Firebase, your application will have a URL like `https://habericek-f8f1d.web.app` (replace `habericek-f8f1d` with your actual Firebase Project ID if different) or a custom domain if you've configured one.

2.  **Construct the Full API Endpoint URL for *this* application:**
    Append `/api/extract` to your application's base URL.
    *   Example (local development): `http://localhost:9002/api/extract`
    *   Example (Cloud Workstations dev): `https://<YOUR_WORKSTATION_URL>/api/extract`
    *   Example (deployed Firebase application): `https://habericek-f8f1d.web.app/api/extract`

3.  **Configure the HTTP Request Module in your Make.com Scenario:**
    *   **URL:** Use the Full API Endpoint URL constructed in step 2 (e.g., `https://habericek-f8f1d.web.app/api/extract`).
    *   **Method:** `POST`
    *   **Headers:**
        *   Add a header with:
            *   Name: `Content-Type`
            *   Value: `application/json`
    *   **Body type:** `Raw`
    *   **Content type (for body):** `JSON (application/json)`
    *   **Request content (Body):**
        ```json
        {
          "url": "YOUR_TARGET_URL_TO_EXTRACT_FROM"
        }
        ```
        Replace `"YOUR_TARGET_URL_TO_EXTRACT_FROM"` with the actual URL you want this application to extract content from. This can be a dynamic value from a previous step in your Make.com scenario.
    *   **Important regarding 302 Redirects / Authentication:** If you are getting a 302 redirect when Make.com tries to call your development URL (e.g., on Cloud Workstations), it might be due to authentication.
        *   Ensure your `/api/extract` endpoint is publicly accessible or that Make.com can bypass any authentication.
        *   For Cloud Workstations, you might need to adjust firewall rules or authentication settings if the default configuration blocks external POST requests without a valid session/cookie. If you see a redirect to an `_workstation/forwardAuthCookie` path, this indicates an authentication challenge. Your application endpoint itself does not require authentication, but the underlying development server or tunnel might.
        *   When deployed to Firebase Hosting, the `/api/extract` endpoint (served by Cloud Functions) should be publicly accessible by default unless you have specific IAM policies restricting it.

### 2. Receiving extracted content *from this application* in Make.com

To have **this application** send the extracted content to a webhook in *your* Make.com scenario:

1.  **Create a "Custom Webhook" module in your Make.com scenario.**
    *   When you add this module, Make.com will provide you with a unique webhook URL. Copy this URL.
2.  **Set the `MAKE_WEBHOOK_URL` Environment Variable:**
    *   Use the webhook URL you copied from Make.com in step 1 as the value for the `MAKE_WEBHOOK_URL` environment variable in **this application's** environment.
        *   **Local Development:** Add it to your `.env.local` file:
            ```
            MAKE_WEBHOOK_URL=https://hook.make.com/your_unique_make_webhook_url_part
            ```
        *   **Deployed Application (Firebase):** Set this environment variable in your Firebase Cloud Functions environment as described in the "Environment Variables" section above.
3.  **Trigger the flow:**
    *   When you (or another service) send a POST request to this application's `/api/extract` endpoint (as described in Part 1), this application will extract the content and then automatically send a POST request containing the extracted data to the `MAKE_WEBHOOK_URL` you configured.
4.  **Handle the data in Make.com:**
    *   The Custom Webhook module in your Make.com scenario will receive the data. You can then add subsequent modules in Make.com to process this data (e.g., save it to a spreadsheet, send an email, etc.).
    *   The data sent to your Make.com webhook will look like this:
        ```json
        {
          "sourceUrl": "https://original-url.com/article",
          "title": "Extracted Title",
          "content": "Extracted text content...",
          "timestamp": "YYYY-MM-DDTHH:mm:ss.sssZ"
        }
        ```

**Troubleshooting Webhook Issues:**

*   **Check Server Logs of This Application:** When `/api/extract` is called, it will log which webhook URL it is attempting to send data to.
    *   For Firebase deployments, check your Cloud Functions logs for the function associated with the `/api/extract` route.
    *   If it's using the default URL (`https://hook.eu1.make.com/qtd7bn346b6v9o1vhaw4haclt9u1geme`), it means your `MAKE_WEBHOOK_URL` environment variable is not set or not being read correctly by the application in the Firebase environment.
    *   If it's using your custom URL, check for any error messages related to sending the webhook (e.g., network errors, 4xx/5xx responses from your Make.com webhook).
*   **Check Make.com Scenario History:** Look at the execution history of your Make.com scenario that contains the "Custom Webhook" module. See if it's receiving requests and if there are any errors there.
*   **Verify Webhook URL:** Double-check that the `MAKE_WEBHOOK_URL` you set in this application's environment exactly matches the URL provided by the Custom Webhook module in your Make.com scenario.
*   **Test Make.com Webhook Directly:** You can use a tool like Postman or `curl` to send a sample POST request directly to your Make.com webhook URL to ensure it's active and working correctly.

The `src/app/page.tsx` file provides a note on the `MAKE_WEBHOOK_URL` environment variable for user information on the frontend.

## Firebase Deployment

This Next.js application can be deployed to Firebase Hosting, which will automatically use Cloud Functions for the backend (API routes).

### Prerequisites

1.  **Firebase Account:** Create a Firebase account if you don't have one: [https://firebase.google.com/](https://firebase.google.com/)
2.  **Firebase Project:** Create a new Firebase project in the Firebase console: [https://console.firebase.google.com/](https://console.firebase.google.com/)
3.  **Firebase CLI:** Install or update the Firebase CLI:
    ```bash
    npm install -g firebase-tools
    ```
4.  **Login to Firebase:**
    ```bash
    firebase login
    ```

### Initialization (if not already done)

If you haven't initialized Firebase in your project directory yet:

1.  Navigate to your project's root directory.
2.  Run:
    ```bash
    firebase init hosting
    ```
3.  When prompted:
    *   "Please select an option:" Choose **Use an existing project**.
    *   Select the Firebase project you created (e.g., `habericek-f8f1d`).
    *   "What do you want to use as your public directory?" Enter **.next** (This might be automatically detected and configured by `frameworksBackend` in `firebase.json` later, but it's a common default. The `firebase.json` provided sets `"source": "."` and relies on `frameworksBackend` to handle the Next.js build output).
    *   "Configure as a single-page app (rewrite all urls to /index.html)?" Choose **No**. (Next.js handles its own routing).
    *   "Set up automatic builds and deploys with GitHub?" Choose **No** for now (you can set this up later if desired).
    *   "File public/index.html already exists. Overwrite?" If you have a `public/index.html` and `firebase init hosting` tries to create one, choose **No** or be careful. Generally, Next.js will handle the `public` directory contents.

The `firebase.json` and `.firebaserc` files provided in this project are configured for Next.js deployment with `frameworksBackend`.

### Configuration

1.  **`.firebaserc`:**
    *   Make sure the `default` project in `.firebaserc` is set to your Firebase Project ID (e.g., `habericek-f8f1d`).
        ```json
        {
          "projects": {
            "default": "habericek-f8f1d"
          }
        }
        ```
        Replace `habericek-f8f1d` with your actual project ID if it's different.

2.  **`firebase.json`:**
    *   The provided `firebase.json` is configured to use `frameworksBackend`, which tells Firebase to build and deploy the Next.js app correctly.
        ```json
        {
          "hosting": {
            "source": ".", // Tells Firebase to look for Next.js project in the current directory
            "ignore": [
              "firebase.json",
              "**/.*",
              "**/node_modules/**"
            ],
            "frameworksBackend": {
              "region": "us-central1" // Or your preferred region
            }
          }
        }
        ```

3.  **Environment Variables for Firebase Functions (e.g., `MAKE_WEBHOOK_URL`):**
    *   API routes in Next.js (like `/api/extract`) will be deployed as Cloud Functions.
    *   To set environment variables for these functions, use the Firebase CLI:
        ```bash
        firebase functions:config:set make.webhook_url="your_actual_make_webhook_url_here"
        # You can add other variables similarly:
        # firebase functions:config:set other.variable="value"
        ```
    *   **Important:** After setting config variables, they will be available as `process.env.MAKE_WEBHOOK_URL` (Firebase converts `make.webhook_url` to `MAKE_WEBHOOK_URL`).
    *   These variables are applied when you deploy your functions. If you've already deployed and are just updating environment variables, you might need to redeploy the functions: `firebase deploy --only functions` or a full `firebase deploy`.

### Deployment Steps

1.  **Build your Next.js application:**
    While `firebase deploy` with `frameworksBackend` often handles the build, it's good practice to ensure your project builds locally first.
    ```bash
    npm run build
    ```

2.  **Deploy to Firebase:**
    ```bash
    npm run deploy:firebase
    ```
    Or directly:
    ```bash
    firebase deploy
    ```
    This command will:
    *   Build your Next.js application (if `frameworksBackend` is configured).
    *   Deploy the static assets to Firebase Hosting.
    *   Deploy your Next.js API routes and server-rendered pages as Cloud Functions.

After deployment, the Firebase CLI will output the URL for your hosted application (e.g., `https://habericek-f8f1d.web.app`). Your API endpoint will be available at `https://habericek-f8f1d.web.app/api/extract`.

### Troubleshooting Firebase Deployment

*   **Node.js Version:** Ensure your Firebase project is configured to use a Node.js version compatible with your Next.js application. You can specify this in `firebase.json` under the `functions` key if you were managing functions manually, but `frameworksBackend` usually handles this. If you face issues, check your Firebase project settings or Cloud Functions logs for Node.js version compatibility.
    ```json
    // Example if you were explicitly defining functions:
    // "functions": {
    //   "runtime": "nodejs18" // or nodejs20, etc.
    // }
    ```
    With `frameworksBackend`, Firebase attempts to match the Node version from your `package.json` engines field if present, or defaults to a recent LTS.
*   **Firebase Plan:** Server-side rendering and API routes (Cloud Functions) require the Firebase "Blaze" (pay-as-you-go) plan. The free "Spark" plan has limitations on Cloud Functions.
*   **Logs:** Check Firebase Hosting deployment logs and Cloud Functions logs in the Firebase console for any errors.
*   **`firebase-debug.log`:** If deployment fails, look for a `firebase-debug.log` file in your project directory for more detailed error information.
*   **IAM Permissions:** Ensure the account used by `firebase deploy` has the necessary permissions (e.g., `Firebase Hosting Admin`, `Cloud Functions Admin`, `Service Account User` on the App Engine default service account if `frameworksBackend` uses it).
*   **`output: 'standalone'` in `next.config.js`:** This is highly recommended for Firebase deployments as it optimizes the build output.

By following these steps, you should be able to deploy your Next.js application to Firebase. Remember to replace `habericek-f8f1d` with your actual Firebase project ID in `.firebaserc` if it's different.
