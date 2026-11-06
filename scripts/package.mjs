// A small dependency-free ZIP writer for the source-and-build handoff.
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { deflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import path from 'node:path';

const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
const prefix = `Pure-Pazaak-${manifest.version}`;
const roots = ['src', 'scripts', 'server', 'deploy', 'docs', 'dist/pazaak', 'dist/server'];
const files = [
  'package.json',
  'package-lock.json',
  'angular.json',
  'tsconfig.json',
  'tsconfig.app.json',
  'README.md',
  'Start-Pazaak.cmd',
  '.gitignore',
  '.editorconfig',
  'proxy.conf.json',
];

function collect(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const filename = path.posix.join(folder, entry.name);
    if (entry.isDirectory()) collect(filename);
    else if (entry.isFile()) files.push(filename);
  }
}

for (const root of roots) collect(root);
files.sort();
const table = Array.from({ length: 256 }, (_, index) => {
  let c = index;
  for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const b of bytes) crc = table[(crc ^ b) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

const local = [],
  central = [],
  entries = [];
let offset = 0;
const now = new Date();
const time = (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
for (const filename of files) {
  const data = readFileSync(filename),
    name = Buffer.from(`${prefix}/${filename}`, 'utf8'),
    zipped = deflateRawSync(data, { level: 9 }),
    crc = crc32(data);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6);
  header.writeUInt16LE(8, 8);
  header.writeUInt16LE(time, 10);
  header.writeUInt16LE(date, 12);
  header.writeUInt32LE(crc, 14);
  header.writeUInt32LE(zipped.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(name.length, 26);
  local.push(header, name, zipped);
  const directory = Buffer.alloc(46);
  directory.writeUInt32LE(0x02014b50);
  directory.writeUInt16LE(20, 4);
  directory.writeUInt16LE(20, 6);
  directory.writeUInt16LE(0x0800, 8);
  directory.writeUInt16LE(8, 10);
  directory.writeUInt16LE(time, 12);
  directory.writeUInt16LE(date, 14);
  directory.writeUInt32LE(crc, 16);
  directory.writeUInt32LE(zipped.length, 20);
  directory.writeUInt32LE(data.length, 24);
  directory.writeUInt16LE(name.length, 28);
  directory.writeUInt32LE(offset, 42);
  central.push(directory, name);
  offset += header.length + name.length + zipped.length;
  entries.push({
    path: filename,
    bytes: statSync(filename).size,
    sha256: createHash('sha256').update(data).digest('hex'),
  });
}
const centralBytes = Buffer.concat(central),
  end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralBytes.length, 12);
end.writeUInt32LE(offset, 16);
mkdirSync('artifacts', { recursive: true });
const zip = Buffer.concat([...local, centralBytes, end]);
writeFileSync(`artifacts/${prefix}.zip`, zip);
writeFileSync(
  `artifacts/${prefix}.manifest.json`,
  JSON.stringify(
    {
      version: manifest.version,
      files: entries,
      zipSha256: createHash('sha256').update(zip).digest('hex'),
    },
    null,
    2,
  ),
);
console.log(
  `${path.resolve('artifacts', `${prefix}.zip`)} (${files.length} files, ${(zip.length / 1024 / 1024).toFixed(2)} MiB)`,
);
