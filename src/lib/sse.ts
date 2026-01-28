export type SseEvent = {
  event: string;
  data: string;
  id?: string;
};

export async function connectSseStream(opts: {
  url: string;
  headers?: Record<string, string>;
  signal: AbortSignal;
  onEvent: (evt: SseEvent) => void;
}): Promise<void> {
  const res = await fetch(opts.url, {
    method: 'GET',
    headers: opts.headers,
    signal: opts.signal,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`SSE连接失败: ${res.status} ${text}`);
  }

  if (!res.body) {
    throw new Error('SSE连接失败: response body为空');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const emitBlock = (block: string) => {
    const clean = block.replace(/\r/g, '');
    const lines = clean.split('\n');

    let event = 'message';
    let data = '';
    let id: string | undefined;

    for (const line of lines) {
      if (line.startsWith('event:')) {
        event = line.slice('event:'.length).trim();
      } else if (line.startsWith('data:')) {
        const piece = line.slice('data:'.length).trimStart();
        data = data ? `${data}\n${piece}` : piece;
      } else if (line.startsWith('id:')) {
        id = line.slice('id:'.length).trim();
      }
    }

    if (data) {
      opts.onEvent({ event, data, id });
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    let idx = buffer.indexOf('\n\n');
    while (idx !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);

      if (block.trim().length > 0) {
        emitBlock(block);
      }

      idx = buffer.indexOf('\n\n');
    }
  }
}
