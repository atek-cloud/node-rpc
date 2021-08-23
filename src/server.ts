import http from 'http'
import { SomeJSONSchema, ExportMap, getMethod, assertParamsValid, assertResponseValid, ParamValidationError, ResponseValidationError, GeneralError } from '@atek-cloud/api-broker'
import * as jsonrpc from 'jsonrpc-lite'

export type AtekRpcServerHandlers = {
  [key: string]: (...params: any[]) => any
}

export class AtekRpcServer {
  schema: SomeJSONSchema
  exportMap: ExportMap
  handlers: AtekRpcServerHandlers

  constructor (schema: SomeJSONSchema, exportMap: ExportMap, handlers: AtekRpcServerHandlers) {
    this.schema = schema
    this.exportMap = exportMap
    this.handlers = generateServerMethods(schema, exportMap, handlers)
  }

  async handle (req: http.IncomingMessage, res: http.ServerResponse, body: object) {
    const parsed = jsonrpc.parseObject(body)
    if (parsed.type === 'error') {
      return res.writeHead(200, {'Content-Type': 'application/json'}).end(JSON.stringify(parsed.payload))
    } else if (parsed.type === 'request') {
      try {
        const params = Array.isArray(parsed.payload.params) ? parsed.payload.params : []
        const apiRes = await this.handlers[parsed.payload.method](params)
        const rpcRes = jsonrpc.success(parsed.payload.id, apiRes || 0)
        return res.writeHead(200, {'Content-Type': 'application/json'}).end(JSON.stringify(rpcRes))
      } catch (e) {
        const rpcErr = e instanceof jsonrpc.JsonRpcError ? e : new jsonrpc.JsonRpcError(e.message || e.toString(), e.code || -32000, e.data)
        return res.writeHead(200, {'Content-Type': 'application/json'}).end(JSON.stringify(jsonrpc.error(parsed.payload.id, rpcErr)))
      }
    } else {
      return res.writeHead(200, {'Content-Type': 'application/json'}).end(JSON.stringify({}))
    }
  }
}

function generateServerMethods (schema: SomeJSONSchema, exportMap: ExportMap, handlers: AtekRpcServerHandlers): AtekRpcServerHandlers {
  const methods: AtekRpcServerHandlers = {}

  for (const methodName in handlers) {
    const methodDef = getMethod(schema, exportMap, methodName)

    methods[methodName] = async (params: any[]): Promise<any> => {
      try {
        // if (methodDef.params) assertParamsValid(methodDef.params, params) TODO
        // else if (params.length) throw new Error(`Invalid parameter: ${methodName} takes no arguments`)
        const response = await handlers[methodName](...params)
        // if (methodDef.response) assertResponseValid(methodDef.response, response) TODO
        // else if (typeof response !== 'undefined') throw new Error(`Invalid response: ${methodName} has no response`)
        return response
      } catch (e) {
        if (e instanceof ParamValidationError) throw e
        if (e instanceof ResponseValidationError) throw e
        throw new GeneralError(e.message || e.toString())
      }
    }
  }

  return methods
}
