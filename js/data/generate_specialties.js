const fs = require('fs');

const wilayasList = [
    "16 - الجزائر", "31 - وهران", "25 - قسنطينة", "23 - عنابة", "09 - البليدة",
    "05 - باتنة", "19 - سطيف", "13 - تلمسان", "06 - بجاية", "15 - تيزي وزو"
];

const specialtiesList = [
    { id: "general", name: "طب عام" },
    { id: "cardio", name: "أمراض القلب" },
    { id: "pediatrics", name: "طب الأطفال" },
    { id: "derma", name: "أمراض جلدية" },
    { id: "ophtalmo", name: "طب العيون" },
    { id: "dental", name: "طب الأسنان" },
    { id: "gyneco", name: "نساء وتوليد" },
    { id: "ortho", name: "جراحة العظام" },
    { id: "ent", name: "أنف وأذن وحنجرة" },
    { id: "neuro", name: "طب الأعصاب" },
    { id: "internal", name: "طب باطني" },
    { id: "psychiatry", name: "طب نفسي" },
    { id: "gastro", name: "أمراض الجهاز الهضمي" },
    { id: "pneumo", name: "أمراض تنفسية" },
    { id: "uro", name: "جراحة المسالك البولية" },
    { id: "onco", name: "طب الأورام" },
    { id: "endo", name: "غدد صماء وسكري" },
    { id: "rhemato", name: "روماتيزم" },
    { id: "nephro", name: "طب الكلى" },
    { id: "radio", name: "أشعة طبية" }
];

let globalId = 1;

specialtiesList.forEach(spec => {
    let doctors = [];
    for (let i = 0; i < 2; i++) {
        const wilaya = wilayasList[(globalId + i) % wilayasList.length];
        const lat = 36.7 + (Math.random() - 0.5);
        const lng = 3.0 + (Math.random() - 0.5);

        doctors.push({
            id: globalId++,
            name: `د. طبيب ${spec.name} ${i + 1}`,
            specialties: [spec.name],
            wilaya: wilaya,
            city: `مدينة ${wilaya.split(' - ')[1]}`,
            address: `حي الأمل، شارع ${i + 1}`,
            lat: lat,
            lng: lng,
            phone: `05550000${i}${globalId % 10}`,
            workingHours: {
                sat: ["08:00", "16:00"],
                sun: ["08:00", "16:00"],
                mon: ["08:00", "16:00"],
                tue: ["08:00", "16:00"],
                wed: ["08:00", "16:00"],
                thu: ["08:00", "12:00"],
                fri: []
            },
            avatar: `assets/avatar-${(globalId % 3) + 1}.svg`,
            rating: 4 + Math.random()
        });
    }
    fs.writeFileSync(`js/data/specialties/${spec.id}.json`, JSON.stringify(doctors, null, 4));
});

console.log("Specialties generated.");
