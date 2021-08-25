import websocket from 'websocket-stream'
import { URLSearchParams } from 'url'
import fetch from 'node-fetch'
import * as jsonrpc from 'jsonrpc-lite'

const ATEK_HOST_PORT: number = Number(process.env.ATEK_HOST_PORT) || 0

interface ApiDesc {
  [key: string]: string
}

export function getUrl (desc: ApiDesc, proto = 'http', hostname = 'localhost', port = ATEK_HOST_PORT)  {
  const qp = (new URLSearchParams(desc)).toString()
  return `${proto}://${hostname}:${port}/_api/gateway?${qp}`
}

export function createWsProxy (desc: ApiDesc, proto = 'ws', hostname = 'localhost', port: number = ATEK_HOST_PORT) {
  return websocket(getUrl(desc, proto, hostname, port))
}

let _id = 1
export class AtekRpcClient {
  _url: string
  _apiId: string

  constructor (apiId: string) {
    this._apiId = apiId
    this._url = getUrl({api: apiId})
  }

  $setEndpoint (opts: {desc?: ApiDesc, proto?: string, hostname?: string, port?: number}) {
    opts.desc = opts.desc || {}
    if (!opts.desc.api) opts.desc.api = this._apiId
    this._url = getUrl(opts.desc, opts.proto, opts.hostname, opts.port)
  }

  async _rpc (methodName: string, params: any[] = []): Promise<any> {
    const responseBody = await (await fetch(this._url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(jsonrpc.request(_id++, methodName, removeUndefinedsAtEndOfArray(params)))
    })).json()
    const parsed = jsonrpc.parseObject(responseBody)
    if (parsed.type === 'error') {
      throw parsed.payload.error
    } else if (parsed.type === 'success') {
      return parsed.payload.result
    }
  }

  _subscribe (params: any[] = []): any {
    // TODO
    return undefined
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