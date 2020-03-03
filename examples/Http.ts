import fetch from "isomorphic-fetch";

export interface HttpErrorInput {
  message: string;
  statusCode: number;
  response?: Response;
  body?: any;
}

export class HttpError extends Error {
  statusCode: number;
  response?: Response;
  body?: any;

  constructor(input: HttpErrorInput) {
    super(input.message);
    this.response = input.response;
    this.statusCode = input.statusCode;
    this.body = input.body;
    this.name = "HttpError";
  }
}

export type AbortFunction = () => void;
type Token = string | undefined;
type RequestFn = <T = any, I = any>(url: string, data: I, config?: RequestConfig) => Promise<T>;
type RequestGetFn = <T = any, I = any>(url: string, data?: I, config?: RequestConfig) => Promise<T>;
type BeforeHook = (client: HttpClient) => Promise<void> | void;
type ErrorHook = <T = any>(err: HttpError, request: Promise<T>) => any;
type HttpClientInit = RequestInit & {
  baseUrl?: string;
  returnType?: "json" | "text" | "blob";
  /**  This function is called before every request. This is where you would check if your token is still valid */
  beforeHook?: BeforeHook;
  /** Function that is called if an error occurs */
  onError?: ErrorHook;
};

export type RequestConfig = HttpClientInit & {
  createAbort?: (abortFunction: AbortFunction) => void;
};

/**
 * Wrapper around fetch
 */
export class HttpClient {
  private defaultConfig: RequestConfig = {
    returnType: "json",
    headers: {
      "Content-Type": "application/json",
    },
  };

  private config: RequestConfig = {};
  private token: Token;

  constructor(config: HttpClientInit = {}) {
    this.config = {
      ...this.defaultConfig,
      ...config,
    };
  }

  /**
   *
   *
   * @private
   * @param {'GET'} method
   * @returns {RequestGetFn}
   * @memberof HttpClient
   */
  private createRequest(method: "GET"): RequestGetFn;
  private createRequest(method: string): RequestFn;
  private createRequest(method: "GET" | string): RequestFn {
    return (url, data, config) => {
      if (method === "GET") {
        const getUrl = new URL(url);
        if (data) {
          Object.entries(data).forEach(([key, value]) => getUrl.searchParams.append(key, value));
        }
        return this.request(getUrl, {
          ...config,
          method: "GET",
        });
      }

      const contentType = config && config.headers && (config.headers as any)["Content-Type"];

      return this.request(url, {
        ...config,
        method,
        body: this.createBody(data, contentType),
      });
    };
  }

  public get = this.createRequest("GET");
  public post = this.createRequest("POST");
  public put = this.createRequest("PUT");
  public patch = this.createRequest("PATCH");
  public delete = this.createRequest("DELETE");

  public setToken = (token: Token) => (this.token = token);

  private setAuthenticationHeaders(config: RequestConfig) {
    // if authenticated set bearer token
    if (this.token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${this.token}`,
      };
    }
  }

  /**
   *
   *
   * @private
   * @memberof HttpClient
   */
  private setAbortController = (config: RequestConfig) => {
    const { createAbort } = config;
    if (createAbort) {
      if (typeof AbortController !== undefined) {
        const controller = new AbortController();
        const { signal } = controller;
        config.signal = signal;
        createAbort(controller.abort.bind(controller));
      } else {
        createAbort(() => console.log("The AbortController api isnt available in your browser"));
      }
    }
  };

  /**
   *
   *
   * @template T
   * @param {(string | URL)} url
   * @param {RequestConfig} [requestConfig={}]
   * @returns {Promise<T>}
   * @memberof HttpClient
   */
  public async request<T>(url: string | URL, requestConfig: RequestConfig = {}): Promise<T> {
    const { beforeHook } = this.config;

    const config: RequestConfig = {
      ...this.config,
      ...requestConfig,
    };

    const { baseUrl = "" } = config;

    this.setAbortController(config);

    if (beforeHook) {
      await beforeHook(this);
    }

    this.setAuthenticationHeaders(config);

    const requestFn = fetch(baseUrl + url, config)
      .then(this.handleError)
      .then(res => this.handleSuccess(res, config)) as Promise<T>;

    return requestFn.catch(err => this.onError<T>(err, requestFn));
  }

  /**
   *
   *
   * @private
   * @param {Response} res
   * @param {RequestConfig} config
   * @returns
   * @memberof HttpClient
   */
  private handleSuccess(res: Response, config: RequestConfig) {
    const { returnType = "json" } = config;

    if (res.status === 204 || res.status === 201) {
      return res;
    }

    return res[returnType]();
  }

  /**
   *
   *
   * @private
   * @template T
   * @param {HttpError} err
   * @param {Promise<T>} requestFn
   * @returns
   * @memberof HttpClient
   */
  private async onError<T = any>(err: HttpError, requestFn: Promise<T>) {
    const { onError } = this.config;

    if (onError) {
      return onError(err, requestFn);
    }

    throw err;
  }

  /**
   * createBody is responsible for creating a body based on the content type
   *
   * @param body The body
   * @param contentType The content type
   */
  private createBody(body: any, contentType: string): any {
    switch (contentType) {
      case "application/json":
        return JSON.stringify(body);
      case "application/x-www-form-urlencoded":
        return new URLSearchParams(body);
      default:
        return JSON.stringify(body);
    }
  }

  /**
   * Handles the errors if the fetch request fails and throws a HttpError
   * @param response
   */
  private async handleError(response: Response) {
    if (response.ok) {
      return response;
    }

    const responseBody = await response.text();
    let body: any = response;

    try {
      body = JSON.parse(responseBody);
    } catch (err) {
      body = responseBody;
    }

    const error = {
      message: `HttpError: ${response.status} - ${response.statusText}`,
      statusCode: response.status,
      response,
      body,
    };

    console.error(error);
    throw new HttpError(error);
  }
}
