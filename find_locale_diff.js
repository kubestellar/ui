const fs = require('fs');
const path = require('path');

const jaPath = 'frontend/src/locales/strings.ja.json';
const enPath = 'frontend/src/locales/strings.en.json';

const ja = JSON.parse(fs.readFileSync(jaPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

function flattenObject(obj, prefix = '') {
    const keys = [];
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const newKey = prefix ? `${prefix}.${key}` : key;
            if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
                keys.push(...flattenObject(obj[key], newKey));
            } else {
                keys.push(newKey);
            }
        }
    }
    return keys;
}

const jaKeys = flattenObject(ja);
const enKeys = flattenObject(en);

const jaSet = new Set(jaKeys);
const enSet = new Set(enKeys);

const missing = enKeys.filter(key => !jaSet.has(key));
const extra = jaKeys.filter(key => !enSet.has(key));

console.log('Missing in Japanese:', missing);
console.log('Extra in Japanese:', extra);
