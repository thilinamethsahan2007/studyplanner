import { Syllabus, Test, Class, Day, LogEntry, WeeklySummary } from '../types';
import { mockSyllabus, mockTests, mockClasses, mockLogs, mockWeeklySummaries } from '../mockData';

// --- IMPORTANT: Google Sheets Integration Setup ---
// To use Google Sheets for data storage, you must deploy a Google Apps Script.
// Follow these steps:
// 1. Create a new Google Sheet in your Google Drive.
// 2. Create six sheets (tabs) at the bottom and name them exactly: 'Syllabus', 'Tests', 'Classes', 'Todos', 'Logs', 'WeeklySummaries'.
// 3. In the menu, go to Extensions > Apps Script.
// 4. Delete any existing code in the `Code.gs` file and paste the entire Apps Script code block provided below.
// 5. Click the "Save project" icon (floppy disk).
// 6. Click "Deploy" > "New deployment".
// 7. Click the gear icon next to "Select type" and choose "Web app".
// 8. Fill in the deployment details:
//    - Description: "Study Planner Backend"
//    - Execute as: "Me"
//    - Who has access: "Anyone" (This makes the API public. It's the simplest setup for this app, but be mindful if you store sensitive data).
// 9. Click "Deploy".
// 10. A pop-up will appear. Click "Authorize access" and choose your Google account.
// 11. You may see a "Google hasn’t verified this app" warning. Click "Advanced", then click "Go to ... (unsafe)".
// 12. Grant the script permission to access your Google Sheets by clicking "Allow".
// 13. After deploying, copy the "Web app URL".
// 14. Paste the copied URL into the `GOOGLE_SHEETS_WEB_APP_URL` constant below.

const GOOGLE_SHEETS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyWFCZ_31vXZof081an49R6MTE72C6PpjYZ5GoaIOhfT82oZO-jUe7I80Y5QtbnND69/exec';

/*
--- Google Apps Script Code (copy this entire block into Code.gs) ---

function doGet(e) {
  const action = e.parameter.action;
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  let dataSheet;
  let data;

  try {
    if (action === 'getSyllabus') {
      dataSheet = sheet.getSheetByName('Syllabus');
      data = dataSheet.getRange('A1').getValue();
    } else if (action === 'getTests') {
      dataSheet = sheet.getSheetByName('Tests');
      data = dataSheet.getRange('A1').getValue();
    } else if (action === 'getClasses') {
      dataSheet = sheet.getSheetByName('Classes');
      data = dataSheet.getRange('A1').getValue();
    } else if (action === 'getTodayTodos') {
      dataSheet = sheet.getSheetByName('Todos');
      data = dataSheet.getRange('A1').getValue();
    } else if (action === 'getLogs') {
      dataSheet = sheet.getSheetByName('Logs');
      data = dataSheet.getRange('A1').getValue();
    } else if (action === 'getWeeklySummaries') {
      dataSheet = sheet.getSheetByName('WeeklySummaries');
      data = dataSheet.getRange('A1').getValue();
    } else {
      throw new Error('Invalid action specified.');
    }

    if (!data) {
      // Return null data if the cell is empty, client will handle mock data initialization
      return ContentService.createTextOutput(JSON.stringify({ success: true, data: null })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, data: JSON.parse(data) })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const action = e.parameter.action;
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  let dataSheet;

  try {
    const payload = JSON.parse(e.postData.contents);
    
    if (action === 'saveSyllabus') {
      dataSheet = sheet.getSheetByName('Syllabus');
    } else if (action === 'saveTests') {
      dataSheet = sheet.getSheetByName('Tests');
    } else if (action === 'saveClasses') {
      dataSheet = sheet.getSheetByName('Classes');
    } else if (action === 'saveTodayTodos') {
      dataSheet = sheet.getSheetByName('Todos');
    } else if (action === 'saveLogs') {
      dataSheet = sheet.getSheetByName('Logs');
    } else if (action === 'saveWeeklySummaries') {
      dataSheet = sheet.getSheetByName('WeeklySummaries');
    } else {
      throw new Error('Invalid action specified.');
    }
    
    // Clear the sheet before writing to avoid issues with large data, and write to A1
    dataSheet.clearContents();
    dataSheet.getRange('A1').setValue(JSON.stringify(payload));
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Data saved successfully' })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.message })).setMimeType(ContentService.MimeType.JSON);
  }
}

*/

