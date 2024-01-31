import 'ali-oss';

declare module 'ali-oss' {
  interface Options {
    // The official does not provide a type declaration, see:
    // https://github.com/ali-sdk/ali-oss/blob/master/lib/common/client/initOptions.js#L49

    /**
     * used by auto retry send request count when request error is net error or timeout.
     *
     * ___NOTE:___ Not support `put` with stream, `putStream`, `append` with stream because
     * the stream can only be consumed once
     */
    retryMax?: number;
  }
}
