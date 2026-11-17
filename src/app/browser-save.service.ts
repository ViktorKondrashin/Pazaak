import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';
import {
  decodeSavedCookie,
  defaultSavedProgress,
  encodeSavedCookie,
  SavedProgress,
  validateSavedProgress,
} from './core/saved-progress';

@Injectable({ providedIn: 'root' })
export class BrowserSaveService {
  constructor(@Inject(DOCUMENT) private readonly document: Document = globalThis.document) {}

  load(): SavedProgress {
    try {
      return decodeSavedCookie(this.document?.cookie ?? '');
    } catch {
      return defaultSavedProgress();
    }
  }

  update(changes: Partial<Omit<SavedProgress, 'version'>>): void {
    const previous = this.load();
    const saved = validateSavedProgress({
      ...previous,
      ...changes,
      // A tab opened earlier must not remove victories already saved by another tab.
      completed: Math.max(previous.completed, changes.completed ?? previous.completed),
    });
    try {
      if (this.document)
        this.document.cookie = encodeSavedCookie(saved, this.document.location?.protocol === 'https:');
    } catch {
      /* Unavailable cookies must not prevent play or changing preferences. */
    }
  }
}
