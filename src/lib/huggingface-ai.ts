// app/lib/enhanced-ai-service.ts
import { HfInference } from "@huggingface/inference";

interface ExtractedData {
    name?: string;
    activity_type?: string;
    location?: string;
    number_of_kids?: number;
    youth_house?: string;
    date?: string;
}

export class HuggingFaceAIService {
    private hf: HfInference;

    constructor() {
        this.hf = new HfInference(process.env.HUGGINGFACE_API_KEY);
    }

    async extractEntitiesWithAI(text: string): Promise<ExtractedData> {
        try {
            // Use a multi-pronged approach with working models
            const [nerEntities, classificationResults, smartExtraction] =
                await Promise.all([
                    this.extractWithNER(text),
                    this.classifyActivityTypeWithWorkingModel(text),
                    this.extractWithGPT2(text),
                ]);

            // Merge results with priority order
            const combined = {
                ...nerEntities,
                ...smartExtraction,
                // Override with classification result if available
                ...(classificationResults.activity_type && {
                    activity_type: classificationResults.activity_type,
                }),
            };

            return this.validateAndCleanData(combined, text);
        } catch (error) {
            console.error("AI extraction error:", error);
            return this.enhancedFallbackExtraction(text);
        }
    }

    private async classifyActivityTypeWithWorkingModel(
        text: string,
    ): Promise<Partial<ExtractedData>> {
        try {
            // Use the working zero-shot classification model
            const activityLabels = [
                "teaching",
                "tutoring",
                "mentoring",
                "coaching",
                "reading",
                "arts and crafts",
                "cooking",
                "sports",
                "music",
                "dance",
                "computer skills",
                "homework help",
                "field trips",
                "games",
                "community service",
                "environmental work",
                "cleaning",
                "organizing",
            ];

            // Try the standard inference API format
            const response = await fetch(
                "https://api-inference.huggingface.co/models/facebook/bart-large-mnli",
                {
                    headers: {
                        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                        "Content-Type": "application/json",
                    },
                    method: "POST",
                    body: JSON.stringify({
                        inputs: text,
                        parameters: {
                            candidate_labels: activityLabels,
                        },
                    }),
                },
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            // Handle different response formats
            if (result.labels && result.scores && result.scores[0] > 0.3) {
                return { activity_type: result.labels[0] };
            }

            return {};
        } catch (error) {
            console.error("Zero-shot classification failed:", error);
            return {};
        }
    }

    private async extractWithNER(
        text: string,
    ): Promise<Partial<ExtractedData>> {
        try {
            const entities = await this.hf.tokenClassification({
                model: "dbmdz/bert-large-cased-finetuned-conll03-english",
                inputs: text,
            });

            const extracted: Partial<ExtractedData> = {};
            const nameEntities: string[] = [];
            const orgEntities: string[] = [];
            const locEntities: string[] = [];

            // Group consecutive entities
            for (const entity of entities) {
                const cleanWord = entity.word.replace(/##/g, "");

                if (entity.entity_group === "PER") {
                    nameEntities.push(cleanWord);
                } else if (entity.entity_group === "ORG") {
                    orgEntities.push(cleanWord);
                } else if (entity.entity_group === "LOC") {
                    locEntities.push(cleanWord);
                }
            }

            // Combine consecutive entities
            if (nameEntities.length > 0) {
                extracted.name = nameEntities.join(" ").trim();
            }
            if (orgEntities.length > 0) {
                extracted.youth_house = orgEntities.join(" ").trim();
            }
            if (locEntities.length > 0) {
                extracted.location = locEntities.join(" ").trim();
            }

            return extracted;
        } catch (error) {
            console.error("NER extraction failed:", error);
            return {};
        }
    }

    private async extractWithGPT2(
        text: string,
    ): Promise<Partial<ExtractedData>> {
        try {
            // Use GPT-2 with a focused prompt for structured extraction
            const prompt = `Extract volunteer information from: "${text}"

            Name:
            Activity:
            Location:
            Kids:
            Organization:
            Date:

            Name:`;

            const response = await this.hf.textGeneration({
                model: "openai-community/gpt2",
                inputs: prompt,
                parameters: {
                    max_new_tokens: 100,
                    temperature: 0.1,
                    return_full_text: false,
                    stop: [
                        "\n\n",
                        "Location:",
                        "Activity:",
                        "Kids:",
                        "Organization:",
                        "Date:",
                    ],
                },
            });

            // Parse the structured output
            return this.parseStructuredOutput(
                prompt + response.generated_text,
                text,
            );
        } catch (error) {
            console.error("GPT-2 extraction failed:", error);
            return {};
        }
    }

    private parseStructuredOutput(
        fullResponse: string,
        originalText: string,
    ): Partial<ExtractedData> {
        const extracted: Partial<ExtractedData> = {};

        try {
            // Extract using regex patterns from the structured output
            const nameMatch = fullResponse.match(/Name:\s*([^\n]+)/i);
            const activityMatch = fullResponse.match(/Activity:\s*([^\n]+)/i);
            const locationMatch = fullResponse.match(/Location:\s*([^\n]+)/i);
            const kidsMatch = fullResponse.match(/Kids:\s*(\d+)/i);
            const orgMatch = fullResponse.match(/Organization:\s*([^\n]+)/i);
            const dateMatch = fullResponse.match(/Date:\s*([^\n]+)/i);

            if (
                nameMatch &&
                nameMatch[1].trim() &&
                nameMatch[1].trim() !== "?"
            ) {
                extracted.name = nameMatch[1].trim();
            }

            if (
                activityMatch &&
                activityMatch[1].trim() &&
                activityMatch[1].trim() !== "?"
            ) {
                extracted.activity_type = this.normalizeActivityType(
                    activityMatch[1].trim(),
                );
            }

            if (
                locationMatch &&
                locationMatch[1].trim() &&
                locationMatch[1].trim() !== "?"
            ) {
                extracted.location = locationMatch[1].trim();
            }

            if (kidsMatch) {
                const num = parseInt(kidsMatch[1]);
                if (!isNaN(num) && num > 0 && num < 1000) {
                    extracted.number_of_kids = num;
                }
            }

            if (orgMatch && orgMatch[1].trim() && orgMatch[1].trim() !== "?") {
                extracted.youth_house = orgMatch[1].trim();
            }

            if (
                dateMatch &&
                dateMatch[1].trim() &&
                dateMatch[1].trim() !== "?"
            ) {
                extracted.date = dateMatch[1].trim();
            }
        } catch (error) {
            console.error("Structured output parsing failed:", error);
        }

        return extracted;
    }

    private normalizeActivityType(activity: string): string {
        const normalized = activity.toLowerCase().trim();

        // Enhanced activity mapping with comprehensive patterns
        const activityMap: { [key: string]: string } = {
            // Teaching variations
            teach: "teaching",
            taught: "teaching",
            teaching: "teaching",
            education: "teaching",
            lesson: "teaching",
            class: "teaching",
            instruction: "teaching",
            educating: "teaching",

            // Tutoring variations
            tutor: "tutoring",
            tutoring: "tutoring",
            homework: "tutoring",
            study: "tutoring",
            academic: "tutoring",
            studying: "tutoring",

            // Mentoring variations
            mentor: "mentoring",
            mentoring: "mentoring",
            guidance: "mentoring",
            counseling: "mentoring",
            support: "mentoring",
            helping: "mentoring",

            // Coaching variations
            coach: "coaching",
            coaching: "coaching",
            training: "coaching",

            // Sports variations
            sport: "sports",
            sports: "sports",
            physical: "sports",
            exercise: "sports",
            fitness: "sports",
            athletic: "sports",
            basketball: "sports",
            soccer: "sports",
            football: "sports",
            volleyball: "sports",

            // Arts variations
            art: "arts and crafts",
            arts: "arts and crafts",
            craft: "arts and crafts",
            crafts: "arts and crafts",
            creative: "arts and crafts",
            drawing: "arts and crafts",
            painting: "arts and crafts",
            artistic: "arts and crafts",

            // Reading variations
            read: "reading",
            reading: "reading",
            story: "reading",
            book: "reading",
            literature: "reading",
            stories: "reading",

            // Other activities
            cook: "cooking",
            cooking: "cooking",
            food: "cooking",
            kitchen: "cooking",
            music: "music",
            singing: "music",
            dance: "dance",
            dancing: "dance",
            computer: "computer skills",
            tech: "computer skills",
            technology: "computer skills",
            coding: "computer skills",
            programming: "computer skills",
        };

        // Check for exact matches first
        if (activityMap[normalized]) {
            return activityMap[normalized];
        }

        // Check for partial matches
        for (const [key, value] of Object.entries(activityMap)) {
            if (normalized.includes(key)) {
                return value;
            }
        }

        return normalized;
    }

    private validateAndCleanData(
        data: Partial<ExtractedData>,
        originalText: string,
    ): ExtractedData {
        const validated: ExtractedData = {};

        // Validate each field with enhanced logic
        if (data.name) {
            const name = this.validateName(data.name);
            if (name) validated.name = name;
        }

        if (data.activity_type) {
            validated.activity_type = data.activity_type;
        }

        if (data.location) {
            validated.location = this.validateLocation(data.location);
        }

        if (data.number_of_kids) {
            validated.number_of_kids = data.number_of_kids;
        }

        if (data.youth_house) {
            validated.youth_house = data.youth_house;
        }

        if (data.date) {
            validated.date = this.normalizeDate(data.date);
        }

        // Apply enhanced fallback extraction for missing critical fields
        const fallbackExtracted = this.enhancedFallbackExtraction(originalText);

        // Merge with priority to AI extraction, but fill gaps with fallback
        return { ...fallbackExtracted, ...validated };
    }

    private validateName(name: string): string | undefined {
        const cleaned = name.replace(/[^a-zA-Z\s'-]/g, "").trim();
        const excludeWords = [
            "Today",
            "Yesterday",
            "Hope",
            "Community",
            "Foundation",
            "Center",
            "House",
            "School",
            "Program",
            "Activity",
        ];

        if (
            cleaned.length >= 2 &&
            cleaned.length <= 50 &&
            !excludeWords.some((word) =>
                cleaned.toLowerCase().includes(word.toLowerCase()),
            )
        ) {
            return cleaned;
        }
        return undefined;
    }

    private validateLocation(location: string): string {
        return location.replace(/[^\w\s,.-]/g, "").trim();
    }

    private normalizeDate(date: string): string {
        const normalized = date.toLowerCase().trim();

        const dateMap: { [key: string]: string } = {
            today: "today",
            yesterday: "yesterday",
            "last week": "last week",
            "this week": "this week",
            monday: "Monday",
            tuesday: "Tuesday",
            wednesday: "Wednesday",
            thursday: "Thursday",
            friday: "Friday",
            saturday: "Saturday",
            sunday: "Sunday",
        };

        return dateMap[normalized] || normalized;
    }

    private enhancedFallbackExtraction(text: string): ExtractedData {
        const extracted: ExtractedData = {};
        const lowerText = text.toLowerCase();

        // Ultra-enhanced regex patterns for activity detection
        const patterns = {
            name: [
                /(?:my name is|i'?m|i am|hi,?\s*i'?m|hello,?\s*i'?m)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
            ],
            activity: [
                // Specific activity detection patterns
                /(?:i|we)\s+(?:did|was|went|helped with|worked on|taught|tutored|mentored|coached)\s+([a-z\s]+?)(?:\s+(?:at|with|for|to|and))/i,
                /(?:activity|work|job|task|volunteering):\s*([a-z\s]+)/i,
                /(?:i|we)\s+(teaching|tutoring|mentoring|coaching|reading|arts|crafts|cooking|sports|music|dance|computer|helping|training)/i,
                /(teaching|tutoring|mentoring|coaching|reading|arts|crafts|cooking|sports|music|dance|computer|helping|training)(?:\s+(?:kids|children|students))?/i,
                /(?:doing|did)\s+(teaching|tutoring|mentoring|coaching|reading|arts|crafts|cooking|sports|music|dance|computer|helping|training)/i,
            ],
            kids: [
                /(\d+)\s*(?:kids?|children?|students?|participants?)/i,
                /(?:helped|taught|worked with|mentored|coached)\s*(\d+)/i,
                /(\d+)\s*(?:year|grade|age)/i,
                /with\s+(\d+)\s+(?:kids|children|students)/i,
            ],
            location: [
                /(?:at|in)\s+([A-Z][a-zA-Z\s]{3,30})(?:\s+(?:school|center|house|program|facility))?/i,
                /(?:location|place|venue):\s*([A-Z][a-zA-Z\s]{3,30})/i,
            ],
            organization: [
                /(?:for|at|with)\s+([A-Z][a-zA-Z\s]{3,30})\s+(?:youth|community|school|center|house|foundation)/i,
                /(?:organization|charity|nonprofit):\s*([A-Z][a-zA-Z\s]{3,30})/i,
            ],
            date: [
                /(?:yesterday|today|last\s+week|this\s+week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
                /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/,
                /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i,
            ],
        };

        // Extract name
        for (const pattern of patterns.name) {
            const match = lowerText.match(pattern);
            if (match) {
                extracted.name = match[1].trim();
                break;
            }
        }

        // Extract activity type with enhanced logic - THIS IS THE KEY FIX!
        for (const pattern of patterns.activity) {
            const match = lowerText.match(pattern);
            if (match) {
                let activity = match[1]
                    ? match[1].trim().toLowerCase()
                    : match[0].trim().toLowerCase();

                // Clean up the match
                activity = activity.replace(
                    /^(i|we|did|was|went|helped with|worked on)\s+/i,
                    "",
                );
                activity = activity.replace(/\s+(at|with|for|to|and).*$/i, "");

                if (activity.length > 0) {
                    extracted.activity_type =
                        this.normalizeActivityType(activity);
                    break;
                }
            }
        }

        // Extract number of kids
        for (const pattern of patterns.kids) {
            const match = lowerText.match(pattern);
            if (match) {
                const num = parseInt(match[1]);
                if (num > 0 && num < 1000) {
                    extracted.number_of_kids = num;
                    break;
                }
            }
        }

        // Extract location
        for (const pattern of patterns.location) {
            const match = lowerText.match(pattern);
            if (match) {
                extracted.location = match[1].trim();
                break;
            }
        }

        // Extract organization
        for (const pattern of patterns.organization) {
            const match = lowerText.match(pattern);
            if (match) {
                extracted.youth_house = match[1].trim();
                break;
            }
        }

        // Extract date
        for (const pattern of patterns.date) {
            const match = lowerText.match(pattern);
            if (match) {
                extracted.date = match[0].trim();
                break;
            }
        }

        return extracted;
    }

    // Enhanced follow-up question generation
    async generateSmartFollowUp(
        missingFields: string[],
        extractedData: ExtractedData,
        conversationHistory: string[],
    ): Promise<string> {
        return this.getFallbackQuestion(missingFields[0], extractedData);
    }

    private getFallbackQuestion(
        field: string,
        extracted: ExtractedData,
    ): string {
        const questions: { [key: string]: string } = {
            name: "What's your name? I'd love to know who did this amazing work! 😊",
            activity_type: `${extracted.name ? `Hi ${extracted.name}! ` : ""}What type of volunteering activity did you do? (like teaching, tutoring, mentoring, sports, arts, etc.)`,
            location: `${extracted.name ? `Thanks ${extracted.name}! ` : ""}Where did this take place?`,
            number_of_kids: "How many kids did you work with?",
            youth_house: "Which organization or youth house was this for?",
            date: "When did this happen?",
        };

        return questions[field] || "Can you tell me more about that?";
    }
}
