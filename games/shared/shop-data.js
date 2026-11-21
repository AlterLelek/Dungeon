// Расширенный ассортимент лавок для всех игр, кроме MM6 (там свой data.js).
export const SHOP_TABS = [
  { id: 'weapons', name: 'Оружие', icon: '⚔' },
  { id: 'armor', name: 'Броня', icon: '🛡' },
  { id: 'magic', name: 'Магия', icon: '✨' },
  { id: 'jeweler', name: 'Ювелир', icon: '💎' },
  { id: 'market', name: 'Рынок', icon: '🛒' },
  { id: 'forge', name: 'Кузня', icon: '🔥' }
];

export const QUALITY = ['Ржавое', 'Острое', 'Золотое', 'Волшебное', 'Зачарованное'];

export const FORGE_RULES = {
  minQuality: 1,
  maxReforge: 5,
  gainDivisor: 5,
  baseCost: 1,
  crystalCost: 1,
  note: 'Перековка доступна от «Острого» оружия и выше. +1/5 силы за перековку, максимум 5.'
};

export const SERVICES = {
  forge: [
    { id: 'reforge', name: 'Перековка', desc: '+1/5 силы, до 5 раз', cost: 1 },
    { id: 'to_metal', name: 'Перековка в металл', desc: 'Снимает ржавчину, качество +1', cost: 3 },
    { id: 'new_weapon', name: 'Новое оружие', desc: 'Повышает класс оружия', cost: 6 }
  ],
  jeweler: [
    { id: 'enchant', name: 'Украшение кристаллом', desc: '+ к силе, можно вместе с перековкой', cost: 1 },
    { id: 'socket', name: 'Вставка камня', desc: 'Добавляет эффект жидкости', cost: 2 }
  ],
  magic: [
    { id: 'potion_hp', name: 'Зелье жизни', desc: '+25 HP', cost: 5 },
    { id: 'potion_mp', name: 'Зелье маны', desc: '+6 MP', cost: 6 },
    { id: 'scroll_fire', name: 'Свиток огня', desc: 'Огненный шар', cost: 10 },
    { id: 'scroll_heal', name: 'Свиток лечения', desc: 'Исцеление', cost: 12 }
  ],
  market: [
    { id: 'herb_mint', name: 'Мята', desc: '+3 MP', cost: 2 },
    { id: 'herb_sage', name: 'Шалфей', desc: '+12 HP', cost: 2 },
    { id: 'chest_small', name: 'Малый сундук', desc: 'Случайная находка', cost: 9 }
  ]
};

export const ENCHANT_LIQUIDS = [
  { id: 'liquid_hp', name: 'Жидкость здоровья', stat: 'hp', value: 8, color: '#f87171' },
  { id: 'liquid_mp', name: 'Жидкость маны', stat: 'mp', value: 4, color: '#60a5fa' },
  { id: 'liquid_atk', name: 'Жидкость ярости', stat: 'atk', value: 3, color: '#fb923c' },
  { id: 'liquid_def', name: 'Жидкость камня', stat: 'def', value: 3, color: '#a3a3a3' },
  { id: 'liquid_poison', name: 'Жидкость яда', stat: 'poison', value: 3, color: '#4ade80' },
  { id: 'liquid_light', name: 'Жидкость света', stat: 'light', value: 5, color: '#fde68a' }
];

export function reforgeCost(quality, level){
  return FORGE_RULES.baseCost + Math.max(0, quality) + Math.max(0, level);
}

export function reforgeGain(baseDmg){
  return Math.max(1, Math.floor(baseDmg / FORGE_RULES.gainDivisor));
}
