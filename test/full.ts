import test from 'ava'
import http from 'http'
import { createServer } from './util/util.js'
import { rpc, createRpcServer, AtekRpcServer } from '../src/index.js'

class HelloResponse {
  constructor (public value: string) {}
  static schema = {
    type: 'object',
    properties: {
      value: {type: 'string'}
    }
  }
}

class ComplexObject {
  constructor (public foo: string, public bar: boolean[]) {}
  static schema = {
    type: 'object',
    properties: {
      foo: {type: 'string'},
      bar: {type: 'array', items: {type: 'boolean'}}
    }
  }
}

interface MyApi {
  hello (who: string): Promise<HelloResponse>
  noValidation (thing: string): Promise<string>
  error (): Promise<void>
  complex (arg1: ComplexObject, arg2: ComplexObject): Promise<ComplexObject>
}

function myApi () {
  return rpc<MyApi>('example.com/my-api')
}

function createMyApiServer (handlers: any) {
  return createRpcServer(handlers, {
    hello: {
      params: [{type: 'string'}],
      response: HelloResponse
    },
    complex: {
      params: [ComplexObject, ComplexObject],
      response: ComplexObject
    }
  })
}

let rpcServer: AtekRpcServer
let httpServer: http.Server
test.before(async () => {
  rpcServer = createMyApiServer({
    hello (who: string) {
      return new HelloResponse(`Hello ${who}`)
    },
    noValidation (thing: string) {
      return thing
    },
    error () {
      throw new Error('Oh no!')
    },
    complex (arg1: ComplexObject, arg2: ComplexObject) {
      return new ComplexObject(arg1.foo + arg2.foo, arg1.bar.concat(arg2.bar))
    }
  })
  httpServer = await createServer(12345, rpcServer.handle.bind(rpcServer))
})
test.after(async () => {
  await httpServer.close()
})

test('Call hello', async t => {
  const api = myApi()
  api.$setEndpoint({port: 12345})
  const res1 = await api.hello('world')
  t.is(res1.value, 'Hello world')
})

test('Call complex', async t => {
  const api = myApi()
  api.$setEndpoint({port: 12345})
  const res1 = await api.complex(
    new ComplexObject('hi', [true]),
    {foo: 'ho', bar: [false]}
  )
  t.is(res1.foo, 'hiho')
  t.deepEqual(res1.bar, [true, false])
})

test('Validation', async t => {
  const api = myApi()
  api.$setEndpoint({port: 12345})
  // @ts-ignore we need to test runtime validation
  const err = await t.throwsAsync(() => api.hello(5))
  t.is(err.message, 'Parameter 1 must be string')
})

test('No validation', async t => {
  const api = myApi()
  api.$setEndpoint({port: 12345})
  const res1 = await api.noValidation('a')
  t.is(res1, 'a')
  // @ts-ignore we need to test runtime validation
  const res2 = await api.noValidation(1)
  // @ts-ignore we need to test runtime validation
  t.is(res2, 1)
})

test('Server-side errors', async t => {
  const api = myApi()
  api.$setEndpoint({port: 12345})
  const err = await t.throwsAsync(() => api.error())
  t.is(err.message, 'Oh no!')
})