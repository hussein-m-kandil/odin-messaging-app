import { Injectable } from '@angular/core';

const DEFAULT_STORAGE_ERR_MSG = 'Unexpected local storage error occurred';

@Injectable({
  providedIn: 'root',
})
export class AppStorage {
  private _useStorageSafely<T>(fn: () => T): [T | null, unknown] {
    let result: T;
    try {
      result = fn();
    } catch (error) {
      console.error(error instanceof Error ? error.message : DEFAULT_STORAGE_ERR_MSG, error);
      return [null, error];
    }
    return [result, null];
  }

  setItem(key: string, value: string) {
    this._useStorageSafely(() => localStorage.setItem(key, value));
  }

  getItem(key: string) {
    const [result] = this._useStorageSafely(() => localStorage.getItem(key));
    return result;
  }

  removeItem(key: string) {
    this._useStorageSafely(() => localStorage.removeItem(key));
  }
}
