import test from 'ava'
import http from 'http'
import { createServer } from './util/util.js'
import { rpc, createRpcServer, AtekRpcServer } from '../src/index.js'

let rpcServer: AtekRpcServer
let httpServer: http.Server
test.before(async () => {
  rpcServer = createRpcServer({
    getReqPath () {
      return this.req.url
    },
    hasReq () {
      return !!this.req
    },
    hasRes () {
      return !!this.res
    },
    hasBody () {
      return !!this.body
    }
  })
  httpServer = await createServer(12345, rpcServer.handle.bind(rpcServer))
})
test.after(async () => {
  await httpServer.close()
})

test('Has access to context', async t => {
  const api = rpc('example.com/my-api')
  api.$setEndpoint({port: 12345})
  const res1 = await api.getReqPath()
  t.is(typeof res1, 'string')
  t.truthy(await api.hasReq())
  t.truthy(await api.hasRes())
  t.truthy(await api.hasBody())
})
