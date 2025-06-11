// app/api/ai-extract/route.ts
import { HuggingFaceAIService } from "@/lib/huggingface-ai";
import { NextRequest, NextResponse } from "next/server";

const aiService = new HuggingFaceAIService();

export async function POST(request: NextRequest) {
    try {
        const { text } = await request.json();

        if (!text) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Text is required",
                },
                { status: 400 },
            );
        }

        // Extract entities using AI
        const extractedData = await aiService.extractEntitiesWithAI(text);

        return NextResponse.json({
            success: true,
            data: extractedData,
            message: "AI extraction completed",
        });
    } catch (error) {
        console.error("AI extraction API error:", error);
        return NextResponse.json(
            {
                success: false,
                error: "AI extraction failed",
            },
            { status: 500 },
        );
    }
}

// Smart follow-up generation endpoint
export async function PUT(request: NextRequest) {
    try {
        const { missingFields, extractedData, conversationHistory } =
            await request.json();

        const smartQuestion = await aiService.generateSmartFollowUp(
            missingFields,
            extractedData,
            conversationHistory,
        );

        return NextResponse.json({
            success: true,
            question: smartQuestion,
        });
    } catch (error) {
        console.error("Smart follow-up generation error:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Follow-up generation failed",
            },
            { status: 500 },
        );
    }
}
