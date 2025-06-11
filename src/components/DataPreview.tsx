import { Card } from "@/components/ui/card";

interface ExtractedData {
    activity_type?: string;
    name?: string;
    location?: string;
    number_of_kids?: number;
    youth_house?: string;
    date?: string;
}

interface DataPreviewProps {
    data: ExtractedData;
}

export default function DataPreview({ data }: DataPreviewProps) {
    const hasData = Object.keys(data).length > 0;

    if (!hasData) {
        return null;
    }

    return (
        <Card className="p-4 bg-green-50 border-green-200">
            <h3 className="text-sm font-medium text-green-800 mb-3">
                🧠 Information I've extracted:
            </h3>
            <div className="flex flex-wrap gap-2">
                {data.name && (
                    <span className="px-2 py-1 bg-pink-100 text-pink-800 rounded-full text-xs font-medium">
                        👤 Volunteer: {data.name}
                    </span>
                )}
                {data.activity_type && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                        📚 Activity: {data.activity_type}
                    </span>
                )}
                {data.number_of_kids && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        👥 Kids: {data.number_of_kids}
                    </span>
                )}
                {data.location && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                        📍 Location: {data.location}
                    </span>
                )}
                {data.youth_house && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                        🏢 Organization: {data.youth_house}
                    </span>
                )}
                {data.date && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">
                        📅 Date: {data.date}
                    </span>
                )}
            </div>
        </Card>
    );
}
