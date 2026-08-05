import { makeAutoObservable, runInAction } from 'mobx';

export class Request<R extends unknown[]> {
  public loading = false;
  public loadingMessage = '';

  public error = '';
  private defaultError = '';

  public data;
  private request;

  constructor(
    request: (...args: any) => Promise<R>,
    options: {
      initialData: R;
      defaultError: string;
      loadingMessage: string;
    },
  ) {
    this.defaultError = options.defaultError;
    this.loadingMessage = options.loadingMessage;
    this.data = options.initialData;
    this.request = request;
    makeAutoObservable(this);
  }

  public async fetch(...args: Parameters<typeof this.request>) {
    try {
      this.loading = true;
      this.error = '';

      const data = await this.request(...args);

      runInAction(() => {
        this.data = data;
        this.loading = false;
      });
    } catch (err) {
      runInAction(() => {
        this.error =
          (err instanceof Error && err.message) ||
          this.defaultError ||
          'Something went wrong, try again later';
        this.loading = false;
      });
    }
    return this.data;
  }

  public get hasData() {
    return this.data.length > 0 && !this.loading;
  }
}
