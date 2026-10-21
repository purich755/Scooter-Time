/* The Scooter Time — всё, что владелец может поменять без вёрстки.
   Часы работы — по VK (10:00–00:00). Яндекс показывает 12:00–23:00, см. OPEN_QUESTIONS.md. */
window.ST_CONFIG = {
  timeZone: 'Europe/Moscow', // Казань живёт по московскому времени
  hours: { open: '10:00', close: '00:00' }, // close '00:00' = полночь

  phones: {
    main: { label: '+7 (843) 216-52-90', short: '216-52-90', tel: '+78432165290' },
    extra: { label: '+7 (962) 556-52-90', tel: '+79625565290' },
  },
  links: {
    vk: 'https://vk.ru/rent_scooters',
    vkMessage: 'https://vk.me/rent_scooters',
    instagram: 'https://www.instagram.com/rent_scooter/',
    yandex: 'https://yandex.ru/maps/org/the_scooter_time/241988291495/',
    yandexReviews: 'https://yandex.ru/maps/org/the_scooter_time/241988291495/reviews/',
  },

  // Тарифы из описания VK. price: null — «по договорённости»
  tariffs: [
    { label: '1 Ч', speech: '1 час', price: 1000, mood: 'Попробовать и влюбиться' },
    { label: '2 Ч', speech: '2 часа', price: 1700, mood: 'Успеть к закату' },
    { label: '3 Ч', speech: '3 часа', price: 2500, mood: 'Прогулка и фотографии' },
    { label: '4 Ч', speech: '4 часа', price: 3200, mood: 'День, который захочется пересказывать' },
    { label: 'НОЧЬ', speech: 'ночь с 22:00 до 10:00', price: null, mood: 'Казань, когда все спят', note: '22:00–10:00' },
  ],

  // Гараж. Имён в источниках нет — пока владелец не пришлёт, на брелоке «ИМЯ — ПРИ ВСТРЕЧЕ».
  // Чтобы подписать мопед, впишите имя: { color: 'МЯТНЫЙ', name: 'Мята', ... }
  scooters: [
    { color: 'МЯТНЫЙ', name: null, img: 'mint' },
    { color: 'КРАСНЫЙ', name: null, img: 'red' },
    { color: 'СЕРЕБРИСТЫЙ', name: null, img: 'silver' },
    { color: 'СИНИЙ', name: null, img: 'blue' },
    { color: 'ОРАНЖЕВЫЙ', name: null, img: 'orange' },
    { color: 'БОРДОВЫЙ', name: null, img: 'bordo' },
    { color: 'ИЗУМРУДНЫЙ', name: null, img: 'emerald' },
  ],
};
