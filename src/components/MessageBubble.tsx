import { Card } from "@/components/ui/card";

interface MessageBubbleProps {
    message: string;
    isUser: boolean;
    timestamp: Date;
}

export default function MessageBubble({
    message,
    isUser,
    timestamp,
}: MessageBubbleProps) {
    return (
        <div
            className={`flex ${isUser ? "justify-end" : "justify-start"} mb-6`}
        >
            <div
                className={`max-w-xs lg:max-w-md ${isUser ? "ml-16" : "mr-16"}`}
            >
                {/* Message Content */}
                <div
                    className={`px-4 py-3 rounded-2xl transition-all duration-200 ${
                        isUser
                            ? "bg-gray-900 text-white"
                            : "bg-gray-50 text-gray-900 border border-gray-100"
                    }`}
                >
                    <p className="text-sm leading-relaxed">{message}</p>
                </div>

                {/* Timestamp */}
                <div className={`mt-1 ${isUser ? "text-right" : "text-left"}`}>
                    <span className="text-xs text-gray-400 font-mono">
                        {timestamp.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                        })}
                    </span>
                </div>
            </div>
        </div>
    );
}
