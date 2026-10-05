import type { ChatMessage } from '../types';

interface MessageIndex {
  ids: Set<number>;
  times: number[];
  sorted: boolean;
}

const timestamps = new WeakMap<ChatMessage, number>();
const indexes = new WeakMap<ChatMessage[], MessageIndex>();

const timestamp = (message: ChatMessage): number => {
  const cached = timestamps.get(message);
  if (cached !== undefined) return cached;
  const value = Date.parse(message.timestamp);
  timestamps.set(message, value);
  return value;
};

const indexMessages = (messages: ChatMessage[]): MessageIndex => {
  const cached = indexes.get(messages);
  if (cached) return cached;
  const times = messages.map(timestamp);
  const index = {
    ids: new Set(messages.map(message => message.message_id)),
    times,
    sorted: times.every((time, i) => Number.isFinite(time) && (i === 0 || times[i - 1] <= time)),
  };
  indexes.set(messages, index);
  return index;
};

export const insertChatMessage = (messages: ChatMessage[], message: ChatMessage): ChatMessage[] => {
  const index = indexMessages(messages);
  if (index.ids.has(message.message_id)) return messages;
  const time = timestamp(message);

  if (!index.sorted || !Number.isFinite(time)) {
    const next = [...messages, message].sort((a, b) => timestamp(a) - timestamp(b));
    indexMessages(next);
    return next;
  }

  let low = 0;
  let high = messages.length;
  if (high === 0 || index.times[high - 1] <= time) {
    low = high;
  } else {
    while (low < high) {
      const mid = (low + high) >>> 1;
      if (index.times[mid] <= time) low = mid + 1;
      else high = mid;
    }
  }

  const next = [...messages.slice(0, low), message, ...messages.slice(low)];
  const ids = new Set(index.ids);
  ids.add(message.message_id);
  indexes.set(next, {
    ids,
    times: [...index.times.slice(0, low), time, ...index.times.slice(low)],
    sorted: true,
  });
  return next;
};
