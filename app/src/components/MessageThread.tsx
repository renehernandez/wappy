import { useCallback, useEffect, useRef, useState } from "react";
import { MessageBubble } from "~/components/ui/MessageBubble";
import { parseMetadata } from "~/lib/metadata";

interface Message {
  id: string;
  seq: number;
  role: string;
  content: string;
  metadata?: string | null;
  createdAt: string;
}

interface MessageThreadProps {
  messages: Message[];
}

function isSubagentMessage(msg: Message): boolean {
  const meta = parseMetadata(msg.metadata);
  return meta?.isSubagent === true;
}

function isAgentToolCall(msg: Message): boolean {
  if (msg.role !== "tool") return false;
  try {
    const parsed = JSON.parse(msg.content);
    return parsed?.type === "tool_call";
  } catch {
    return false;
  }
}

type RenderItem =
  | { type: "regular"; message: Message }
  | {
      type: "agent-with-subagents";
      agentMessage: Message;
      subagentMessages: Message[];
    };

function groupMessages(messages: Message[]): RenderItem[] {
  const items: RenderItem[] = [];
  let i = 0;

  while (i < messages.length) {
    if (isSubagentMessage(messages[i])) {
      // Collect consecutive subagent messages
      const subagentMessages: Message[] = [];
      while (i < messages.length && isSubagentMessage(messages[i])) {
        subagentMessages.push(messages[i]);
        i++;
      }

      // Find the preceding agent tool_call to attach them to
      if (items.length > 0) {
        const last = items[items.length - 1];
        if (last.type === "regular" && isAgentToolCall(last.message)) {
          items[items.length - 1] = {
            type: "agent-with-subagents",
            agentMessage: last.message,
            subagentMessages,
          };
          continue;
        }
        if (last.type === "agent-with-subagents") {
          // Append to existing group
          last.subagentMessages.push(...subagentMessages);
          continue;
        }
      }

      // No preceding agent tool_call — render subagent messages individually
      for (const subMsg of subagentMessages) {
        items.push({ type: "regular", message: subMsg });
      }
      continue;
    }

    items.push({ type: "regular", message: messages[i] });
    i++;
  }

  return items;
}

export function MessageThread({ messages }: MessageThreadProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showNewPill, setShowNewPill] = useState(false);
  const isAtBottomRef = useRef(true);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
    setShowNewPill(false);
    isAtBottomRef.current = true;
  }, []);

  // Track scroll position to determine if user is at bottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleScroll() {
      if (!container) return;
      const { scrollTop, scrollHeight, clientHeight } = container;
      isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 80;
      if (isAtBottomRef.current) setShowNewPill(false);
    }

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-scroll or show pill on new messages
  useEffect(() => {
    if (messages.length === 0) return;
    if (isAtBottomRef.current) {
      scrollToBottom("smooth");
    } else {
      setShowNewPill(true);
    }
  }, [messages.length, scrollToBottom]);

  if (messages.length === 0) {
    return (
      <p className="font-mono text-gray-500 text-sm py-8">
        &gt; No messages yet.
      </p>
    );
  }

  const renderItems = groupMessages(messages);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="space-y-4 max-h-[calc(100vh-16rem)] overflow-y-auto pr-2"
      >
        {renderItems.map((item) => {
          if (item.type === "agent-with-subagents") {
            return (
              <MessageBubble
                key={item.agentMessage.id}
                role={item.agentMessage.role}
                content={item.agentMessage.content}
                seq={item.agentMessage.seq}
                metadata={item.agentMessage.metadata}
                subagentMessages={item.subagentMessages}
              />
            );
          }
          return (
            <MessageBubble
              key={item.message.id}
              role={item.message.role}
              content={item.message.content}
              seq={item.message.seq}
              metadata={item.message.metadata}
            />
          );
        })}
        <div ref={bottomRef} />
      </div>

      {showNewPill && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
          <button
            type="button"
            onClick={() => scrollToBottom("smooth")}
            className="bg-cyan-500 text-slate-950 text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg hover:bg-cyan-400 transition-colors"
          >
            New messages ↓
          </button>
        </div>
      )}
    </div>
  );
}
