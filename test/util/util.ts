import http from 'http'

export async function createServer (port: number, handler: (req: http.IncomingMessage, res: http.ServerResponse, body: any) => unknown) {
  const s = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const buffers: Buffer[] = []
    for await (const chunk of req) {
      buffers.push(chunk)
    }
    const body = JSON.parse(Buffer.concat(buffers).toString('utf8'))
    handler(req, res, body)
  })
  await new Promise(r => s.listen(port, () => r(undefined)))
  return s
}