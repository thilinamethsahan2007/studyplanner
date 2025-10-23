# AI Study Planner

The AI Study Planner is a smart, modern web application designed to help students organize their daily tasks, track subject progress, and analyze test performance. It leverages the Google Gemini API to provide intelligent to-do list suggestions, generate study materials, and offer personalized analytics insights.

## ✨ Core Features

*   **Smart To-Do List**: A daily planner where users can input their plans in plain text (e.g., "finish mechanics tute and read chemistry chapter 5"), and the Gemini API automatically creates structured to-do items with the correct subject.
*   **AI-Powered Analytics**: Get personalized insights on your performance. Gemini can analyze your test scores, syllabus progress, and time logs to provide actionable advice, identify strengths and weaknesses, and help you study more effectively.
*   **AI Study Helper**: Instant academic support for any topic in your syllabus. Generate concise study notes or create multiple-choice quizzes for any subunit with the click of a button.
*   **Syllabus Tracking**: Detailed progress tracking for A/L subjects like Physics, Chemistry, and Combined Maths (Pure & Applied). Users can check off subunits for tutorials and past papers.
*   **Performance Analytics**: Visualizes test scores over time with charts and provides an at-a-glance view of overall syllabus completion for each subject.
*   **Automatic Log Book**: When a task is completed, users can log the time spent. The app automatically creates a daily journal and calculates weekly summaries of study habits.
*   **Pomodoro Timer**: A built-in focus timer to help students concentrate on their study tasks, which automatically logs the session upon completion.
*   **Content Management System (CMS)**: A password-protected area to easily manage the syllabus content, add test results, and set the weekly class schedule.
*   **Persistent Data with Google Sheets**: The application can be configured to use a Google Sheet as a simple, serverless database, allowing data to be saved across sessions. It gracefully falls back to mock data if not configured.
*   **Responsive & Themed**: A clean, modern UI that works on both desktop and mobile, with support for both light and dark modes.

## 🚀 Tech Stack

*   **Frontend**: React, TypeScript, Tailwind CSS
*   **AI Integration**: Google Gemini API (`@google/genai`)
*   **Routing**: React Router
*   **Charting**: Recharts
*   **Data Storage**:
    *   **Default**: In-memory mock data (`mockData.ts`).
    *   **Optional Backend**: Google Sheets via a Google Apps Script web app (`apiService.ts`).

## 📁 Project Structure

```
.
├── public/
├── src/
│   ├── components/    # Reusable UI components (TodoList, PomodoroTimer, etc.)
│   ├── contexts/      # React Context for global state (ThemeContext)
│   ├── pages/         # Top-level components for each route (TodoPage, SubjectPage, etc.)
│   ├── services/      # Modules for external communication (apiService, geminiService)
│   ├── utils/         # Helper functions (progress calculation)
│   ├── App.tsx        # Main component with routing logic
│   ├── index.tsx      # Application entry point
│   ├── mockData.ts    # Default/fallback data for the app
│   └── types.ts       # TypeScript type definitions
├── index.html         # Main HTML file with import maps
└── README.md          # This file
```

## ⚙️ Setup and Configuration

This project is designed to run in an environment that supports ES modules and `importmap` for dependency management, as seen in `index.html`.

### 1. Gemini API Key

The application requires a Google Gemini API key for its AI features to function.

-   The key is expected to be available as an environment variable: `process.env.API_KEY`.
-   The service that uses this key is located at `src/services/geminiService.ts`.
-   If the API key is not provided, the AI features will be disabled, and the app will show mock suggestions.

### 2. Backend Setup (Optional but Recommended)

To persist data, the application is designed to connect to a Google Sheets backend. This allows you to save syllabus progress, test scores, and logs.

**Follow these steps carefully:**

1.  **Create a Google Sheet**:
    *   Go to [sheets.new](https://sheets.new) to create a new spreadsheet.
    *   Create six sheets (tabs) at the bottom and name them **exactly** as follows:
        *   `Syllabus`
        *   `Tests`
        *   `Classes`
        *   `Todos`
        *   `Logs`
        *   `WeeklySummaries`

2.  **Create a Google Apps Script**:
    *   In your new Google Sheet, go to the menu and click `Extensions` > `Apps Script`.
    *   A new browser tab will open with the script editor. Delete any existing code in the `Code.gs` file.
    *   Copy the entire Google Apps Script code block from the comments within `src/services/apiService.ts` and paste it into the `Code.gs` file.

3.  **Deploy the Script as a Web App**:
    *   Click the **"Save project"** icon (floppy disk).
    *   Click the blue **"Deploy"** button in the top right, then select **"New deployment"**.
    *   Click the gear icon next to "Select type" and choose **"Web app"**.
    *   Fill in the deployment details:
        *   **Description**: `Study Planner Backend`
        *   **Execute as**: `Me`
        *   **Who has access**: `Anyone` (This makes the API public, which is the simplest setup for this app. Be mindful of this if you store sensitive data).
    *   Click **"Deploy"**.

4.  **Authorize the Script**:
    *   A pop-up will appear asking for authorization. Click **"Authorize access"**.
    *   Choose your Google account.
    *   You may see a "Google hasn’t verified this app" warning. This is expected. Click **"Advanced"**, then click **"Go to ... (unsafe)"**.
    *   Grant the script permission to access your Google Sheets by clicking **"Allow"**.

5.  **Connect the App to Your Backend**:
    *   After deploying, a "Deployment successfully updated" pop-up will appear. Copy the **"Web app URL"**.
    *   Open the `src/services/apiService.ts` file in your project.
    *   Paste the copied URL into the `GOOGLE_SHEETS_WEB_APP_URL` constant:
        ```typescript
        const GOOGLE_SHEETS_WEB_APP_URL = 'PASTE_YOUR_WEB_APP_URL_HERE';
        ```

That's it! When you run the app, it will now use your Google Sheet as a database. The first time it runs, it will populate the sheets with the initial mock data.

---

This README provides a clear path for any developer to understand, set up, and start working on the AI Study Planner, including crafting a more sophisticated custom backend if desired.
