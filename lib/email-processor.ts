import { chatWithAI } from './openai'

interface EmailInput {
    subject: string
    from: string
    body: string
}

interface EmailAIResult {
    summary: string
    actionItems: Array<{ id: number; text: string }>
}

/**
 * Process an email with AI to generate summary and action items
 */
export async function processEmailWithAI(email: EmailInput): Promise<EmailAIResult> {
    try {
        const systemPrompt = `You are an AI assistant that analyzes emails and provides concise summaries and action items.

Please analyze the email and provide:
1. A clear, concise summary (2-3 sentences) of the main points
2. A list of specific action items mentioned in the email

Format your response as JSON:
{
    "summary": "Your summary here",
    "actionItems": [
        "Action item description 1",
        "Action item description 2"
    ]
}

Return only the action item text as strings.
If no clear action items are mentioned, return an empty array for actionItems.`

        const userPrompt = `Email Subject: ${email.subject}
From: ${email.from}

Email Content:
${email.body}`

        const response = await chatWithAI(systemPrompt, userPrompt)

        if (!response) {
            throw new Error('No response from AI')
        }

        // Try to parse as JSON
        let parsed
        try {
            parsed = JSON.parse(response)
        } catch (parseError) {
            // Try to find JSON in the response
            const jsonMatch = response.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
                try {
                    parsed = JSON.parse(jsonMatch[0])
                } catch {
                    // Use response as summary
                    parsed = {
                        summary: response.substring(0, 500),
                        actionItems: []
                    }
                }
            } else {
                parsed = {
                    summary: response.substring(0, 500),
                    actionItems: []
                }
            }
        }

        const actionItems = Array.isArray(parsed.actionItems)
            ? parsed.actionItems.map((text: string, index: number) => ({
                id: index + 1,
                text: text
            }))
            : []

        return {
            summary: parsed.summary || 'Summary could not be generated',
            actionItems: actionItems
        }

    } catch (error) {
        console.error('Error processing email with AI:', error)

        return {
            summary: 'Email processed. Please read the full content for details.',
            actionItems: []
        }
    }
}
