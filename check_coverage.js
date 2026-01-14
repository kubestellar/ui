const fs = require('fs');
const path = require('path');

const zhPath = 'frontend/src/locales/strings.ja.json';
const enPath = 'frontend/src/locales/strings.en.json';

const zh = JSON.parse(fs.readFileSync(zhPath, 'utf8'));
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));

let totalKeys = 0;
let identicalKeys = 0;

function isEffectiveEnglish(sourceVal, targetVal) {
    if (sourceVal === targetVal) {
        // Filter out obvious technical terms that SHOULD be english
        if (/^[A-Z0-9\s\.\-_]+$/.test(sourceVal) && sourceVal.length < 15) return false; // Short caps/nums usually okay (CPU, RAM, ID)
        if (sourceVal.includes('{{')) return false; // Templated strings often identical structure
        return true;
    }
    return false;
}

function compare(obj1, obj2, currentPath = '') {
    for (const key in obj1) {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        if (typeof obj1[key] === 'object' && obj1[key] !== null) {
            compare(obj1[key], obj2[key], newPath);
        } else {
            totalKeys++;
            if (obj1[key] && obj1[key] === obj2[key]) { 
                identicalKeys++; 
                console.log(`Identical Key Path: ${newPath} | Value: "${obj1[key]}"`);
            }
        }
    }
}

compare(en, zh);

console.log(`Total Keys: ${totalKeys}`);
console.log(`Identical (English) Keys: ${identicalKeys}`);
console.log(`Translated Keys: ${totalKeys - identicalKeys}`);
console.log(`Coverage: ${Math.round(((totalKeys - identicalKeys) / totalKeys) * 100)}%`);
