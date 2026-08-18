export type PerfumeLine = 'hombre' | 'mujer';

export interface Perfume {
  readonly slug: string;
  readonly name: string;
  readonly brand: string;
  readonly line: PerfumeLine;
  readonly family: string;
  readonly notes: readonly string[];
  readonly sizeMl: number;
  readonly priceBob: number;
  readonly concentration: string;
  readonly summary: string;
  readonly description: string;
  readonly featured: boolean;
  readonly photo?: string;
}

export interface LineProfile {
  readonly line: PerfumeLine;
  readonly path: string;
  readonly label: string;
  readonly descriptor: string;
  readonly sloganLead: string;
  readonly slogan: string;
  readonly lede: string;
  readonly metaDescription: string;
  readonly rosegold: boolean;
}
