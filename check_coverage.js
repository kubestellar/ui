const fs = require('fs');
const path = require('path');

const zhPath = 'frontend/src/locales/strings.hi.json';
const enPath = 'frontend/src/locales/strings.en.json';

const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

let totalKeys = 0;
let identicalKeys = 0;

function compare(obj1, obj2, currentPath = '') {
    for (const key in obj1) {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        if (typeof obj1[key] === 'object' && obj1[key] !== null) {
            compare(obj1[key], obj2[key], newPath);
        } else {
            totalKeys++;
            if (obj1[key] === obj2[key]) {
                identicalKeys++;
                console.log(`Identical Key Path: ${newPath}`);
            }
        }
    }
}

compare(zh, en);
console.log(`Total Keys: ${totalKeys}`);
console.log(`Identical (English) Keys: ${identicalKeys}`);
console.log(`Translated Keys: ${totalKeys - identicalKeys}`);
console.log(`Coverage: ${Math.round(((totalKeys - identicalKeys) / totalKeys) * 100)}%`);
