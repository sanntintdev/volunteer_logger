// app/lib/google-sheets.ts
import { google } from "googleapis";

interface ActivityData {
    name: string;
    activity_type: string;
    location: string;
    number_of_kids: number;
    youth_house: string;
    date: string;
}

export class GoogleSheetsService {
    private sheets;
    private auth;

    constructor() {
        // Initialize Google Auth
        this.auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: process.env.GOOGLE_CLIENT_EMAIL,
                private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(
                    /\\n/g,
                    "\n",
                ),
            },
            scopes: ["https://www.googleapis.com/auth/spreadsheets"],
        });

        this.sheets = google.sheets({ version: "v4", auth: this.auth });
    }

    async appendActivity(
        data: ActivityData,
    ): Promise<{ success: boolean; rowNumber?: number; error?: string }> {
        try {
            // Prepare the data row
            const values = [
                [
                    data.name,
                    data.date,
                    data.activity_type,
                    data.location,
                    data.number_of_kids.toString(),
                    data.youth_house,
                    new Date().toISOString(), // Logged At timestamp
                ],
            ];

            // Append to the sheet
            const response = await this.sheets.spreadsheets.values.append({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: "Sheet1!A:G", // A to G columns
                valueInputOption: "RAW",
                requestBody: { values },
            });

            // Get the row number that was added
            const range = response.data.updates?.updatedRange;
            const rowNumber = range
                ? parseInt(range.split("!")[1].split(":")[0].replace(/\D/g, ""))
                : undefined;

            return {
                success: true,
                rowNumber,
            };
        } catch (error) {
            console.error("Google Sheets API Error:", error);
            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Unknown error occurred",
            };
        }
    }

    async getRecentActivities(
        limit: number = 10,
    ): Promise<{ success: boolean; data?: any[]; error?: string }> {
        try {
            const response = await this.sheets.spreadsheets.values.get({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
                range: `Sheet1!A2:G${limit + 1}`, // Skip header row, get recent entries
            });

            const rows = response.data.values || [];

            // Convert rows to objects
            const activities = rows.map((row, index) => ({
                rowNumber: index + 2, // +2 because we skip header and arrays are 0-indexed
                name: row[0] || "",
                date: row[1] || "",
                activity_type: row[2] || "",
                location: row[3] || "",
                number_of_kids: parseInt(row[4]) || 0,
                youth_house: row[5] || "",
                logged_at: row[6] || "",
            }));

            return {
                success: true,
                data: activities.reverse(), // Most recent first
            };
        } catch (error) {
            console.error("Google Sheets Read Error:", error);
            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Failed to read activities",
            };
        }
    }

    async validateConnection(): Promise<{ success: boolean; error?: string }> {
        try {
            // Try to read the sheet metadata to validate connection
            const response = await this.sheets.spreadsheets.get({
                spreadsheetId: process.env.GOOGLE_SHEET_ID,
            });

            const title = response.data.properties?.title;
            console.log(`Successfully connected to sheet: ${title}`);

            return { success: true };
        } catch (error) {
            console.error("Google Sheets Connection Error:", error);
            return {
                success: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Connection failed",
            };
        }
    }

    // Helper method to format data for sheets
    static formatActivityData(extractedData: any): ActivityData {
        return {
            name: extractedData.name || "",
            date: extractedData.date || new Date().toISOString().split("T")[0],
            activity_type: extractedData.activity_type || "",
            location: extractedData.location || "",
            number_of_kids: extractedData.number_of_kids || 0,
            youth_house: extractedData.youth_house || "",
        };
    }
}
