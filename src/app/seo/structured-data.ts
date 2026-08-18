import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
} from '@angular/core';

@Component({
  selector: 'app-structured-data',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: none' },
  template: '',
})
export class StructuredData {
  private readonly document = inject(DOCUMENT);

  readonly key = input.required<string>();
  readonly schema = input.required<Record<string, unknown>>();

  constructor() {
    effect(() => {
      const element = this.resolveElement(this.key());
      element.textContent = serialize(this.schema());
    });

    inject(DestroyRef).onDestroy(() => {
      this.document.head.querySelector(selectorFor(this.key()))?.remove();
    });
  }

  private resolveElement(key: string): HTMLScriptElement {
    const existing = this.document.head.querySelector<HTMLScriptElement>(selectorFor(key));

    if (existing) {
      return existing;
    }

    const created = this.document.createElement('script');
    created.type = 'application/ld+json';
    created.setAttribute('data-schema', key);
    this.document.head.appendChild(created);

    return created;
  }
}

function selectorFor(key: string): string {
  return `script[type="application/ld+json"][data-schema="${key}"]`;
}

function serialize(schema: Record<string, unknown>): string {
  return JSON.stringify(schema).replace(/</g, '\\u003c');
}
