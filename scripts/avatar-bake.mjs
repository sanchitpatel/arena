import { createAvatar } from '@dicebear/core';
import { lorelei } from '@dicebear/collection';
import fs from 'node:fs';

export const USER_PICKS = [
  "lorelei-1",
  "lorelei-3",
  "lorelei-5",
  "lorelei-6",
  "lorelei-8",
  "lorelei-20",
  "lorelei-16",
  "lorelei-21",
  "lorelei-25",
  "lorelei-30",
  "lorelei-32",
  "lorelei-38",
  "lorelei-40",
  "lorelei-52",
  "lorelei-54",
  "lorelei-64",
  "lorelei-49",
  "lorelei-44",
  "lorelei-58",
  "lorelei-59",
  "lorelei-72",
  "lorelei-74",
  "lorelei-93",
  "lorelei-87",
  "lorelei-106",
  "lorelei-104",
  "lorelei-118",
  "lorelei-145",
  "lorelei-135",
  "lorelei-138"
];

const BG = ['d8f3ff', 'b6e3f4', 'c7d2fe', 'e0f2fe', 'f1f5f9'];

export function bakeAvatars(picks = USER_PICKS) {
  fs.mkdirSync('public/avatars', { recursive: true });

  const manifest = [];
  picks.forEach((seed, i) => {
    const id = i + 1;
    const svg = createAvatar(lorelei, { seed, backgroundColor: BG, radius: 50 }).toString();
    fs.writeFileSync(`public/avatars/${id}.svg`, svg);
    manifest.push({
      id: id,
      seed: seed,
      url: `/avatars/${id}.svg`
    });
  });

  fs.writeFileSync('public/avatars/index.json', JSON.stringify(manifest, null, 2));
  console.log(`Successfully baked ${picks.length} avatars into public/avatars/ and generated public/avatars/index.json`);
}

bakeAvatars();
