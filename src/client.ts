import websocket from 'websocket-stream'
import { URLSearchParams } from 'url'
import fetch from 'node-fetch'
import * as jsonrpc from 'jsonrpc-lite'
import { RpcError } from './types.js'

const ATEK_HOST_PORT: number = Number(process.env.ATEK_HOST_PORT) || 0

interface ApiDesc {
  [key: string]: string
}

interface UnknownApi {
  [method: string]: (...params: any[]) => Promise<any>
}

export function getUrl (desc: ApiDesc, proto = 'http', hostname = 'localhost', port = ATEK_HOST_PORT)  {
  const qp = (new URLSearchParams(desc)).toString()
  return `${proto}://${hostname}:${port}/_atek/gateway?${qp}`
}

export function ws (desc: string|ApiDesc, proto = 'ws', hostname = 'localhost', port = ATEK_HOST_PORT) {
  if (typeof desc === 'string') desc = {api: desc}
  return websocket(getUrl(desc, proto, hostname, port))
}

export function rpc<T = UnknownApi>(desc: string|ApiDesc, proto = 'http', hostname = 'localhost', port = ATEK_HOST_PORT) {
  if (typeof desc === 'string') desc = {api: desc}
  const client = new AtekRpcClient(desc, proto, hostname, port)
  return new Proxy<any>({}, {
    get (obj: object, name: string) {
      if (name === '$setEndpoint') {
        return client.$setEndpoint.bind(client)
      } else if (name === '$rpc') {
        return client.$rpc.bind(client)
      } else if (name === '$url') {
        return client.$url
      } else if (name === '$desc') {
        return client.$desc
      } else {
        return (...params: any[]) => client.$rpc(name, params)
      }
    }
  }) as (T & AtekRpcClient)
}

let _id = 1
export class AtekRpcClient {
  $url: string
  $desc: ApiDesc

  constructor (desc: ApiDesc, proto = 'http', hostname = 'localhost', port = ATEK_HOST_PORT) {
    this.$desc = desc
    this.$url = getUrl(desc, proto, hostname, port)
  }

  $setEndpoint (opts: {proto?: string, hostname?: string, port?: number}) {
    this.$url = getUrl(this.$desc, opts.proto, opts.hostname, opts.port)
  }

  async $rpc (methodName: string, params: any[] = []): Promise<any> {
    const responseBody = await (await fetch(this.$url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(jsonrpc.request(_id++, methodName, removeUndefinedsAtEndOfArray(params)))
    })).json()
    const parsed = jsonrpc.parseObject(responseBody)
    if (parsed.type === 'error') {
      throw new RpcError(parsed.payload.error)
    } else if (parsed.type === 'success') {
      return parsed.payload.result
    }
  }
}

function removeUndefinedsAtEndOfArray (arr: any[]) {
  let len = arr.length
  for (let i = len - 1; i >= 0; i--) {
    if (typeof arr[i] === 'undefined') len--
    else break
  }
  return arr.slice(0, len)
}