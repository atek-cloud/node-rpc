import http from 'http'
import { ajv, assertParamsValid, assertResponseValid, ParamValidationError, ResponseValidationError, GeneralError } from './types.js'
import * as jsonrpc from 'jsonrpc-lite'

export type AtekRpcServerHandlers = {
  [key: string]: (...params: any[]) => any
}

export interface AtekRpcServerValidators {
  [key: string]: {
    params?: object[]
    response?: object
  }
}

export function createRpcServer (handlers: AtekRpcServerHandlers, validators?: AtekRpcServerValidators) {
  return new AtekRpcServer(handlers, validators)
}

export class AtekRpcServer {
  handlers: AtekRpcServerHandlers
  validators: AtekRpcServerValidators|undefined

  constructor (handlers: AtekRpcServerHandlers, validators: AtekRpcServerValidators|undefined) {
    this.handlers = generateServerMethods(handlers, validators)
    this.validators = validators
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
      } catch (e: any) {
        const rpcErr = e instanceof jsonrpc.JsonRpcError ? e : new jsonrpc.JsonRpcError(e.message || e.toString(), e.code || -32000, e.data)
        return res.writeHead(200, {'Content-Type': 'application/json'}).end(JSON.stringify(jsonrpc.error(parsed.payload.id, rpcErr)))
      }
    } else {
      return res.writeHead(200, {'Content-Type': 'application/json'}).end(JSON.stringify({}))
    }
  }
}

function generateServerMethods (handlers: AtekRpcServerHandlers, validators: AtekRpcServerValidators|undefined): AtekRpcServerHandlers {
  const methods: AtekRpcServerHandlers = {}

  for (const methodName in handlers) {
    const methodDef = validators?.[methodName]
    const methodParams = methodDef?.params?.map?.(getSchemas)
    const methodParamsValidate = methodParams ? ajv.compile({type: 'array', items: methodParams}) : undefined
    const methodResponse = methodDef?.response ? getSchemas(methodDef?.response) : undefined
    const methodResponseValidate = methodResponse ? ajv.compile(methodResponse) : undefined

    methods[methodName] = async (params: any[]): Promise<any> => {
      let response
      try {
        if (methodParamsValidate) assertParamsValid(methodParamsValidate, params)
        response = await handlers[methodName](...params)
        if (typeof response === 'undefined') response = null
        if (methodResponseValidate) assertResponseValid(methodResponseValidate, response)
        return response
      } catch (e: any) {
        if (e instanceof ParamValidationError) throw e
        if (e instanceof ResponseValidationError) throw e
        throw new GeneralError(e.message || e.toString())
      }
    }
  }

  return methods
}

// convert any classes with a static .schema obj into their schema
function getSchemas (obj: any): object {
  if (typeof obj === 'function') {
    if (obj.schema && typeof obj.schema === 'object') return obj.schema
    throw new Error(`Invalid schema definition: ${obj}`)
  }
  if (typeof obj === 'object') {
    return obj
  }
  throw new Error(`Invalid schema definition: ${obj}`)
}