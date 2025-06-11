import { NextRequest, NextResponse } from "next/server";
import { GoogleSheetsService } from "@/lib/google-sheets";

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();

        const requiredFields = [
            "name",
            "activity_type",
            "location",
            "number_of_kids",
            "youth_house",
            "date",
        ];
        const missingFields = requiredFields.filter((field) => !data[field]);

        if (missingFields.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Missing required fields: ${missingFields.join(", ")}`,
                },
                { status: 400 },
            );
        }

        // Initialize Google Sheets service
        const sheetsService = new GoogleSheetsService();

        // Format the data
        const formattedData = GoogleSheetsService.formatActivityData(data);

        // Save to Google Sheets
        const result = await sheetsService.appendActivity(formattedData);

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: "Activity saved successfully!",
                rowNumber: result.rowNumber,
                data: formattedData,
            });
        } else {
            return NextResponse.json(
                {
                    success: false,
                    error: result.error || "Failed to save activity",
                },
                { status: 500 },
            );
        }
    } catch (error) {
        console.error("Save Activity Error:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Internal server error",
            },
            { status: 500 },
        );
    }
}

// Optional: GET method to retrieve recent activities
export async function GET() {
    try {
        const sheetsService = new GoogleSheetsService();
        const result = await sheetsService.getRecentActivities(5);

        if (result.success) {
            return NextResponse.json({
                success: true,
                activities: result.data,
            });
        } else {
            return NextResponse.json(
                {
                    success: false,
                    error: result.error,
                },
                { status: 500 },
            );
        }
    } catch (error) {
        console.error("Get Activities Error:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to retrieve activities",
            },
            { status: 500 },
        );
    }
}
