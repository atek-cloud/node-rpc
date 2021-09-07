import test from 'ava'
import http from 'http'
import { createServer } from './util/util.js'
import { rpc, createRpcServer, AtekRpcServer } from '../src/index.js'

let rpcServer: AtekRpcServer
let httpServer: http.Server
test.before(async () => {
  rpcServer = createRpcServer({
    hello (who) {
      return {value: `Hello ${who}`}
    }
  })
  httpServer = await createServer(12345, rpcServer.handle.bind(rpcServer))
})
test.after(async () => {
  await httpServer.close()
})

test('Call hello', async t => {
  const api = rpc('example.com/my-api')
  api.$setEndpoint({port: 12345})
  const res1 = await api.hello('world')
  t.is(res1.value, 'Hello world')
})

test('Method not found', async t => {
    const api = rpc('example.com/my-api')
  api.$setEndpoint({port: 12345})
  const err = await t.throwsAsync(() => api.notReal())
  t.is(err.message, 'Method not found: notReal')
})