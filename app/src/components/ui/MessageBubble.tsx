import { useState } from "react";
import { MarkdownContent } from "./MarkdownContent";

interface SubagentMessage {
  id: string;
  seq: number;
  role: string;
  content: string;
  metadata?: string | null;
}

interface MessageBubbleProps {
  role: string;
  content: string;
  seq: number;
  metadata?: string | null;
  subagentMessages?: SubagentMessage[];
}

function parseMetadata(
  metadata?: string | null,
): Record<string, unknown> | null {
  if (!metadata) return null;
  try {
    return JSON.parse(metadata);
  } catch {
    return null;
  }
}

function getMetaLabel(meta: Record<string, unknown>): string | null {
  if (meta.isCommand) {
    const name = meta.commandName as string | undefined;
    return name ? `Command: /${name}` : "Command";
  }
  if (meta.isMeta) {
    return "Skill prompt";
  }
  const origin = meta.origin as { kind?: string } | undefined;
  if (origin?.kind === "task-notification") {
    return "Task notification";
  }
  return null;
}

function WrenchIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function summarizeInput(input: unknown): string {
  if (!input || typeof input !== "object") return "";
  const obj = input as Record<string, unknown>;
  // Show the first string-valued key as the brief summary
  for (const key of [
    "command",
    "file_path",
    "path",
    "pattern",
    "query",
    "url",
  ]) {
    if (typeof obj[key] === "string") {
      const val = obj[key] as string;
      return val.length > 80 ? `${val.slice(0, 80)}...` : val;
    }
  }
  // Fallback: first string value in the object
  for (const val of Object.values(obj)) {
    if (typeof val === "string") {
      return val.length > 80 ? `${val.slice(0, 80)}...` : val;
    }
  }
  return "";
}

function SubagentStep({ msg }: { msg: SubagentMessage }) {
  let label = "";

  if (msg.role === "tool") {
    try {
      const parsed = JSON.parse(msg.content);
      if (parsed?.type === "tool_call") {
        const summary = summarizeInput(parsed.input);
        label = summary ? `${parsed.name}: ${summary}` : parsed.name;
      } else if (parsed?.type === "tool_result") {
        const output = String(parsed.output ?? "");
        const brief = output.slice(0, 100);
        label = `Result: ${brief}${output.length > 100 ? "..." : ""}`;
      } else {
        label = msg.content.slice(0, 100);
      }
    } catch {
      label = msg.content.slice(0, 100);
    }
  } else {
    // assistant text
    const firstLine = msg.content.split("\n")[0] ?? "";
    label =
      firstLine.length > 100 ? `${firstLine.slice(0, 100)}...` : firstLine;
  }

  return (
    <div className="px-3 py-1 text-xs font-mono text-gray-400 truncate border-b border-slate-700/30 last:border-0">
      {label}
    </div>
  );
}

function SubagentGroup({ messages }: { messages: SubagentMessage[] }) {
  const [open, setOpen] = useState(false);
  const count = messages.length;

  return (
    <div className="mt-1 border border-slate-700/60 rounded-md overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-left bg-slate-800/40 hover:bg-slate-700/40 transition-colors"
      >
        <span className="text-xs font-mono text-gray-500 flex-1">
          {count} {count === 1 ? "step" : "steps"}
        </span>
        <span className="text-gray-500 shrink-0">
          <ChevronIcon open={open} />
        </span>
      </button>
      {open && (
        <div className="bg-slate-900/40">
          {messages.map((msg) => (
            <SubagentStep key={msg.id} msg={msg} />
          ))}
        </div>
      )}
    </div>
  );
}

