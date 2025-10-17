import { searchArchive } from './archive.js';

export async function searchProviders({ title, year, type }) {
  const results = [];
  // Archive.org (legal public domain)
  try { results.push(...await searchArchive({ title, year, type })); } catch {}
  return results;
}

