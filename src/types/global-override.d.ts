declare global {
  interface Body {
    json(): Promise<any>;
  }
  interface Request {
    json(): Promise<any>;
  }
  interface Response {
    json(): Promise<any>;
  }
}

export {};
