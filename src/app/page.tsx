import ChatInterface from "@/components/ChatInterface";

export default function Home() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-background to-muted py-8">
            <div className="container mx-auto max-w-2xl px-4">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold tracking-tight mb-4">
                        VolunteerLog ✨
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Tell me about your volunteering activities, and I'll
                        help you log them!
                    </p>
                </div>

                <ChatInterface />
            </div>
        </main>
    );
}
