export const META_DESCRIPTION_MAX = 160;

export interface PerfumeMeta {
  readonly summary: string;
  readonly concentration: string;
  readonly sizeMl: number;
  readonly priceBob: number;
}

export function metaDescriptionOf(perfume: PerfumeMeta): string {
  return `${perfume.summary} ${perfume.concentration} de ${perfume.sizeMl} ml por Bs ${perfume.priceBob} en Cochabamba.`;
}
