import { AtekRpcClient } from './client.js'

export class AtekDbRecordClient<T extends object> {
  api: AtekDbApiClient
  dbId: string
  tableId: string
  revision: number|undefined
  templates: any
  schema: any
  
  constructor (api: AtekDbApiClient, dbId: string, tableId: string, revision: number|undefined, templates: TableTemplates, schema: any) {
    this.api = api
    this.dbId = dbId
    this.tableId = tableId
    this.revision = revision
    this.templates = templates
    this.schema = schema
  }

  async register () {
    await this.api.table(this.dbId, this.tableId, {
      revision: this.revision,
      templates: this.templates,
      definition: this.schema
    })
  }

  list (opts?: ListOpts): Promise<{records: Record<T>[]}> {
    return this.api.list(this.dbId, this.tableId, opts) as Promise<{records: Record<T>[]}>
  }

  get (key: string): Promise<Record<T>> {
    return this.api.get(this.dbId, this.tableId, key) as Promise<Record<T>>
  }

  create (value: object, blobs?: BlobMap): Promise<Record<T>> {
    return this.api.create(this.dbId, this.tableId, value, blobs) as Promise<Record<T>>
  }

  put (key: string, value: object): Promise<Record<T>> {
    return this.api.put(this.dbId, this.tableId, key, value) as Promise<Record<T>>
  }
  
  delete (key: string): Promise<void> {
    return this.api.delete(this.dbId, this.tableId, key)
  }
  
  diff (opts: {left: number, right?: number}): Promise<Diff[]> {
    return this.api.diff(this.dbId, {left: opts.left, right: opts.right, tableIds: [this.tableId]})
  }

  getBlob (key: string, blobName: string): Promise<Blob> {
    return this.api.getBlob(this.dbId, this.tableId, key, blobName)
  }
  
  putBlob (key: string, blobName: string, blobValue: BlobDesc): Promise<void> {
    return this.api.putBlob(this.dbId, this.tableId, key, blobName, blobValue)
  }
  
  delBlob (key: string, blobName: string): Promise<void> {
    return this.api.delBlob(this.dbId, this.tableId, key, blobName)
  }
}

export interface AtekDbApiClient extends AtekRpcClient {
  table (dbId: string, tableId: string, desc: TableSettings): Promise<TableDescription>
  list (dbId: string, tableId: string, opts?: ListOpts): Promise<{records: Record[]}>
  get (dbId: string, tableId: string, key: string): Promise<Record>
  create (dbId: string, tableId: string, value: object, blobs?: BlobMap): Promise<Record>
  put (dbId: string, tableId: string, key: string, value: object): Promise<Record>
  delete (dbId: string, tableId: string, key: string): Promise<void>
  diff (dbId: string, opts: {left: number, right?: number, tableIds?: string[]}): Promise<Diff[]>
  getBlob (dbId: string, tableId: string, key: string, blobName: string): Promise<Blob>
  putBlob (dbId: string, tableId: string, key: string, blobName: string, blobValue: BlobDesc): Promise<void>
  delBlob (dbId: string, tableId: string, key: string, blobName: string): Promise<void>
}

export interface TableTemplates {
  table?: {
    title?: string
    description?: string
  },
  record?: {
    key?: string
    title?: string
    description?: string
  }
}

export interface TableSettings {
  revision?: number
  templates?: TableTemplates
  definition?: object
}

export interface TableDescription extends TableSettings {
  tableId: string
}

export interface Record<T = object> {
  key: string
  path: string
  url: string
  seq?: number
  value: T | null | undefined
}

export interface BlobMap {
  [blobName: string]: BlobDesc
}

export interface BlobDesc {
  mimeType?: string
  buf: Uint8Array
}

export interface Blob {
  start: number
  end: number
  mimeType?: string
  buf: Uint8Array
}

export interface Diff {
  left: Record
  right: Record
}

export interface ListOpts {
  lt?: string
  lte?: string
  gt?: string
  gte?: string
  limit?: number
  reverse?: boolean
}