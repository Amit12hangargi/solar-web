"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useEffect, useRef, useState } from "react"
import { Sun, Battery, Wind, Zap, SendHorizontal, LineChart, Settings, Info } from 'lucide-react'
import { cn } from "@/lib/utils"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

interface Message {
  content: string
  isUser: boolean
}

function ChatMessage({ message, isUser }: { message: string; isUser: boolean }) {
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-2 shadow-lg",
          isUser
            ? "bg-blue-600 text-white rounded-br-none"
            : "bg-gray-700/50 text-gray-100 rounded-bl-none border border-gray-600"
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message}</p>
        ) : (
          <div className="text-gray-100">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeRaw, rehypeSanitize, rehypeKatex]}
              components={{
                h1: ({node, ...props}) => <h1 {...props} className="text-2xl font-bold my-4" />,
                h2: ({node, ...props}) => <h2 {...props} className="text-xl font-bold my-3" />,
                h3: ({node, ...props}) => <h3 {...props} className="text-lg font-bold my-2" />,
                p: ({node, ...props}) => <p {...props} className="my-2 text-gray-100" />,
                ul: ({node, ...props}) => <ul {...props} className="list-disc list-inside my-2 space-y-1" />,
                ol: ({node, ...props}) => <ol {...props} className="list-decimal list-inside my-2 space-y-1" />,
                li: ({node, ...props}) => <li {...props} className="my-1" />,
                pre: ({node, ...props}) => (
                  <pre {...props} className="bg-gray-800 rounded-lg p-4 my-4 overflow-x-auto border border-gray-600" />
                ),
                table: ({node, ...props}) => (
                  <div className="overflow-x-auto my-4">
                    <table {...props} className="min-w-full divide-y divide-gray-600 border border-gray-600 rounded-lg" />
                  </div>
                ),
                th: ({node, ...props}) => (
                  <th {...props} className="px-4 py-2 bg-gray-800 text-left text-sm font-semibold text-gray-300 border-b border-gray-600" />
                ),
                td: ({node, ...props}) => (
                  <td {...props} className="px-4 py-2 text-sm border-t border-gray-600" />
                ),
                a: ({node, ...props}) => (
                  <a {...props} className="text-blue-400 hover:text-blue-300 underline" target="_blank" rel="noopener noreferrer" />
                ),
                blockquote: ({node, ...props}) => (
                  <blockquote {...props} className="border-l-4 border-gray-600 pl-4 my-2 italic text-gray-300" />
                ),
                hr: ({node, ...props}) => <hr {...props} className="my-4 border-gray-600" />,
              }}
            >
              {message}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  )
}

