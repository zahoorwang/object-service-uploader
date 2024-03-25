declare global {
  namespace Ali {
    interface Struct extends Endpoint.Struct {
      endpoint: string;
      internal: string;
    }
  }
}

export {};
