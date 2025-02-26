export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Method Not Allowed" });
    }

    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
    }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateText?key=${process.env.GEMINI_API_KEY}`,            
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: { text: prompt } }),
            }
        );

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch response from Gemini API" });
    }
}
