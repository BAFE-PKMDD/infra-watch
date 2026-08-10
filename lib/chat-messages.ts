export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const MAX_HISTORY_MESSAGES = 20;
const MAX_HISTORY_CHARACTERS = 20_000;

export function getBoundedChatHistory(messages: ChatMessage[]): ChatMessage[] {
  const selected: ChatMessage[] = [];
  let totalCharacters = 0;

  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    if (!message) continue;

    if (
      selected.length >= MAX_HISTORY_MESSAGES ||
      totalCharacters + message.content.length > MAX_HISTORY_CHARACTERS
    ) {
      break;
    }

    selected.push(message);
    totalCharacters += message.content.length;
  }

  return selected.reverse();
}

export function appendToLastAssistantMessage(
  messages: ChatMessage[],
  chunk: string,
): ChatMessage[] {
  const lastIndex = messages.length - 1;
  const lastMessage = messages[lastIndex];

  if (!lastMessage || lastMessage.role !== "assistant") {
    return messages;
  }

  const updated = [...messages];
  updated[lastIndex] = {
    ...lastMessage,
    content: lastMessage.content + chunk,
  };
  return updated;
}

export function ensureAssistantMessage(
  messages: ChatMessage[],
  content: string,
): ChatMessage[] {
  const lastMessage = messages.at(-1);
  if (!lastMessage) return messages;

  if (lastMessage.role === "assistant") {
    if (!lastMessage.content) {
      return [...messages.slice(0, -1), { ...lastMessage, content }];
    }
    if (lastMessage.content.endsWith(content)) return messages;
    return [
      ...messages.slice(0, -1),
      { ...lastMessage, content: `${lastMessage.content}\n\n${content}` },
    ];
  }

  return [...messages, { role: "assistant", content }];
}
