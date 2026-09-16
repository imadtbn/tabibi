const fs = require('fs');

const specialtiesFiles = fs.readdirSync('js/data/specialties');
let homepageDoctors = [];
let searchIndex = [];

specialtiesFiles.forEach(file => {
    if (file.endsWith('.json')) {
        const data = JSON.parse(fs.readFileSync(`js/data/specialties/${file}`, 'utf-8'));
        const specId = file.replace('.json', '');

        // Take 1 doctor for homepage sample if we don't have 4 yet (just an example, taking up to 4 total)
        if (homepageDoctors.length < 4 && data.length > 0) {
            homepageDoctors.push(data[0]);
        }

        // Add to search index
        data.forEach(doc => {
            searchIndex.push({
                id: doc.id,
                name: doc.name,
                specialtyId: specId,
                specialtyName: doc.specialties[0],
                wilaya: doc.wilaya
            });
        });
    }
});

fs.writeFileSync('js/data/homepage.js', `const HOMEPAGE_DOCTORS = ${JSON.stringify(homepageDoctors, null, 4)};`);
fs.writeFileSync('js/data/search_index.js', `const SEARCH_INDEX = ${JSON.stringify(searchIndex, null, 4)};`);

console.log("Homepage and search index generated.");
