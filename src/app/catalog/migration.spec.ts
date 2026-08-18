import { LINES as SOURCE_LINES, PERFUMES as SOURCE_PERFUMES } from './perfumes.data';
import { LINES, PERFUMES } from './perfumes.generated';

describe('the generated catalogue', () => {
  it('carries the same lines, in the same order', () => {
    expect(LINES).toEqual(SOURCE_LINES);
  });

  it('carries the same perfumes, in the same order', () => {
    expect(PERFUMES).toEqual(SOURCE_PERFUMES);
  });
});
