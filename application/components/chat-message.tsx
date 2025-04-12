import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ChatMessageProps {
  message: string
  isUser: boolean
}

export function ChatMessage({ message, isUser }: ChatMessageProps) {
  return (
    <Card className={cn(
      "mb-4 p-4 max-w-[80%]",
      isUser ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"
    )}>
      <p className="whitespace-pre-wrap">{message}</p>
    </Card>
  )
}