const isSheetsConfigured = () => GOOGLE_SHEETS_WEB_APP_URL && GOOGLE_SHEETS_WEB_APP_URL.startsWith('https://');

const fetchData = async (action: string, mockData: any) => {
    if (!isSheetsConfigured()) {
        console.warn('Google Sheets URL not configured. Using mock data.');
        return mockData;
    }
    try {
        const response = await fetch(`${GOOGLE_SHEETS_WEB_APP_URL}?action=${action}`);
        if (!response.ok) throw new Error(`Network error: ${response.statusText}`);

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('text/html')) {
            throw new Error("Received HTML instead of JSON from Google Sheets API. Please check that the Apps Script deployment 'Who has access' setting is set to 'Anyone'.");
        }
        
        const result = await response.json();
        if (result.success) {
            if (result.data === null) {
                console.log(`Initializing '${action}' in Google Sheet with mock data.`);
                if (mockData !== null) { // Don't save if we explicitly want to handle null
                  await saveData(action.replace('get', 'save'), mockData);
                }
                return mockData;
            }
            return result.data;
        } else {
            throw new Error(result.error || 'Failed to fetch data.');
        }
    } catch (error) {
        console.error(`Error fetching data for action "${action}":`, error);
        console.warn('Falling back to mock data.');
        return mockData;
    }
};

const saveData = async (action: string, data: any) => {
    if (!isSheetsConfigured()) return;
    try {
        const response = await fetch(`${GOOGLE_SHEETS_WEB_APP_URL}?action=${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' }, // Use text/plain to avoid CORS preflight
            body: JSON.stringify(data),
            redirect: 'follow',
        });
        const result = await response.json();
        if (!result.success) {
            console.error('Failed to save data to Google Sheets:', result.error);
        }
    } catch (error) {
        console.error(`Error saving data for action "${action}":`, error);
    }
};

// Syllabus API
export const getSyllabus = (): Promise<Syllabus[]> => fetchData('getSyllabus', mockSyllabus);
export const saveSyllabus = (data: Syllabus[]): Promise<void> => saveData('saveSyllabus', data);

// Tests API
export const getTests = (): Promise<Test[]> => fetchData('getTests', mockTests);
export const saveTests = (data: Test[]): Promise<void> => saveData('saveTests', data);

// Classes API
export const getClasses = (): Promise<Class[]> => fetchData('getClasses', mockClasses);
export const saveClasses = (data: Class[]): Promise<void> => saveData('saveClasses', data);

// Todos API
const getTodayDateString = (): string => new Date().toISOString().split('T')[0];

export const getTodayTodos = async (): Promise<Day> => {
    const todayStr = getTodayDateString();
    
    // Fetch previous day's data. Pass `null` as mock data to ensure we attempt a fetch first.
    const previousDayData: Day | null = await fetchData('getTodayTodos', null);

    // If we have saved data and it's for today, return it.
    if (previousDayData && previousDayData.date === todayStr) {
        return previousDayData;
    }

    // If we are here, it's a new day or the first run.
    // Carry over unfinished tasks from the previous day.
    const unfinishedTasks = previousDayData ? previousDayData.items.filter(item => !item.done) : [];
    
    const newDay: Day = {
        date: todayStr,
        items: unfinishedTasks,
    };

    // Save the new day's state (with carried-over tasks) to the backend.
    await saveTodayTodos(newDay);
    return newDay;
};

export const saveTodayTodos = (day: Day): Promise<void> => {
    return saveData('saveTodayTodos', day);
};


// Logs API
export const getLogs = (): Promise<LogEntry[]> => fetchData('getLogs', mockLogs);
export const saveLogs = (data: LogEntry[]): Promise<void> => saveData('saveLogs', data);

// Weekly Summaries API
export const getWeeklySummaries = (): Promise<WeeklySummary[]> => fetchData('getWeeklySummaries', mockWeeklySummaries);
export const saveWeeklySummaries = (data: WeeklySummary[]): Promise<void> => saveData('saveWeeklySummaries', data);


const apiService = {
    getSyllabus,
    saveSyllabus,
    getTests,
    saveTests,
    getClasses,
    saveClasses,
    getTodayTodos,
    saveTodayTodos,
    getLogs,
    saveLogs,
    getWeeklySummaries,
    saveWeeklySummaries,
};

export default apiService;