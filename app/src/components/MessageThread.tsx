interface Message {
  id: string;
  seq: number;
  role: string;
  content: string;
  createdAt: string;
}

interface MessageThreadProps {
  messages: Message[];
}

const roleStyles: Record<string, string> = {
  user: "bg-blue-50 border-blue-200",
  assistant: "bg-gray-50 border-gray-200",
  system: "bg-yellow-50 border-yellow-200",
  tool: "bg-purple-50 border-purple-200",
};

const roleLabels: Record<string, string> = {
  user: "You",
  assistant: "Assistant",
  system: "System",
  tool: "Tool",
};

export function MessageThread({ messages }: MessageThreadProps) {
  if (messages.length === 0) {
    return <p className="text-gray-500 text-sm">No messages yet.</p>;
  }

  return (
    <div className="space-y-3">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`border rounded-lg p-3 ${roleStyles[msg.role] || "bg-gray-50 border-gray-200"}`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">
              {roleLabels[msg.role] || msg.role}
            </span>
            <span className="text-xs text-gray-400">#{msg.seq}</span>
          </div>
          <pre className="text-sm whitespace-pre-wrap font-mono">
            {msg.content}
          </pre>
        </div>
      ))}
    </div>
  );
}