function ChatInput({ onSend, isLoading }: { onSend: (message: string) => void; isLoading: boolean }) {
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
                   focus:border-gray-500 placeholder-gray-400 text-gray-100 resize-none"
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
          "shrink-0 bg-blue-600 hover:bg-blue-700 transition-colors",
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

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  // Load chat history from localStorage on initial load
  useEffect(() => {
    const savedMessages = localStorage.getItem('chatHistory')
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages))
      } catch (e) {
        console.error('Failed to load chat history:', e)
      }
    }
  }, [])

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('chatHistory', JSON.stringify(messages))
    }
  }, [messages])

  const handleSendMessage = async (message: string) => {
    setIsLoading(true)
    setMessages(prev => [...prev, { content: message, isUser: true }])

    try {
      // Get previous messages for context (limit to last 10 for performance)
      const chatHistory = [...messages].slice(-10)

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          chatHistory
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      if (!response.body) {
        throw new Error("No response body")
      }

      // Initialize streaming
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let aiResponse = ""

      // Add initial AI message
      setMessages(prev => [...prev, { content: "", isUser: false }])

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        // Decode and accumulate the chunk
        const chunk = decoder.decode(value)
        aiResponse += chunk

        // Update the last message (AI's response)
        setMessages(prev => {
          const newMessages = [...prev]
          newMessages[newMessages.length - 1] = {
            content: aiResponse,
            isUser: false
          }
          return newMessages
        })
      }

    } catch (error) {
      console.error("Error:", error)
      setMessages(prev => [...prev, {
        content: "Sorry, there was an error processing your request.",
        isUser: false
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const clearHistory = () => {
    localStorage.removeItem('chatHistory')
    setMessages([])
  }

  const quickSuggestions = [
    "How do bifacial solar panels perform in urban environments?",
    "What are the latest solar panel efficiency records?",
    "How do tariffs affect solar panel pricing?",
    "How do agrivoltaics benefit both energy and agriculture sectors?",
    "What certifications should solar installers have?",
    "Can this application scale if I want to monitor multiple factories or locations?",
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 fixed top-0 w-full z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sun className="h-8 w-8 text-yellow-500 animate-pulse" />
              <h1 className="text-2xl font-bold text-white">Solar Energy Assistant</h1>
            </div>
            <div className="flex space-x-6">
              <div className="flex items-center space-x-1 text-green-400 hover:text-green-300 cursor-pointer transition-colors">
                <Battery className="h-5 w-5" />
                <span className="text-sm hidden sm:inline">Storage</span>
              </div>
              <div className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 cursor-pointer transition-colors">
                <Wind className="h-5 w-5" />
                <span className="text-sm hidden sm:inline">Wind</span>
              </div>
              <div className="flex items-center space-x-1 text-yellow-400 hover:text-yellow-300 cursor-pointer transition-colors">
                <Zap className="h-5 w-5" />
                <span className="text-sm hidden sm:inline">Solar</span>
              </div>
              <div className="flex items-center space-x-1 text-purple-400 hover:text-purple-300 cursor-pointer transition-colors">
                <LineChart className="h-5 w-5" />
                <span className="text-sm hidden sm:inline">Analytics</span>
              </div>
              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearHistory}
                  className="text-gray-400 hover:text-gray-300"
                >
                  <Settings className="h-5 w-5 mr-1" />
                  <span className="hidden sm:inline">Clear Chat</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 min-h-screen flex flex-col pt-20">
        <div className="flex-1 mb-4 bg-gray-800/30 backdrop-blur-sm rounded-lg border border-gray-700">
          <ScrollArea
            className="h-[calc(100vh-180px)] px-4 overflow-y-auto"
            ref={scrollAreaRef}
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full space-y-6 p-4">
                <Sun className="h-16 w-16 text-yellow-500 animate-pulse" />
                <div className="text-center space-y-4">
                  <h2 className="text-2xl font-bold text-white">
                    Welcome to Solar Energy Assistant
                  </h2>
                  <p className="text-gray-400 max-w-md justify-center text-center ml-20">
                    Your intelligent companion for solar energy, renewable technologies,
                    and sustainable power solutions.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-2xl mx-auto mt-6">
                    {quickSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => handleSendMessage(suggestion)}
                        className="p-2 text-sm bg-gray-700/50 hover:bg-gray-700
                                 rounded-lg text-gray-300 transition-colors
                                 border border-gray-600 hover:border-gray-500"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-4 space-y-6">
                {messages.map((message, index) => (
                  <ChatMessage
                    key={index}
                    message={message.content}
                    isUser={message.isUser}
                  />
                ))}
              </div>
            )}
            {isLoading && (
              <div className="flex items-center space-x-2 text-gray-400 py-4">
                <div className="animate-spin h-4 w-4 border-2 border-gray-500 border-t-gray-200 rounded-full"/>
                <span className="text-sm">Processing your solar energy query...</span>
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="sticky bottom-4 bg-gray-800/70 backdrop-blur-md border border-gray-700 rounded-lg p-4">
          <ChatInput onSend={handleSendMessage} isLoading={isLoading} />
        </div>
      </main>
    </div>
  )
}
