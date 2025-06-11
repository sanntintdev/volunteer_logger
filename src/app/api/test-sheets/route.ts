// app/api/test-sheets/route.ts
import { NextResponse } from "next/server";
import { GoogleSheetsService } from "@/lib/google-sheets";

export async function GET() {
    try {
        const sheetsService = new GoogleSheetsService();
        const result = await sheetsService.validateConnection();

        if (result.success) {
            return NextResponse.json({
                success: true,
                message: "Google Sheets connection successful!",
                timestamp: new Date().toISOString(),
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
        console.error("Test connection error:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Connection test failed",
            },
            { status: 500 },
        );
    }
}
