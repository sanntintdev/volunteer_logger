// app/lib/entity-extractor.ts

interface ExtractedData {
    name?: string;
    activity_type?: string;
    location?: string;
    number_of_kids?: number;
    youth_house?: string;
    date?: string;
}

export class EntityExtractor {
    extractFromText(text: string): ExtractedData {
        const extracted: ExtractedData = {};
        const lowerText = text.toLowerCase();

        // Extract volunteer name
        extracted.name = this.extractVolunteerName(text);

        // Extract number of kids/children
        extracted.number_of_kids = this.extractNumberOfKids(lowerText);

        // Extract activity type
        extracted.activity_type = this.extractActivityType(lowerText);

        // Extract location
        extracted.location = this.extractLocation(text); // Keep original case for names

        // Extract organization/youth house
        extracted.youth_house = this.extractOrganization(text);

        // Extract date
        extracted.date = this.extractDate(lowerText);

        // Remove undefined values
        return Object.fromEntries(
            Object.entries(extracted).filter(
                ([_, value]) => value !== undefined,
            ),
        );
    }

    private extractVolunteerName(text: string): string | undefined {
        const patterns = [
            // Direct introductions
            /(?:my name is|i'?m|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
            /(?:this is|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
            /(?:hi,?\s+i'?m|hello,?\s+i'?m)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,

            // Name-first patterns
            /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:here|volunteering|helped|taught)/,
            /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:did|worked|assisted)/,

            // Casual introductions
            /(?:it'?s|name'?s)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
            /volunteer\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,

            // Simple patterns (just the name at the start)
            /^([A-Z][a-z]+)(?:\s+[A-Z][a-z]+)?\s*[.,!]?\s*(?:I|We|Yesterday|Today|Last)/,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const name = match[1].trim();
                // Filter out common false positives
                const excludeWords = [
                    "Today",
                    "Yesterday",
                    "Tomorrow",
                    "Hope",
                    "Community",
                    "Foundation",
                    "Center",
                    "House",
                    "Teaching",
                    "Reading",
                    "Playing",
                    "Working",
                    "Helped",
                    "Taught",
                    "Mentored",
                    "Volunteering",
                    "Activity",
                    "Kids",
                    "Children",
                    "Students",
                    "Boys",
                    "Girls",
                    "When",
                    "Where",
                    "What",
                    "About",
                    "With",
                    "From",
                    "Good",
                    "Great",
                    "Nice",
                    "Amazing",
                ];

                if (
                    !excludeWords.includes(name) &&
                    name.length >= 2 &&
                    name.length <= 50
                ) {
                    return name;
                }
            }
        }
        return undefined;
    }

    private extractNumberOfKids(text: string): number | undefined {
        const patterns = [
            /(\d+)\s*(?:kids?|children?|students?|boys?|girls?)/,
            /(?:helped|taught|mentored|assisted|worked with)\s*(\d+)/,
            /(\d+)\s*(?:young|little)\s*(?:ones?|people)/,
            /group\s*of\s*(\d+)/,
            /(\d+)\s*(?:participants?|volunteers?)/,
            /about\s*(\d+)\s*(?:kids?|children?)/,
            /around\s*(\d+)\s*(?:kids?|children?)/,
            /(\d+)\s*(?:teen|teenage)/,
            /with\s*(\d+)\s*(?:kids?|children?)/,
            /(\d+)\s*(?:youth|young\s+people)/,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const num = parseInt(match[1]);
                if (num > 0 && num < 1000) {
                    // Sanity check
                    return num;
                }
            }
        }
        return undefined;
    }

    private extractActivityType(text: string): string | undefined {
        const activities = {
            teaching: [
                /teach|taught|lesson|education|class|instruction|school/,
                /math|english|reading|writing|homework|study|learning/,
                /subject|curriculum|academic|educational/,
            ],
            mentoring: [
                /mentor|mentoring|guidance|counsel|advice|support/,
                /life skills|career|guidance|personal development/,
                /coaching|motivating|inspiring/,
            ],
            tutoring: [
                /tutor|tutoring|homework help|academic/,
                /exam|test prep|study group|study session/,
                /one.on.one|individual help/,
            ],
            sports: [
                /sports?|football|basketball|soccer|tennis|volleyball/,
                /game|play|exercise|physical|athletic|training/,
                /fitness|running|swimming|cycling/,
            ],
            "arts and crafts": [
                /art|drawing|painting|craft|creative|music|singing/,
                /dance|drama|theater|creative writing/,
                /pottery|sculpture|handicraft/,
            ],
            reading: [
                /read|reading|story|book|library/,
                /storytime|literacy|reading session/,
                /storytelling|book club/,
            ],
            cooking: [
                /cook|cooking|bake|baking|food|kitchen|meal/,
                /recipe|nutrition|food preparation/,
                /culinary|chef/,
            ],
            cleaning: [
                /clean|cleaning|organize|tidy|maintenance/,
                /gardening|landscaping|environment/,
                /trash|garbage|recycling/,
            ],
            "event organizing": [
                /event|party|celebration|festival|fundraiser/,
                /organize|planning|coordination|setup/,
                /conference|workshop|seminar/,
            ],
            "computer skills": [
                /computer|coding|programming|technology/,
                /digital|internet|software|app/,
                /tech|IT|technical/,
            ],
        };

        for (const [activity, patterns] of Object.entries(activities)) {
            for (const pattern of patterns) {
                if (pattern.test(text)) {
                    return activity;
                }
            }
        }
        return undefined;
    }

    private extractLocation(text: string): string | undefined {
        const patterns = [
            // Specific place patterns
            /(?:at|in|to|from)\s+([A-Z][a-zA-Z\s]{2,30}(?:Center|Centre|School|Library|Park|House|Foundation|Organization))/,
            /(?:at|in|to|from)\s+(Ban\s+[A-Z][a-z]+)/,
            /(?:at|in|to|from)\s+([A-Z][a-zA-Z\s]{2,30}(?:Community|Village|District))/,
            // General location patterns
            /(?:at|in|to|from)\s+(?:the\s+)?([A-Z][a-zA-Z\s]{3,25})/,
            // Address-like patterns
            /(?:at|in|to|from)\s+(\d+\s+[A-Z][a-zA-Z\s]+)/,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const location = match[1].trim();
                // Filter out common false positives
                const excludeWords = [
                    "Today",
                    "Yesterday",
                    "Tomorrow",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                    "Morning",
                    "Afternoon",
                    "Evening",
                    "Night",
                    "Week",
                    "Month",
                    "Year",
                ];
                if (!excludeWords.includes(location)) {
                    return location;
                }
            }
        }
        return undefined;
    }

    private extractOrganization(text: string): string | undefined {
        const patterns = [
            // Specific organization patterns
            /([A-Z][a-zA-Z\s]+(?:Foundation|Organization|NGO|Charity|Trust))/,
            /([A-Z][a-zA-Z\s]+(?:Center|Centre|House|Home))/,
            /(Hope|Care|Love|Help|Support|Future|Dream|Bright|New)\s+[A-Z][a-zA-Z\s]+/,
            // Common youth organization names
            /(Boys? and Girls? Club)/i,
            /(YMCA|YWCA)/i,
            /(Red Cross)/i,
            /(Salvation Army)/i,
            /(United Way)/i,
            // Local organizations
            /(Ban\s+[A-Z][a-z]+\s+(?:Foundation|Center|House))/,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                return match[1] || match[0];
            }
        }
        return undefined;
    }

    private extractDate(text: string): string | undefined {
        const patterns = [
            // Relative dates
            { pattern: /yesterday/, value: "yesterday" },
            { pattern: /today/, value: "today" },
            { pattern: /last\s+week/, value: "last week" },
            { pattern: /this\s+week/, value: "this week" },
            { pattern: /last\s+month/, value: "last month" },
            { pattern: /this\s+month/, value: "this month" },
            { pattern: /last\s+weekend/, value: "last weekend" },
            { pattern: /this\s+weekend/, value: "this weekend" },

            // Days of week
            { pattern: /(?:last\s+|this\s+)?(?:monday|mon)/i, value: "Monday" },
            {
                pattern: /(?:last\s+|this\s+)?(?:tuesday|tue)/i,
                value: "Tuesday",
            },
            {
                pattern: /(?:last\s+|this\s+)?(?:wednesday|wed)/i,
                value: "Wednesday",
            },
            {
                pattern: /(?:last\s+|this\s+)?(?:thursday|thu)/i,
                value: "Thursday",
            },
            { pattern: /(?:last\s+|this\s+)?(?:friday|fri)/i, value: "Friday" },
            {
                pattern: /(?:last\s+|this\s+)?(?:saturday|sat)/i,
                value: "Saturday",
            },
            { pattern: /(?:last\s+|this\s+)?(?:sunday|sun)/i, value: "Sunday" },

            // Specific dates
            { pattern: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/, value: null },
            { pattern: /(\w+)\s+(\d{1,2}),?\s+(\d{4})/, value: null },
            { pattern: /(\d{1,2})\s+(\w+)\s+(\d{4})/, value: null },

            // Time periods
            { pattern: /few\s+days?\s+ago/, value: "few days ago" },
            { pattern: /a\s+week\s+ago/, value: "a week ago" },
        ];

        for (const { pattern, value } of patterns) {
            const match = text.match(pattern);
            if (match) {
                return value || match[0];
            }
        }
        return undefined;
    }

    // ALL FIELDS ARE NOW REQUIRED!
    getMissingFields(extracted: ExtractedData): string[] {
        const requiredFields: (keyof ExtractedData)[] = [
            "name",
            "activity_type",
            "location",
            "number_of_kids",
            "youth_house",
            "date",
        ];
        return requiredFields.filter((field) => !extracted[field]);
    }

    // Generate smart follow-up questions with priority order
    generateFollowUpQuestion(
        missingFields: string[],
        extracted: ExtractedData,
    ): string {
        if (missingFields.length === 0) {
            return "Perfect! I have all the required information. Would you like me to save this activity? ✅";
        }

        // Priority order for asking questions
        const priorityOrder = [
            "name",
            "activity_type",
            "number_of_kids",
            "location",
            "youth_house",
            "date",
        ];

        // Find the highest priority missing field
        let fieldToAsk = missingFields[0];
        for (const field of priorityOrder) {
            if (missingFields.includes(field)) {
                fieldToAsk = field;
                break;
            }
        }

        const questions = {
            name: "Hi there! What's your name? I need to know who did this amazing volunteering work! 😊",
            activity_type:
                "What type of activity did you do? (e.g., teaching, mentoring, sports, arts and crafts)",
            location: "Where did this volunteering take place?",
            number_of_kids: "How many kids did you help or work with?",
            youth_house: "Which organization or youth house was this for?",
            date: "When did this volunteering activity happen?",
        };

        let question = questions[fieldToAsk as keyof typeof questions];

        // Make it more conversational with the volunteer's name
        if (extracted.name && fieldToAsk !== "name") {
            const personalizedQuestions = {
                activity_type: `Hi ${extracted.name}! What type of activity did you do?`,
                location: `Thanks ${extracted.name}! Where did this volunteering take place?`,
                number_of_kids: `Great ${extracted.name}! How many kids did you work with?`,
                youth_house: `Nice ${extracted.name}! Which organization or youth house was this for?`,
                date: `Almost done ${extracted.name}! When did this happen?`,
            };
            question =
                personalizedQuestions[
                    fieldToAsk as keyof typeof personalizedQuestions
                ] || question;
        }

        // Add progress indicator
        const totalFields = 6;
        const completedFields = totalFields - missingFields.length;
        const progressText =
            missingFields.length > 1
                ? ` (${completedFields}/${totalFields} complete)`
                : "";

        return question + progressText;
    }

    // Helper method to check if we have all required data
    isComplete(extracted: ExtractedData): boolean {
        const requiredFields: (keyof ExtractedData)[] = [
            "name",
            "activity_type",
            "location",
            "number_of_kids",
            "youth_house",
            "date",
        ];
        return requiredFields.every((field) => extracted[field]);
    }

    // Helper method to format data for display
    formatForDisplay(extracted: ExtractedData): string {
        const parts = [];

        if (extracted.name) parts.push(`${extracted.name}`);
        if (extracted.activity_type)
            parts.push(`did ${extracted.activity_type}`);
        if (extracted.number_of_kids)
            parts.push(`with ${extracted.number_of_kids} kids`);
        if (extracted.location) parts.push(`at ${extracted.location}`);
        if (extracted.youth_house) parts.push(`(${extracted.youth_house})`);
        if (extracted.date) parts.push(`on ${extracted.date}`);

        return parts.join(" ");
    }

    // Helper method to prepare data for Google Sheets
    formatForSheets(extracted: ExtractedData): any {
        return {
            name: extracted.name || "",
            date: extracted.date || new Date().toISOString().split("T")[0],
            activity_type: extracted.activity_type || "",
            location: extracted.location || "",
            number_of_kids: extracted.number_of_kids || "",
            youth_house: extracted.youth_house || "",
            logged_at: new Date().toISOString(),
        };
    }
}
