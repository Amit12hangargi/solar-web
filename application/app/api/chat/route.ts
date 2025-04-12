import { NextResponse } from "next/server"

const SYSTEM_PROMPT = `You are a solar energy expert. Provide concise, technical responses about solar energy and renewables. Keep responses under 3-4 paragraphs.

Format your responses as follows:
1. Brief technical answer (1-2 sentences)
2. Key points in bullet form
3. Practical recommendation (if applicable)

For calculations/technical data:
- Use markdown tables for data comparison
- Use LaTeX for equations
- Include units and industry standards
- Cite specific metrics

Focus areas:
- Solar PV systems
- Plant operations
- ROI/Economics
- Grid integration
- Performance metrics
- Technical standards
- Maintenance protocols

If asked about non-solar topics, briefly redirect to solar energy discussions.

Keep all responses focused, technical, and actionable.`

interface ChatMessage {
  content: string;
  isUser: boolean;
}

export async function POST(req: Request) {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  try {
    const body = await req.json()
    const { message, chatHistory = [] } = body

    const formattedHistory = chatHistory
      .map((msg: ChatMessage) =>
        `${msg.isUser ? 'User' : 'Assistant'}: ${msg.content}`
      )
      .join('\n\n')

    const fullPrompt = `${SYSTEM_PROMPT}\n\n${
      formattedHistory ? `Previous conversation:\n${formattedHistory}\n\n` : ''
    }User: ${message}\nAssistant: Let me provide a focused response about solar energy:\n\n`

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen2.5:1.5b",
        prompt: fullPrompt,
        stream: true,
        temperature: 0.7,
        max_tokens: 500,
        context_window: 4096,
      }),
    })

    const stream = new TransformStream()
    const writer = stream.writable.getWriter()

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error("No reader available")
    }

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            await writer.close()
            break
          }

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n').filter(line => line.trim())

          for (const line of lines) {
            try {
              const json = JSON.parse(line)
              if (json.response) {
                await writer.write(encoder.encode(json.response))
              }
            } catch (e) {
              console.error('Error parsing JSON:', e)
            }
          }
        }
      } catch (e) {
        console.error('Stream processing error:', e)
        await writer.abort(e)
      }
    })()

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
