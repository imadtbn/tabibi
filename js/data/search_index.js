const SEARCH_INDEX = [
    {
        "id": 3,
        "name": "د. طبيب أمراض القلب 1",
        "specialtyId": "cardio",
        "specialtyName": "أمراض القلب",
        "wilaya": "23 - عنابة"
    },
    {
        "id": 4,
        "name": "د. طبيب أمراض القلب 2",
        "specialtyId": "cardio",
        "specialtyName": "أمراض القلب",
        "wilaya": "05 - باتنة"
    },
    {
        "id": 11,
        "name": "د. طبيب طب الأسنان 1",
        "specialtyId": "dental",
        "specialtyName": "طب الأسنان",
        "wilaya": "31 - وهران"
    },
    {
        "id": 12,
        "name": "د. طبيب طب الأسنان 2",
        "specialtyId": "dental",
        "specialtyName": "طب الأسنان",
        "wilaya": "23 - عنابة"
    },
    {
        "id": 7,
        "name": "د. طبيب أمراض جلدية 1",
        "specialtyId": "derma",
        "specialtyName": "أمراض جلدية",
        "wilaya": "13 - تلمسان"
    },
    {
        "id": 8,
        "name": "د. طبيب أمراض جلدية 2",
        "specialtyId": "derma",
        "specialtyName": "أمراض جلدية",
        "wilaya": "15 - تيزي وزو"
    },
    {
        "id": 33,
        "name": "د. طبيب غدد صماء وسكري 1",
        "specialtyId": "endo",
        "specialtyName": "غدد صماء وسكري",
        "wilaya": "23 - عنابة"
    },
    {
        "id": 34,
        "name": "د. طبيب غدد صماء وسكري 2",
        "specialtyId": "endo",
        "specialtyName": "غدد صماء وسكري",
        "wilaya": "05 - باتنة"
    },
    {
        "id": 17,
        "name": "د. طبيب أنف وأذن وحنجرة 1",
        "specialtyId": "ent",
        "specialtyName": "أنف وأذن وحنجرة",
        "wilaya": "13 - تلمسان"
    },
    {
        "id": 18,
        "name": "د. طبيب أنف وأذن وحنجرة 2",
        "specialtyId": "ent",
        "specialtyName": "أنف وأذن وحنجرة",
        "wilaya": "15 - تيزي وزو"
    },
    {
        "id": 25,
        "name": "د. طبيب أمراض الجهاز الهضمي 1",
        "specialtyId": "gastro",
        "specialtyName": "أمراض الجهاز الهضمي",
        "wilaya": "05 - باتنة"
    },
    {
        "id": 26,
        "name": "د. طبيب أمراض الجهاز الهضمي 2",
        "specialtyId": "gastro",
        "specialtyName": "أمراض الجهاز الهضمي",
        "wilaya": "13 - تلمسان"
    },
    {
        "id": 1,
        "name": "د. طبيب طب عام 1",
        "specialtyId": "general",
        "specialtyName": "طب عام",
        "wilaya": "31 - وهران"
    },
    {
        "id": 2,
        "name": "د. طبيب طب عام 2",
        "specialtyId": "general",
        "specialtyName": "طب عام",
        "wilaya": "23 - عنابة"
    },
    {
        "id": 13,
        "name": "د. طبيب نساء وتوليد 1",
        "specialtyId": "gyneco",
        "specialtyName": "نساء وتوليد",
        "wilaya": "23 - عنابة"
    },
    {
        "id": 14,
        "name": "د. طبيب نساء وتوليد 2",
        "specialtyId": "gyneco",
        "specialtyName": "نساء وتوليد",
        "wilaya": "05 - باتنة"
    },
    {
        "id": 21,
        "name": "د. طبيب طب باطني 1",
        "specialtyId": "internal",
        "specialtyName": "طب باطني",
        "wilaya": "31 - وهران"
    },
    {
        "id": 22,
        "name": "د. طبيب طب باطني 2",
        "specialtyId": "internal",
        "specialtyName": "طب باطني",
        "wilaya": "23 - عنابة"
    },
    {
        "id": 37,
        "name": "د. طبيب طب الكلى 1",
        "specialtyId": "nephro",
        "specialtyName": "طب الكلى",
        "wilaya": "13 - تلمسان"
    },
    {
        "id": 38,
        "name": "د. طبيب طب الكلى 2",
        "specialtyId": "nephro",
        "specialtyName": "طب الكلى",
        "wilaya": "15 - تيزي وزو"
    },
    {
        "id": 19,
        "name": "د. طبيب طب الأعصاب 1",
        "specialtyId": "neuro",
        "specialtyName": "طب الأعصاب",
        "wilaya": "15 - تيزي وزو"
    },
    {
        "id": 20,
        "name": "د. طبيب طب الأعصاب 2",
        "specialtyId": "neuro",
        "specialtyName": "طب الأعصاب",
        "wilaya": "31 - وهران"
    },
    {
        "id": 31,
        "name": "د. طبيب طب الأورام 1",
        "specialtyId": "onco",
        "specialtyName": "طب الأورام",
        "wilaya": "31 - وهران"
    },
    {
        "id": 32,
        "name": "د. طبيب طب الأورام 2",
        "specialtyId": "onco",
        "specialtyName": "طب الأورام",
        "wilaya": "23 - عنابة"
    },
    {
        "id": 9,
        "name": "د. طبيب طب العيون 1",
        "specialtyId": "ophtalmo",
        "specialtyName": "طب العيون",
        "wilaya": "15 - تيزي وزو"
    },
    {
        "id": 10,
        "name": "د. طبيب طب العيون 2",
        "specialtyId": "ophtalmo",
        "specialtyName": "طب العيون",
        "wilaya": "31 - وهران"
    },
    {
        "id": 15,
        "name": "د. طبيب جراحة العظام 1",
        "specialtyId": "ortho",
        "specialtyName": "جراحة العظام",
        "wilaya": "05 - باتنة"
    },
    {
        "id": 16,
        "name": "د. طبيب جراحة العظام 2",
        "specialtyId": "ortho",
        "specialtyName": "جراحة العظام",
        "wilaya": "13 - تلمسان"
    },
    {
        "id": 5,
        "name": "د. طبيب طب الأطفال 1",
        "specialtyId": "pediatrics",
        "specialtyName": "طب الأطفال",
        "wilaya": "05 - باتنة"
    },
    {
        "id": 6,
        "name": "د. طبيب طب الأطفال 2",
        "specialtyId": "pediatrics",
        "specialtyName": "طب الأطفال",
        "wilaya": "13 - تلمسان"
    },
    {
        "id": 27,
        "name": "د. طبيب أمراض تنفسية 1",
        "specialtyId": "pneumo",
        "specialtyName": "أمراض تنفسية",
        "wilaya": "13 - تلمسان"
    },
    {
        "id": 28,
        "name": "د. طبيب أمراض تنفسية 2",
        "specialtyId": "pneumo",
        "specialtyName": "أمراض تنفسية",
        "wilaya": "15 - تيزي وزو"
    },
    {
        "id": 23,
        "name": "د. طبيب طب نفسي 1",
        "specialtyId": "psychiatry",
        "specialtyName": "طب نفسي",
        "wilaya": "23 - عنابة"
    },
    {
        "id": 24,
        "name": "د. طبيب طب نفسي 2",
        "specialtyId": "psychiatry",
        "specialtyName": "طب نفسي",
        "wilaya": "05 - باتنة"
    },
    {
        "id": 39,
        "name": "د. طبيب أشعة طبية 1",
        "specialtyId": "radio",
        "specialtyName": "أشعة طبية",
        "wilaya": "15 - تيزي وزو"
    },
    {
        "id": 40,
        "name": "د. طبيب أشعة طبية 2",
        "specialtyId": "radio",
        "specialtyName": "أشعة طبية",
        "wilaya": "31 - وهران"
    },
    {
        "id": 35,
        "name": "د. طبيب روماتيزم 1",
        "specialtyId": "rhemato",
        "specialtyName": "روماتيزم",
        "wilaya": "05 - باتنة"
    },
    {
        "id": 36,
        "name": "د. طبيب روماتيزم 2",
        "specialtyId": "rhemato",
        "specialtyName": "روماتيزم",
        "wilaya": "13 - تلمسان"
    },
    {
        "id": 29,
        "name": "د. طبيب جراحة المسالك البولية 1",
        "specialtyId": "uro",
        "specialtyName": "جراحة المسالك البولية",
        "wilaya": "15 - تيزي وزو"
    },
    {
        "id": 30,
        "name": "د. طبيب جراحة المسالك البولية 2",
        "specialtyId": "uro",
        "specialtyName": "جراحة المسالك البولية",
        "wilaya": "31 - وهران"
    }
];