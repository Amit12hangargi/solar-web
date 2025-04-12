import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { SendHorizontal } from "lucide-react"
import { useState } from "react"

interface ChatInputProps {
  onSend: (message: string) => void
  isLoading: boolean
}

export function ChatInput({ onSend, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !isLoading) {
      onSend(message.trim())
      setMessage("")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask about solar energy..."
        className="min-h-[50px] max-h-[200px] bg-gray-700/50 border-gray-600
                   focus:border-gray-500 placeholder-gray-400 text-gray-100"
        disabled={isLoading}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            handleSubmit(e)
          }
        }}
      />
      <Button
        type="submit"
        disabled={isLoading || !message.trim()}
        className={cn(
          "shrink-0 bg-blue-600 hover:bg-blue-700",
          "disabled:bg-gray-700 disabled:opacity-50"
        )}
      >
        {isLoading ? (
          <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full"/>
        ) : (
          <SendHorizontal className="h-5 w-5" />
        )}
      </Button>
    </form>
  )
}
