// Run with Node and sharp available to regenerate the app's original vector icons.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.env.AING_SHARP_MODULE || 'sharp');
const icons = {
  clubhouse: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  draft: '<path d="M5 21V3m0 1h14l-3 5 3 5H5"/>',
  standings: '<path d="M4 21V11h4v10m2 0V4h4v17m2 0v-7h4v7M2 21h20"/>',
  inbox: '<path d="M3 4h18v16H3ZM3 13h5l2 3h4l2-3h5"/>',
};
Promise.all(Object.entries(icons).map(async ([name, shape]) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="72" height="72" viewBox="0 0 24 24"><g fill="none" stroke="white" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round">${shape}</g></svg>`;
  fs.writeFileSync(path.join(__dirname, `tab-${name}.svg`), svg);
  await sharp(Buffer.from(svg)).png().toFile(path.join(__dirname, `tab-${name}.png`));
})).catch(error => { console.error(error); process.exitCode = 1; });
