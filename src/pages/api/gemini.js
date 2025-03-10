export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { chat } = req.body;
    if (!chat || !Array.isArray(chat)) {
        return res.status(400).json({ error: "Chat history is required and should be an array." });
    }

    // Hidden system message should be included as a user message instead
    const preloadedPrompt = {
        role: "user", // Instead of "system", use "user"
        parts: [{ text: "You are an ai chat bot that is desgined to provided helpful advice and break downs of complex documents. Please respond without any style except for paragraph spaces" }]
    };

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [
                        preloadedPrompt, // Add the preloaded prompt as the first message
                        ...chat.map(msg => ({
                            role: msg.role,
                            parts: [{ text: msg.content }]
                        }))
                    ]
                }),
            }
        );

        const data = await response.json();
        console.log("Gemini API Response:", JSON.stringify(data, null, 2));

        if (!response.ok) {
            return res.status(response.status).json({ error: "Gemini API Error", details: data });
        }

        // Extract AI response safely
        const aiReply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "I couldn't process that request.";

        res.status(200).json({ reply: aiReply });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch response from Gemini API", details: error.message });
    }
}
