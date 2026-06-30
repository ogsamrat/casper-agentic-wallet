export type ToolResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean };

export function text(obj: unknown, isError = false): ToolResult {
  return {
    content: [{ type: 'text', text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2) }],
    isError,
  };
}

export function tryJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return s.length > 4000 ? s.slice(0, 4000) + '…' : s;
  }
}
