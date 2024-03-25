import { COSOptions } from 'cos-nodejs-sdk-v5';

declare global {
  namespace Tencent {
    interface Struct extends Endpoint.Struct {
      name: string;
      domain: string;
    }

    interface Options extends COSOptions {
      Bucket: string;
      Region: string;
    }
  }
}

export {};
