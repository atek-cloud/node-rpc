import * as jsonrpc from 'jsonrpc-lite'
import Ajv, { ValidateFunction } from 'ajv'
import addFormats from 'ajv-formats'
export const ajv = new Ajv({strict: false})
addFormats(ajv)

export type SomeJSONSchema = any // TODO ajv has a definition but it's been hard to work with

export function assertParamsValid (validate: ValidateFunction, params: any[]): void {
  const valid = validate(params)
  if (!valid) {
    const msg = `Parameter ${Number(validate.errors?.[0].instancePath.slice(1)) + 1} ${validate.errors?.[0].message}`
    throw new ParamValidationError(msg, validate.errors?.[0])
  }
}

export function assertResponseValid (validate: ValidateFunction, response: any): void {
  const valid = validate(response)
  if (!valid) {
    const msg = `Response ${validate.errors?.[0].schemaPath.slice(2)} ${validate.errors?.[0].message}`
    throw new ResponseValidationError(msg, validate.errors?.[0])
  }
}

export class CustomError extends Error {
  name: string;
  code: number;
  data: any;

  constructor(code: number, message: string, data?: any) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.data = data;
  }
}

export class ServiceNotFound extends CustomError {
  static CODE = -32601; // we're using JSON-RPC's code for this
  constructor (msg: string, data?: any) {
    super(ServiceNotFound.CODE, msg, data)
  }
}

export class MethodNotFound extends CustomError {
  static CODE = -32601; // we're using JSON-RPC's code for this
  constructor (msg: string, data?: any) {
    super(MethodNotFound.CODE, msg, data)
  }
}

export class ParamValidationError extends CustomError {
  static CODE = -32001;
  constructor (msg: string, data?: any) {
    super(ParamValidationError.CODE, msg, data)
  }
}

export class ResponseValidationError extends CustomError {
  static CODE = -32002;
  constructor (msg: string, data?: any) {
    super(ResponseValidationError.CODE, msg, data)
  }
}

export class GeneralError extends CustomError {
  static CODE = -32003;
  constructor (msg: string, data?: any) {
    super(GeneralError.CODE, msg, data)
  }
}

export class RpcError extends CustomError {
  constructor (jsonRpcError: jsonrpc.JsonRpcError) {
    super(jsonRpcError.code, jsonRpcError.message, jsonRpcError.data)
  }
}