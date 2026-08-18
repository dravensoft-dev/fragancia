import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-brand-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: block', 'aria-hidden': 'true' },
  template: `
    <svg
      viewBox="0 0 240 240"
      width="100%"
      height="100%"
      fill="none"
      stroke="currentColor"
      stroke-width="4.5"
      stroke-linejoin="miter"
      focusable="false"
    >
      <rect x="103" y="29" width="34" height="29" rx="3" />
      <circle cx="120" cy="43.5" r="5.4" fill="currentColor" stroke="none" />
      <rect x="99.5" y="62" width="41" height="7" fill="currentColor" stroke="none" />
      <polyline points="98,202 120,224 142,202" />
      <polyline points="109,202 120,213 131,202" stroke-width="3" />
      <polyline points="56,106 24,138 56,170" />
      <polyline points="56,122 40,138 56,154" stroke-width="3" />
      <polyline points="184,106 216,138 184,170" />
      <polyline points="184,122 200,138 184,154" stroke-width="3" />
      <rect x="56" y="74" width="128" height="128" />
      <text
        x="121"
        y="180"
        text-anchor="middle"
        font-size="122"
        font-weight="600"
        fill="currentColor"
        stroke="none"
        style="font-family: var(--ff-heading)"
      >
        F
      </text>
    </svg>
  `,
  styles: `
    svg {
      display: block;
      overflow: visible;
    }
  `,
})
export class BrandMark {}
