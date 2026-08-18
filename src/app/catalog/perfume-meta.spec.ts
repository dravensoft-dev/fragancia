import { META_DESCRIPTION_MAX, metaDescriptionOf } from './perfume-meta';

describe('metaDescriptionOf', () => {
  it('appends the concentration, the size and the price to the summary', () => {
    expect(
      metaDescriptionOf({
        summary: 'Orquídea y vainilla, dulce y reconocible.',
        concentration: 'Eau de parfum',
        sizeMl: 100,
        priceBob: 290,
      }),
    ).toBe(
      'Orquídea y vainilla, dulce y reconocible. Eau de parfum de 100 ml por Bs 290 en Cochabamba.',
    );
  });

  it('caps the description at what a search result shows', () => {
    expect(META_DESCRIPTION_MAX).toBe(160);
  });
});