function ToolBubble({
  content,
  seq,
  subagentMessages,
}: {
  content: string;
  seq: number;
  subagentMessages?: SubagentMessage[];
}) {
  const [open, setOpen] = useState(false);

  let toolName = "tool_use";
  let jsonContent = content;
  try {
    const parsed = JSON.parse(content);
    if (parsed?.name) toolName = parsed.name;
    jsonContent = JSON.stringify(parsed, null, 2);
  } catch {
    // keep raw content
  }

  const stepCount = subagentMessages?.length ?? 0;
  const headerLabel =
    stepCount > 0
      ? `${toolName} (${stepCount} ${stepCount === 1 ? "step" : "steps"})`
      : toolName;

  return (
    <div className="flex flex-col items-start">
      <span className="text-xs text-gray-600 mb-1 font-mono">#{seq}</span>
      <div className="bg-slate-800/60 border border-slate-700 rounded-lg overflow-hidden max-w-xl lg:max-w-3xl w-full">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-slate-700/40 transition-colors"
        >
          <span className="text-gray-500">
            <WrenchIcon />
          </span>
          <span className="font-mono text-xs text-gray-400 flex-1">
            {headerLabel}
          </span>
          <span className="text-gray-500">
            <ChevronIcon open={open} />
          </span>
        </button>
        {open && (
          <div className="border-t border-slate-700">
            <pre className="text-xs font-mono text-gray-300 p-3 overflow-x-auto whitespace-pre">
              {jsonContent}
            </pre>
          </div>
        )}
        {subagentMessages && subagentMessages.length > 0 && (
          <div className="border-t border-slate-700/50 px-3 pb-2 pt-1">
            <SubagentGroup messages={subagentMessages} />
          </div>
        )}
      </div>
    </div>
  );
}

function MetaBubble({
  label,
  content,
  seq,
  className,
}: {
  label: string;
  content: string;
  seq: number;
  className: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col items-start">
      <span className="text-xs text-gray-600 mb-1 font-mono">#{seq}</span>
      <div className={`${className} max-w-xl lg:max-w-3xl overflow-hidden`}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-slate-700/30 transition-colors"
        >
          <span className="font-mono text-xs text-gray-400 flex-1">
            {label}
          </span>
          <span className="text-gray-500 shrink-0">
            <ChevronIcon open={open} />
          </span>
        </button>
        {open && (
          <div className="px-4 py-3 border-t border-slate-700/50">
            <MarkdownContent content={content} />
          </div>
        )}
      </div>
    </div>
  );
}

export function MessageBubble({
  role,
  content,
  seq,
  metadata,
  subagentMessages,
}: MessageBubbleProps) {
  if (role === "tool") {
    return (
      <ToolBubble
        content={content}
        seq={seq}
        subagentMessages={subagentMessages}
      />
    );
  }

  // Check for collapsible meta messages (skills, task notifications, commands)
  const meta = parseMetadata(metadata);
  if (meta) {
    const label = getMetaLabel(meta);
    if (label) {
      return (
        <MetaBubble
          label={label}
          content={content}
          seq={seq}
          className="bg-slate-800/60 border border-slate-700 rounded-lg"
        />
      );
    }
  }

  if (role === "system") {
    return (
      <div className="flex flex-col items-center">
        <span className="text-xs text-gray-600 mb-1 font-mono">#{seq}</span>
        <p className="text-xs text-gray-500 italic text-center max-w-sm px-4">
          {content}
        </p>
      </div>
    );
  }

  if (role === "user") {
    return (
      <div className="flex flex-col items-end">
        <span className="text-xs text-gray-600 mb-1 font-mono">#{seq}</span>
        <div className="bg-cyan-900/50 border border-cyan-800/40 rounded-lg rounded-br-sm px-4 py-3 max-w-xl lg:max-w-3xl">
          <MarkdownContent content={content} />
        </div>
      </div>
    );
  }

  // Assistant (default)
  return (
    <div className="flex flex-col items-start">
      <span className="text-xs text-gray-600 mb-1 font-mono">#{seq}</span>
      <div className="bg-slate-800 border border-slate-700 rounded-lg rounded-bl-sm px-4 py-3 max-w-xl lg:max-w-3xl">
        <MarkdownContent content={content} />
      </div>
    </div>
  );
}
