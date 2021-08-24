import { SomeJSONSchema, ExportMap, getMethod, assertParamsValid, assertResponseValid } from '@atek-cloud/api-broker'
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
  _schema: SomeJSONSchema
  _exportMap: ExportMap

  constructor (apiId: string, schema: SomeJSONSchema, exportMap: ExportMap) {
    this._apiId = apiId
    this._schema = schema
    this._exportMap = exportMap
    this._url = getUrl({api: apiId})
  }

  $setEndpoint (opts: {desc?: ApiDesc, proto?: string, hostname?: string, port?: number}) {
    opts.desc = opts.desc || {}
    if (!opts.desc.api) opts.desc.api = this._apiId
    this._url = getUrl(opts.desc, opts.proto, opts.hostname, opts.port)
  }

  async _rpc (methodName: string, params: any[] = []): Promise<any> {
    const methodDef = getMethod(this._schema, this._exportMap, methodName)
    // if (methodDef.params) assertParamsValid(methodDef.params, params) TODO
    // else if (params.length) throw new Error(`Invalid parameter: ${methodName} takes no arguments`)
    const responseBody = await (await fetch(this._url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(jsonrpc.request(_id++, methodName, params))
    })).json()
    const parsed = jsonrpc.parseObject(responseBody)
    if (parsed.type === 'error') {
      throw parsed.payload.error
    } else if (parsed.type === 'success') {
      // if (methodDef.response) assertResponseValid(methodDef.response, response) TODO
      // else if (typeof response !== 'undefined') throw new Error(`Invalid response: ${methodName} has no response`)
      return parsed.payload.result
    }
  }

  _subscribe (params: any[] = []): any {
    // TODO
    return undefined
  }
}