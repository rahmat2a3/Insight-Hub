import { EdgeTTS } from 'node-edge-tts';
import { randomBytes } from 'crypto';

// Helper untuk generate TTS ke dalam Buffer (in-memory, tanpa filesystem)
export async function generateEdgeTTSBuffer(
  text: string,
  voiceConfig: { voice: string; rate: string; pitch: string }
): Promise<Buffer> {
  const tts = new EdgeTTS({
    voice: voiceConfig.voice,
    lang: 'id-ID',
    rate: voiceConfig.rate,
    pitch: voiceConfig.pitch,
    outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
  });

  const ws = await tts._connectWebSocket();
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('TTS Generation Timed out'));
    }, 15000);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ws.on('message', (data: any, isBinary: boolean) => {
      if (isBinary) {
        const separator = 'Path:audio\r\n';
        const index = data.indexOf(separator) + separator.length;
        const audioData = data.subarray(index);
        chunks.push(Buffer.from(audioData));
      } else {
        const message = data.toString();
        if (message.includes('Path:turn.end')) {
          ws.close();
          clearTimeout(timeout);
          resolve(Buffer.concat(chunks));
        }
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ws.on('error', (err: any) => {
      clearTimeout(timeout);
      ws.close();
      reject(err);
    });

    const requestId = randomBytes(16).toString('hex');
    const escapedText = text.replace(/[<>&"']/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '"': return '&quot;';
        case "'": return '&apos;';
        default: return c;
      }
    });

    ws.send(
      `X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n` +
      `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="id-ID">
        <voice name="${voiceConfig.voice}">
          <prosody rate="${voiceConfig.rate}" pitch="${voiceConfig.pitch}" volume="default">
            ${escapedText}
          </prosody>
        </voice>
      </speak>`
    );
  });
}
