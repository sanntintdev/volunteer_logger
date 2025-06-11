// app/components/ChatInterface.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import MessageBubble from "./MessageBubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Mic, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { EntityExtractor } from "@/lib/entity-extractor";

interface Message {
    id: string;
    content: string;
    isUser: boolean;
    timestamp: Date;
}

const extractor = new EntityExtractor();

export default function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            content:
                "Hi! I'm here to help you log your volunteering activities. I need to collect 6 pieces of information: your name, activity type, location, number of kids, organization, and date. Let's start - what's your name and tell me about what you did!",
            isUser: false,
            timestamp: new Date(),
        },
    ]);

    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [extractedData, setExtractedData] = useState<any>({});
    const [conversationData, setConversationData] = useState<any>({});
    const [isComplete, setIsComplete] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isTyping) return;

        // Add user message
        const userMessage: Message = {
            id: Date.now().toString(),
            content: inputValue,
            isUser: true,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInputValue("");
        setIsTyping(true);

        // AI-POWERED ENTITY EXTRACTION! 🤖✨
        try {
            // Call AI extraction API
            const extractResponse = await fetch("/api/ai-extract", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: inputValue,
                    conversationHistory: messages
                        .filter((m) => m.isUser)
                        .map((m) => m.content),
                }),
            });

            const extractResult = await extractResponse.json();
            const newExtracted = extractResult.success
                ? extractResult.data
                : {};

            // Merge with previous conversation data
            const updatedData = { ...conversationData, ...newExtracted };
            setConversationData(updatedData);
            setExtractedData(updatedData);

            // Check what's missing and generate appropriate response
            const missingFields = extractor.getMissingFields(updatedData);
            const isNowComplete = extractor.isComplete(updatedData);

            setTimeout(
                () => {
                    let aiResponse: string;

                    if (isNowComplete) {
                        setIsComplete(true);
                        const summary = extractor.formatForDisplay(updatedData);
                        aiResponse = `Perfect! I have all the information I need. Here's what I recorded: ${summary}. Would you like me to save this to your volunteer log? 🎉`;
                    } else {
                        // Acknowledge what we found and ask for missing info
                        const foundItems = [];
                        if (newExtracted.volunteer_name)
                            foundItems.push(
                                `name: ${newExtracted.volunteer_name}`,
                            );
                        if (newExtracted.activity_type)
                            foundItems.push(
                                `activity: ${newExtracted.activity_type}`,
                            );
                        if (newExtracted.number_of_kids)
                            foundItems.push(
                                `${newExtracted.number_of_kids} kids`,
                            );
                        if (newExtracted.location)
                            foundItems.push(
                                `location: ${newExtracted.location}`,
                            );
                        if (newExtracted.youth_house)
                            foundItems.push(
                                `organization: ${newExtracted.youth_house}`,
                            );
                        if (newExtracted.date)
                            foundItems.push(`date: ${newExtracted.date}`);

                        const acknowledgment =
                            foundItems.length > 0
                                ? `Great! I got ${foundItems.join(", ")}. `
                                : "Thanks for that! ";

                        const question = extractor.generateFollowUpQuestion(
                            missingFields,
                            updatedData,
                        );
                        aiResponse = acknowledgment + question;
                    }

                    const responseMessage: Message = {
                        id: (Date.now() + 1).toString(),
                        content: aiResponse,
                        isUser: false,
                        timestamp: new Date(),
                    };

                    setMessages((prev) => [...prev, responseMessage]);
                    setIsTyping(false);
                },
                1000 + Math.random() * 1000,
            );
        } catch (error) {
            console.error("Save error:", error);
            const errorMessage: Message = {
                id: Date.now().toString(),
                content:
                    "❌ Sorry, there was a connection error. Please check your internet and try again.",
                isUser: false,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        }
    };

    const handleSaveActivity = async () => {
        setIsTyping(true);

        try {
            // Save to Google Sheets via API
            const response = await fetch("/api/save-activity", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(conversationData),
            });

            const result = await response.json();

            if (result.success) {
                const successMessage: Message = {
                    id: Date.now().toString(),
                    content: `✅ Success! Your volunteering activity has been saved to row ${result.rowNumber} in the log. Thank you ${conversationData.volunteer_name} for making a difference! Would you like to log another activity?`,
                    isUser: false,
                    timestamp: new Date(),
                };

                setMessages((prev) => [...prev, successMessage]);

                // Reset for next activity after showing success
                setTimeout(() => {
                    setExtractedData({});
                    setConversationData({});
                    setIsComplete(false);

                    const newActivityMessage: Message = {
                        id: (Date.now() + 1).toString(),
                        content:
                            "Ready to log another activity? What's your name and tell me about what you did!",
                        isUser: false,
                        timestamp: new Date(),
                    };
                    setMessages((prev) => [...prev, newActivityMessage]);
                }, 3000);
            } else {
                const errorMessage: Message = {
                    id: Date.now().toString(),
                    content: `❌ Sorry, there was an error saving your activity: ${result.error}. Please try again or contact support.`,
                    isUser: false,
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, errorMessage]);
            }
        } catch (error) {
            console.error("Save error:", error);
            const errorMessage: Message = {
                id: Date.now().toString(),
                content:
                    "❌ Sorry, there was a connection error. Please check your internet and try again.",
                isUser: false,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
        }

        setIsTyping(false);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (isComplete) {
                handleSaveActivity();
            } else {
                handleSendMessage();
            }
        }
    };

    // Calculate completion progress
    const allFields = [
        "name",
        "activity_type",
        "location",
        "number_of_kids",
        "youth_house",
        "date",
    ];
    const completedFields = allFields.filter((field) => extractedData[field]);
    const progress = (completedFields.length / allFields.length) * 100;

    return (
        <Card className="w-full pb-0">
            <CardHeader className="bg-white border-b border-gray-200 rounded-t-lg">
                <div className="flex items-center justify-between mb-3">
                    <CardTitle className="text-xl font-semibold text-gray-900">
                        VolunteerLog AI Assistant
                    </CardTitle>
                    <div className="text-gray-500 text-sm font-medium">
                        {completedFields.length}/6 complete
                    </div>
                </div>

                <p className="text-gray-600 text-sm mb-4">
                    Collecting your volunteering information
                </p>

                {/* Modern Progress Bar */}
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                        className="bg-gray-900 rounded-full h-1.5 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Optional: Add progress indicator dots */}
                <div className="flex justify-between mt-3 px-1">
                    {[1, 2, 3, 4, 5, 6].map((step) => (
                        <div
                            key={step}
                            className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
                                completedFields.length >= step
                                    ? "bg-gray-900"
                                    : "bg-gray-200"
                            }`}
                        />
                    ))}
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {/* Messages Container */}
                <div className="h-96 overflow-y-auto p-4">
                    {messages.map((message) => (
                        <MessageBubble
                            key={message.id}
                            message={message.content}
                            isUser={message.isUser}
                            timestamp={message.timestamp}
                        />
                    ))}

                    {/* Typing Indicator */}
                    {isTyping && (
                        <div className="flex justify-start mb-4">
                            <div className="max-w-xs mr-12">
                                <Card className="p-3 bg-muted">
                                    <div className="flex items-center space-x-2">
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                            <div
                                                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                                style={{
                                                    animationDelay: "0.1s",
                                                }}
                                            ></div>
                                            <div
                                                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                                                style={{
                                                    animationDelay: "0.2s",
                                                }}
                                            ></div>
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {isComplete
                                                ? "Saving..."
                                                : "AI is analyzing..."}
                                        </span>
                                    </div>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* Scroll anchor */}
                    <div ref={messagesEndRef} />
                </div>

                {/* Data Preview */}
                {Object.keys(extractedData).length > 0 && (
                    <div className="mx-4 mb-4">
                        <div className="p-4 border border-gray-200 rounded-lg bg-white">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-semibold text-gray-900">
                                    Progress Overview
                                </h3>
                                <div className="flex items-center space-x-2">
                                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gray-900 transition-all duration-500"
                                            style={{
                                                width: `${(Object.keys(extractedData).length / 6) * 100}%`,
                                            }}
                                        />
                                    </div>
                                    <span className="text-xs text-gray-600 font-mono">
                                        {Object.keys(extractedData).length}/6
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    {
                                        key: "name",
                                        label: "Name",
                                        value: extractedData.name,
                                        icon: "👤",
                                    },
                                    {
                                        key: "activity_type",
                                        label: "Activity",
                                        value: extractedData.activity_type,
                                        icon: "📋",
                                    },
                                    {
                                        key: "number_of_kids",
                                        label: "Participants",
                                        value: extractedData.number_of_kids
                                            ? `${extractedData.number_of_kids} kids`
                                            : null,
                                        icon: "👥",
                                    },
                                    {
                                        key: "location",
                                        label: "Location",
                                        value: extractedData.location,
                                        icon: "📍",
                                    },
                                    {
                                        key: "youth_house",
                                        label: "Organization",
                                        value: extractedData.youth_house,
                                        icon: "🏢",
                                    },
                                    {
                                        key: "date",
                                        label: "Date",
                                        value: extractedData.date,
                                        icon: "📅",
                                    },
                                ].map(({ key, label, value, icon }) => (
                                    <div
                                        key={key}
                                        className={`relative p-3 rounded-lg border transition-all duration-200 ${
                                            value
                                                ? "bg-white border-gray-900 shadow-sm"
                                                : "bg-gray-50 border-gray-200 border-dashed"
                                        }`}
                                    >
                                        {value && (
                                            <div className="absolute -top-1 -right-1">
                                                <div className="w-3 h-3 bg-gray-900 rounded-full flex items-center justify-center">
                                                    <CheckCircle className="w-2 h-2 text-white" />
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-start space-x-2">
                                            <span className="text-sm opacity-60">
                                                {icon}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-medium text-gray-600 mb-1">
                                                    {label}
                                                </div>
                                                {value ? (
                                                    <div className="text-sm font-semibold text-gray-900 truncate">
                                                        {value}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-gray-400 italic">
                                                        Not provided
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Complete State - Save Button */}
                {isComplete && (
                    <div className="mx-4 mb-4">
                        <Card className="p-6 bg-white border-gray-200 shadow-sm">
                            <div className="text-center">
                                <div className="mb-4">
                                    <CheckCircle className="mx-auto h-8 w-8 text-gray-900" />
                                    <h3 className="text-lg font-semibold text-gray-900 mt-3">
                                        All Information Collected
                                    </h3>
                                    <p className="text-sm text-gray-600 mt-1">
                                        Ready to save your volunteering activity
                                    </p>
                                </div>
                                <Button
                                    onClick={handleSaveActivity}
                                    disabled={isTyping}
                                    className="w-full bg-gray-900 hover:bg-gray-800 text-white border-0 transition-colors duration-200"
                                    size="lg"
                                >
                                    {isTyping ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Saving to Log...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Save Activity to Log
                                        </>
                                    )}
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}

                {/* Input Area */}
                <div className="border-t p-4 bg-muted/30">
                    <div className="flex gap-2">
                        <Input
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder={
                                isComplete
                                    ? "Press Enter to save, or type to add more details..."
                                    : isTyping
                                      ? "AI is analyzing..."
                                      : "Tell me about your volunteering activity..."
                            }
                            className="flex-1"
                            disabled={isTyping}
                        />

                        {isComplete ? (
                            <Button
                                onClick={handleSaveActivity}
                                disabled={isTyping}
                                size="sm"
                                className="bg-gray-900 hover:bg-gray-800 text-white"
                            >
                                {isTyping ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <CheckCircle className="h-4 w-4" />
                                )}
                            </Button>
                        ) : (
                            <Button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isTyping}
                                size="sm"
                            >
                                {isTyping ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </Button>
                        )}

                        {/* <Button variant="outline" size="sm" disabled={isTyping}>
                            <Mic className="h-4 w-4" />
                        </Button> */}
                    </div>

                    {/* Helper text */}
                    {!isComplete && Object.keys(extractedData).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2 text-center">
                            {completedFields.length} of 6 fields complete • Keep
                            chatting to fill in the missing information
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
