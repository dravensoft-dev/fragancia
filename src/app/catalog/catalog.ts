import { Injectable } from '@angular/core';
import { LINES, PERFUMES } from './perfumes.data';
import { LineProfile, Perfume, PerfumeLine } from './perfume.model';

@Injectable({ providedIn: 'root' })
export class Catalog {
  lines(): readonly LineProfile[] {
    return LINES;
  }

  lineProfile(line: PerfumeLine): LineProfile | undefined {
    return LINES.find((profile) => profile.line === line);
  }

  byLine(line: PerfumeLine): readonly Perfume[] {
    return PERFUMES.filter((perfume) => perfume.line === line);
  }

  bySlug(line: PerfumeLine, slug: string): Perfume | undefined {
    return PERFUMES.find((perfume) => perfume.line === line && perfume.slug === slug);
  }

  featured(): readonly Perfume[] {
    return PERFUMES.filter((perfume) => perfume.featured);
  }

  all(): readonly Perfume[] {
    return PERFUMES;
  }
}
