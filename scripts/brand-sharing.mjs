// Brand layout using the existing approved artwork, never redrawing its lettering.
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
import {readFileSync,writeFileSync} from 'node:fs';
const assets=new URL('../public/assets/',import.meta.url);
const embed=name=>'data:image/png;base64,'+readFileSync(new URL('./'+name,import.meta.url)).toString('base64');
const clean='<filter id="solid"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  1 -1 0 0 0"/><feComponentTransfer><feFuncA type="linear" slope="20" intercept="-2"/></feComponentTransfer></filter>';
const icon=`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><defs>${clean}<mask id="mark" mask-type="alpha"><image filter="url(#solid)" href="${embed('brand-reference-monogram.png')}" x="0" y="0" width="512" height="512" preserveAspectRatio="xMidYMid meet"/></mask></defs><rect width="512" height="512" fill="#3e3e42"/><rect width="512" height="512" fill="#f6b9c6" mask="url(#mark)"/></svg>`;
writeFileSync(new URL('favicon-mova-v11.svg',assets),icon);
for(const size of [32,180,512])await sharp(Buffer.from(icon)).resize(size,size).png().toFile(fileURLToPath(new URL(`mova-icon-${size}-v11.png`,assets)));
const social=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="#3e3e42"/><defs>${clean}<mask id="mark" mask-type="alpha"><image filter="url(#solid)" href="${embed('brand-reference-wordmark.png')}" x="140" y="161" width="920" height="307"/></mask></defs><rect width="1200" height="630" fill="#f6b9c6" mask="url(#mark)"/></svg>`;
writeFileSync(new URL('mova-share-v11.svg',assets),social);
await sharp(Buffer.from(social)).png().toFile(fileURLToPath(new URL('mova-share-v11.png',assets)));
console.log('Favicon e imagem social exportados.');
