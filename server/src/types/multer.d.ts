declare module "multer" {
  import { RequestHandler } from "express";

  interface File {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer: Buffer;
  }

  interface Options {
    storage?: any;
    limits?: any;
    fileFilter?: any;
  }

  interface FieldDef {
    name: string;
    maxCount?: number;
  }

  interface MulterInstance {
    single(fieldname: string): RequestHandler;
    array(fieldname: string, maxCount?: number): RequestHandler;
    fields(fields: FieldDef[]): RequestHandler;
    none(): RequestHandler;
  }

  interface MulterStatic {
    (options?: Options): MulterInstance;
    memoryStorage(): any; // support in-memory storage
    diskStorage?(opts: any): any;
  }

  const multer: MulterStatic;
  export default multer; // allow: import multer from 'multer'
}