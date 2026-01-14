const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'frontend/src/locales');
const enPath = path.join(localesDir, 'strings.en.json');
const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

fs.readdirSync(localesDir).forEach(file => {
    if (file === 'strings.en.json' || !file.endsWith('.json')) return;

    const localePath = path.join(localesDir, file);
    const localeData = JSON.parse(fs.readFileSync(localePath, 'utf8'));
    
    function sync(source, target) {
        for (const key in source) {
            if (typeof source[key] === 'object') {
                if (!target[key]) target[key] = {};
                sync(source[key], target[key]);
            } else {
                if (!target[key]) {
                    target[key] = source[key]; // Fill missing with English
                }
            }
        }
    }

    sync(enData, localeData);
    fs.writeFileSync(localePath, JSON.stringify(localeData, null, 2) + '\n');
    console.log(`Synced ${file}`);
});
