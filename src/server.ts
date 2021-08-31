import http from 'http'
import { SomeJSONSchema, ExportMap, Ajv, compileSchema, getMethod, assertParamsValid, assertResponseValid, ParamValidationError, ResponseValidationError, GeneralError } from '@atek-cloud/api-broker'
import * as jsonrpc from 'jsonrpc-lite'

export type AtekRpcServerHandlers = {
  [key: string]: (...params: any[]) => any
}

export class AtekRpcServer {
  schema: SomeJSONSchema|undefined
  ajv: Ajv|undefined
  exportMap: ExportMap|undefined
  handlers: AtekRpcServerHandlers

  constructor (handlers: AtekRpcServerHandlers, schema: SomeJSONSchema|undefined, exportMap: ExportMap|undefined) {
    this.schema = schema
    this.ajv = schema ? compileSchema(schema) : undefined
    this.exportMap = exportMap
    this.handlers = generateServerMethods(this.ajv, exportMap, handlers)
  }

  async handle (req: http.IncomingMessage, res: http.ServerResponse, body: object) {
    const parsed = jsonrpc.parseObject(body)
    if (parsed.type === 'error') {
      return res.writeHead(200, {'Content-Type': 'application/json'}).end(JSON.stringify(parsed.payload))
    } else if (parsed.type === 'request') {
      try {
        const params = Array.isArray(parsed.payload.params) ? parsed.payload.params : []
        let apiRes = await this.handlers[parsed.payload.method](params)
        if (typeof apiRes === 'undefined') apiRes = 0
        const rpcRes = jsonrpc.success(parsed.payload.id, apiRes)
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

function generateServerMethods (ajv: Ajv|undefined, exportMap: ExportMap|undefined, handlers: AtekRpcServerHandlers): AtekRpcServerHandlers {
  const methods: AtekRpcServerHandlers = {}

  for (const methodName in handlers) {
    const methodDef = ajv && exportMap ? getMethod(ajv, exportMap, methodName) : undefined

    methods[methodName] = async (params: any[]): Promise<any> => {
      let response
      try {
        if (methodDef?.params) assertParamsValid(methodDef.params, params)
        else if (methodDef && params.length) throw new ParamValidationError(`Invalid parameter: ${methodName} takes no arguments`)
        response = await handlers[methodName](...params)
        if (typeof response === 'undefined') response = null
        if (methodDef?.returns) assertResponseValid(methodDef.returns, response)
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
