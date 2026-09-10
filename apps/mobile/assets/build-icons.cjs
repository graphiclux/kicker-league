// Run with Node and sharp available to regenerate the app's original vector icons.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.env.AING_SHARP_MODULE || 'sharp');
const icons = {
  edit: '<path d="m4 16 12-12 4 4L8 20H4ZM13 7l4 4"/>',
  rules: '<path d="M5 3h10l4 4v14H5ZM14 3v5h5M8 12h8M8 16h8"/>',
  admin: '<path d="m12 2 3 3 4 1 1 4 2 2-2 3-1 4-4 1-3 2-3-2-4-1-1-4-2-3 2-2 1-4 4-1Z"/><circle cx="12" cy="12" r="3"/>',
  nfl: '<ellipse cx="12" cy="12" rx="7" ry="11" transform="rotate(40 12 12)"/><path d="m8 17 8-10m-9 5 5 4m-2-8 5 4"/>',
  bell: '<path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5ZM10 21h4M12 2v2"/>',
  clubhouse: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  draft: '<path d="M5 21V3m0 1h14l-3 5 3 5H5"/>',
  standings: '<path d="M4 21V11h4v10m2 0V4h4v17m2 0v-7h4v7M2 21h20"/>',
  inbox: '<path d="M3 4h18v16H3ZM3 13h5l2 3h4l2-3h5"/>',
};
const mark = fs.readFileSync(path.join(__dirname, 'mark.svg'), 'utf8').replace('viewBox="0 0 1024 1024"', 'viewBox="265 255 530 530"');
sharp(Buffer.from(mark)).resize(192, 192).png().toFile(path.join(__dirname, 'header-mark.png'));
Promise.all(Object.entries(icons).map(async ([name, shape]) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24"><g fill="none" stroke="white" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">${shape}</g></svg>`;
  fs.writeFileSync(path.join(__dirname, `tab-${name}.svg`), svg);
  await sharp(Buffer.from(svg)).png().toFile(path.join(__dirname, `tab-${name}.png`));
})).catch(error => { console.error(error); process.exitCode = 1; });
