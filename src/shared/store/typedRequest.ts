import { makeAutoObservable, runInAction } from 'mobx';

export class TypedRequest<R> {
  public loading = false;
  public loadingMessage = '';

  public error = '';
  private defaultError = '';

  public data: R;
  private request: (...args: any[]) => Promise<R>;

  constructor(
    request: (...args: any[]) => Promise<R>,
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

  public async fetch(...args: any[]) {
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
    if (Array.isArray(this.data)) {
      return this.data.length > 0 && !this.loading;
    }
    return this.data != null && this.data !== '' && !this.loading;
  }
}
