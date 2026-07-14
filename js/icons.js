// Icon catalog (SVG bodies), footer glyphs, icon selection helpers, and name-based icon inference.

const ICONS={
  hop:{label:"Hop cone",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M31 8c-8 7-13 15-13 25 0 12 7 20 14 24 8-4 15-12 15-24C47 23 41 15 31 8Z"/><path d="M31 10v45M20 24l11 8 13-8M18 35l13 8 15-8M24 16l7 6 8-6"/><path d="M42 44c7 0 12 3 15 8-7 2-13 1-18-3M22 45c-6 1-11 4-14 9 7 1 13-1 17-5"/></g>`},
  citrus:{label:"Citrus",body:`<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="27" cy="36" r="17"/><path d="M27 19v34M10 36h34M15 24l24 24M39 24 15 48"/><path d="M39 16c6-7 13-7 18-4-3 7-9 11-18 9M40 17c1-6-1-10-5-13"/></g>`},
  pilsner:{label:"Pilsner glass",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 9h24l-4 38c-.4 4-3.7 7-7.8 7h-.4c-4.1 0-7.4-3-7.8-7L20 9Z"/><path d="M23 17h18M27 54h10M25 59h14"/><path d="M29 25c-3 5-2 11 2 15M36 23c4 5 4 11 0 17"/></g>`},
  leaf:{label:"Leaf / fern",body:`<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M14 55C25 42 35 28 49 9"/><path d="M21 47c-7 1-12-1-15-6 7-3 13-1 17 3M27 39c-8 0-13-3-15-8 8-2 14 1 18 5M34 30c-7-1-11-5-12-10 8 0 13 4 16 8M39 24c0-8 3-13 9-16 2 8-1 14-6 18M31 36c2-7 7-11 13-12 0 7-4 13-11 16M23 47c3-7 8-10 15-10-1 8-5 13-13 15"/></g>`},
  vanilla:{label:"Vanilla flower",body:`<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="29" cy="28" r="4"/><path d="M29 24C21 9 12 13 15 22c2 5 8 7 14 6M33 28c15-8 19 1 12 7-4 4-10 2-14-3M28 32c-7 15 3 19 9 12 4-5 1-10-5-14M25 29C10 31 10 41 20 43c5 1 9-4 9-11M31 25c5-14 15-10 15-1 0 6-7 8-13 6"/><path d="M42 45c7 3 10 8 12 14M37 48c5 4 7 8 8 13M43 45c-3 2-5 5-6 9"/></g>`},
  passionfruit:{label:"Passion fruit",body:`<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="29" cy="36" r="18"/><circle cx="29" cy="36" r="12"/><circle cx="24" cy="32" r="1.3" fill="currentColor"/><circle cx="31" cy="29" r="1.3" fill="currentColor"/><circle cx="35" cy="36" r="1.3" fill="currentColor"/><circle cx="27" cy="40" r="1.3" fill="currentColor"/><circle cx="34" cy="44" r="1.3" fill="currentColor"/><path d="M40 20c5-8 12-9 18-5-4 7-10 10-18 8M41 21c-2-5-5-8-10-10"/></g>`},
  apple:{label:"Apple",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M32 21c-7-7-18-4-21 7-4 15 7 29 17 29 3 0 5-2 8-2s5 2 8 2c10 0 20-14 16-29-3-11-14-14-22-7-2 2-4 2-6 0Z"/><path d="M34 20c0-7 3-12 8-16M36 12c7-5 14-4 19 0-5 6-12 8-19 5"/></g>`},
  beer:{label:"Beer glass",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20h30v33H16z"/><path d="M46 27h5c5 0 8 4 8 9s-3 9-8 9h-5M20 20c0-8 8-11 13-6 4-6 14-2 13 6"/><path d="M24 28v17M32 28v17M40 28v17"/></g>`},
  wheat:{label:"Wheat stalk",body:`<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M31 58V12M31 49c-8-2-13-7-15-14 8 0 13 4 15 10M31 40c8-2 13-7 15-14-8 0-13 4-15 10M31 31c-8-2-13-7-15-14 8 0 13 4 15 10M31 23c8-2 13-7 15-14-8 0-13 4-15 10M31 15 26 7M31 15l5-8"/></g>`},
  coffee:{label:"Coffee cup",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 25h34v18c0 8-6 14-14 14h-6c-8 0-14-6-14-14V25Z"/><path d="M48 30h4c6 0 9 4 9 9s-4 9-10 9h-5M20 17c-4-4 4-6 0-10M31 17c-4-4 4-6 0-10M42 17c-4-4 4-6 0-10M12 58h40"/></g>`},
  coffeebean:{label:"Coffee bean",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M48 10C34 4 17 13 11 27S13 54 27 59s31-3 37-17S62 16 48 10Z"/><path d="M48 10c-2 12-10 15-19 20S13 40 27 59"/></g>`},
  cacao:{label:"Cacao / chocolate",body:`<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M32 7c12 0 21 11 21 25S44 57 32 57 11 46 11 32 20 7 32 7Z"/><path d="M32 8v48M22 11c4 10 4 32 0 42M42 11c-4 10-4 32 0 42M12 31h40"/><rect x="42" y="42" width="17" height="17" rx="2"/><path d="M50.5 42v17M42 50.5h17"/></g>`},
  coconut:{label:"Coconut",body:`<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="31" cy="35" r="22"/><circle cx="23" cy="28" r="2"/><circle cx="34" cy="25" r="2"/><circle cx="39" cy="35" r="2"/><path d="M12 43c12-5 26-5 39 0M21 15c-1-6 1-10 6-13M31 14c2-6 6-9 11-10"/></g>`},
  pineapple:{label:"Pineapple",body:`<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 30c0-10 6-17 14-17s14 7 14 17v11c0 10-6 17-14 17s-14-7-14-17V30Z"/><path d="M19 30l26 25M45 30 19 55M18 39h28M18 48h28M25 14 18 5M31 13 31 3M37 14l8-9M27 14 21 4M35 14 41 4"/></g>`},
  mango:{label:"Mango",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M39 9c12 5 18 18 13 31S32 61 19 56 5 36 11 23 27 4 39 9Z"/><path d="M37 10c0 8-4 15-11 20M39 9c5-6 11-7 17-4-3 7-9 10-17 9"/></g>`},
  strawberry:{label:"Strawberry",body:`<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M15 23c3-9 12-10 17-5 5-5 14-4 17 5 4 13-7 29-17 36-10-7-21-23-17-36Z"/><path d="M19 17c5 1 9 0 13-6 4 6 8 7 13 6M32 12V5"/><path d="M23 29h0M34 27h0M42 34h0M27 39h0M36 47h0" stroke-width="4"/></g>`},
  cherry:{label:"Cherries",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="20" cy="45" r="11"/><circle cx="44" cy="45" r="11"/><path d="M20 34c2-16 9-24 22-27M44 34C42 20 36 12 27 8M29 10c7-6 14-6 21-1-4 7-11 10-20 6"/></g>`},
  berries:{label:"Mixed berries",body:`<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="22" cy="35" r="9"/><circle cx="34" cy="29" r="9"/><circle cx="43" cy="40" r="9"/><circle cx="27" cy="47" r="9"/><path d="M31 19c-4-7-2-12 3-16M32 18c6-7 13-8 19-4-4 7-10 10-19 8"/></g>`},
  watermelon:{label:"Watermelon",body:`<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M8 22h48c0 18-10 34-24 34S8 40 8 22Z"/><path d="M14 28h36M25 35h0M39 35h0M31 43h0" stroke-width="4"/></g>`},
  peach:{label:"Peach",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M32 18c-9-8-23-3-25 11-2 15 10 29 25 31 15-2 27-16 25-31-2-14-16-19-25-11Z"/><path d="M32 18c5 8 5 25 0 41M31 17c0-8 4-13 11-16M34 10c8-5 15-3 20 2-6 6-13 7-20 3"/></g>`},
  pear:{label:"Pear",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M32 12c7 0 10 7 9 14-1 5 11 10 12 19 1 9-8 15-21 15S10 54 11 45c1-9 13-14 12-19-1-7 2-14 9-14Z"/><path d="M33 12c0-6 3-9 8-11M36 7c7-4 13-2 17 2-5 5-11 6-17 3"/></g>`},
  grapes:{label:"Grapes",body:`<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="25" cy="23" r="7"/><circle cx="38" cy="23" r="7"/><circle cx="19" cy="35" r="7"/><circle cx="32" cy="35" r="7"/><circle cx="45" cy="35" r="7"/><circle cx="25" cy="47" r="7"/><circle cx="39" cy="47" r="7"/><circle cx="32" cy="57" r="6"/><path d="M31 16c-1-7 2-12 8-15M36 8c7-5 14-4 19 0-5 6-12 8-19 5"/></g>`},
  lime:{label:"Lime",body:`<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="34" r="23"/><circle cx="32" cy="34" r="16"/><path d="M32 18v32M16 34h32M21 23l22 22M43 23 21 45"/></g>`},
  lemon:{label:"Lemon",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 34c7-17 20-26 38-24 7 10 7 22 0 34-9 14-24 18-38 12-4-7-4-15 0-22Z"/><path d="M15 50c12-4 23-13 33-31M46 11c4-7 9-9 15-7"/></g>`},
  orange:{label:"Orange",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="31" cy="35" r="23"/><path d="M31 12c1-6 5-10 11-12M36 8c7-4 14-2 18 3-5 5-12 6-18 2M18 43c7 5 19 7 29 1"/></g>`},
  banana:{label:"Banana",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 17c2 22 14 34 35 37 6 1 9-4 5-8-13-13-18-25-17-37-9 7-16 9-23 8Z"/><path d="M12 17 8 11M35 9l3-6M18 22c5 13 14 22 28 27"/></g>`},
  honey:{label:"Honey",body:`<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M18 17h28l4 8-4 33H18l-4-33 4-8Z"/><path d="M16 26h32M21 17v-7h22v7M26 36h12l6 10-6 10H26l-6-10 6-10Z"/><path d="M32 36v20M20 46h24"/></g>`},
  ginger:{label:"Ginger root",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 38c6-7 12-9 19-6-2-8 1-14 8-18 5 5 6 11 3 18 8-3 15 0 19 7-5 5-11 7-18 4 3 7 1 13-5 17-6-3-9-8-8-15-7 4-13 3-18-2Z"/><path d="M30 32c4 4 8 8 12 11M29 45c1-5 3-9 7-13"/></g>`},
  cinnamon:{label:"Cinnamon sticks",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m17 12 9-5 25 42-9 5L17 12Z"/><path d="M22 10c4-2 7 1 7 5M42 49c4-2 7 1 7 5M8 23l10-3 13 35-10 3L8 23Z"/><path d="M13 22c4-1 7 2 6 6M22 54c4-1 7 2 6 6"/></g>`},
  chili:{label:"Chili pepper",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 17c1 18 12 31 34 37 2-20-7-34-27-40-3-1-5 0-7 3Z"/><path d="M23 15c0-7 4-11 11-13M24 17c12 5 21 15 27 31"/></g>`},
  barrel:{label:"Oak barrel",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 8h26c5 15 5 33 0 48H19c-5-15-5-33 0-48Z"/><path d="M17 15h30M15 25h34M15 39h34M17 49h30M24 8c-3 15-3 33 0 48M40 8c3 15 3 33 0 48"/></g>`},
  oakleaf:{label:"Oak leaf",body:`<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M32 57C30 43 31 28 36 8"/><path d="M36 8c8 3 13 8 13 15-4 0-7 1-9 4 5 2 8 6 8 11-5-1-9 0-12 4 2 5 1 10-4 15-4-5-5-10-3-15-4-4-8-5-13-4 0-5 3-9 8-11-2-3-5-4-9-4 0-7 5-12 13-15 2 3 5 3 8 0Z"/><path d="M28 51c-5 0-9 2-12 6M33 46c5-1 9 1 13 5"/></g>`},
  smoke:{label:"Smoke",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 58c-7-9 4-15 5-24 1-8-7-10-4-19M34 58c-6-8 5-14 5-23 0-7-6-10-3-17M46 58c-5-7 4-11 4-18 0-6-4-8-2-13"/></g>`},
  fire:{label:"Flame",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M34 4c3 13-8 16-7 27 1 5 4 8 8 10-1-8 4-13 10-17 9 12 10 25 2 33-8 8-22 7-29-1-9-10-4-24 7-33-1 9 2 15 7 18 6-11 3-24 2-37Z"/></g>`},
  snowflake:{label:"Snowflake",body:`<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M32 5v54M8 19l48 26M8 45l48-26M32 5l-6 7M32 5l6 7M32 59l-6-7M32 59l6-7M8 19l10 1M8 19l4 9M56 45l-10-1M56 45l-4-9M8 45l10-1M8 45l4-9M56 19l-10 1M56 19l-4 9"/></g>`},
  mountain:{label:"Mountain",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 55 25 18l9 15 7-10 18 32H5Z"/><path d="m18 31 7-13 7 12-5 5-4-5-5 1ZM35 33l6-10 7 13-4-2-4 4-5-5Z"/></g>`},
  sun:{label:"Sun",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><circle cx="32" cy="32" r="14"/><path d="M32 4v8M32 52v8M4 32h8M52 32h8M12 12l6 6M46 46l6 6M52 12l-6 6M18 46l-6 6"/></g>`},
  moon:{label:"Moon",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M48 49c-18 9-38-4-38-24 0-12 8-22 19-26-5 17 5 35 19 40 4 2 8 2 12 1-3 4-7 7-12 9Z"/></g>`},
  wave:{label:"Ocean wave",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 38c8-2 12-8 18-17 8 2 14 7 17 15 7-7 14-7 21 0-10-2-15 2-15 8 0 7 7 11 15 8-8 9-23 8-31 0-7-7-14-9-25-6 6-3 10-5 14-8-5-1-10-1-14 0Z"/></g>`},
  palm:{label:"Palm tree",body:`<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M32 58c3-17 3-31-1-43M31 16C22 8 13 8 5 14c9 0 16 3 21 9M31 16c-2-10 2-15 10-16-3 7-4 13-1 19M32 16c8-8 17-8 26-2-9 0-16 3-22 9M33 17c9-1 16 3 22 11-9-3-16-3-22 0M16 58h32"/></g>`},
  pumpkin:{label:"Pumpkin",body:`<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M32 17c14-6 27 5 27 20 0 14-12 22-27 20C17 59 5 51 5 37c0-15 13-26 27-20Z"/><path d="M32 17c-7 7-7 33 0 40M32 17c7 7 7 33 0 40M18 21c-5 9-5 24 0 32M46 21c5 9 5 24 0 32M32 17c-2-7 0-12 6-16"/></g>`},
  maple:{label:"Maple leaf",body:`<g fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M32 60v-16L18 49l3-9-12-5 8-6-5-12 12 4 8-17 8 17 12-4-5 12 8 6-12 5 3 9-14-5v16"/></g>`},
  pretzel:{label:"Pretzel",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M32 37c-8-14-17-24-24-17-7 7 2 20 14 20 8 0 14-6 18-13M32 37c8-14 17-24 24-17 7 7-2 20-14 20-8 0-14-6-18-13M20 40c5 8 19 13 24 0M13 48c12 9 26 9 38 0"/></g>`},
  cloud:{label:"Hazy cloud",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 47h31c8 0 12-5 11-12-1-6-6-9-12-8-2-10-10-16-20-14-8 2-13 8-13 16-7 0-11 4-11 9 0 6 5 9 14 9Z"/><path d="M12 54h40M19 60h26"/></g>`},
  farmhouse:{label:"Farmhouse",body:`<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M7 31 32 11l25 20v28H7V31Z"/><path d="M17 59V38h30v21M27 59V45h10v14M13 26V13h9v6M45 20h8v8M7 31h50"/></g>`},
  bottle:{label:"Beer bottle",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M25 6h14v8l5 8v34c0 3-2 5-5 5H25c-3 0-5-2-5-5V22l5-8V6Z"/><path d="M25 14h14M20 29h24M24 38h16v13H24z"/></g>`},
  can:{label:"Beer can",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><rect x="17" y="6" width="30" height="52" rx="5"/><path d="M20 13h24M20 51h24M26 9h12M25 28h14v13H25z"/></g>`},
  cocktail:{label:"Cocktail glass",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12h48L32 35 8 12Z"/><path d="M32 35v20M22 59h20M21 19h22M47 7l-9 13"/><circle cx="48" cy="7" r="4"/></g>`},
  waterdrop:{label:"Water drop",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M32 4S13 28 13 40c0 11 8 20 19 20s19-9 19-20C51 28 32 4 32 4Z"/><path d="M22 41c1 7 5 10 11 11"/></g>`},
  salt:{label:"Salt crystals",body:`<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M11 40 22 29l11 11-11 11-11-11ZM31 24l8-8 8 8-8 8-8-8ZM36 47l9-9 9 9-9 9-9-9ZM10 18l6-6 6 6-6 6-6-6Z"/></g>`},
  herbs:{label:"Fresh herbs",body:`<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M16 58C26 45 34 30 45 7M24 46c-8 1-13-2-15-8 8-2 14 1 18 5M30 37c-8 0-13-4-14-10 8-1 14 3 17 7M36 28c-7-2-11-6-11-12 8 1 13 5 15 10M39 22c1-8 5-13 12-15 1 8-3 14-9 18M33 35c3-7 8-10 15-10-1 8-6 13-13 15M26 46c4-7 10-9 16-8-2 8-7 12-15 13"/></g>`},
  floral:{label:"Floral / rose",body:`<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M32 58V35M32 49c-7 0-12-3-15-9 7-2 12 0 15 5M32 45c7 0 12-3 15-9-7-2-12 0-15 5"/><path d="M32 36c-11 0-18-8-16-18 4 0 7 1 10 3 0-7 2-12 6-17 4 5 6 10 6 17 3-2 6-3 10-3 2 10-5 18-16 18Z"/><path d="M24 21c5 2 8 6 8 12M40 21c-5 2-8 6-8 12"/></g>`},
  spruce:{label:"Spruce tree",body:`<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M32 4 18 25h9L14 42h12L10 58h44L38 42h12L37 25h9L32 4ZM32 46v14"/></g>`},
  pinecone:{label:"Pine cone",body:`<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M32 7c12 7 18 17 18 30 0 12-8 21-18 21s-18-9-18-21c0-13 6-23 18-30Z"/><path d="M32 8v49M22 17l10 7 10-7M17 27l15 8 15-8M15 38l17 8 17-8M20 49l12 8 12-8"/></g>`},
  guava:{label:"Guava / cas fruit",body:`<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M32 13c13 0 22 10 22 23S45 58 32 58 10 49 10 36s9-23 22-23Z"/><path d="M32 13c0-7 3-11 9-13M36 8c7-4 13-2 17 2-5 5-11 6-17 3"/><circle cx="26" cy="34" r="1.5" fill="currentColor"/><circle cx="34" cy="31" r="1.5" fill="currentColor"/><circle cx="40" cy="38" r="1.5" fill="currentColor"/><circle cx="29" cy="43" r="1.5" fill="currentColor"/><circle cx="37" cy="47" r="1.5" fill="currentColor"/></g>`},
  hibiscus:{label:"Hibiscus flower",body:`<g fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="32" cy="31" r="4"/><path d="M28 29C17 15 8 20 12 31c2 6 9 7 16 3M36 29c13-11 21-3 16 7-3 6-10 5-17 0M35 35c7 16-3 21-11 13-5-5-1-12 5-16M28 34c-16 3-19 13-9 19 6 4 12-2 13-10M32 27c0-17 11-19 17-10 4 6-2 12-10 14"/><path d="M32 31c7-7 12-12 17-18M48 13l8-6M48 13l6 3"/></g>`},
  caramel:{label:"Caramel / candy",body:`<g fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><rect x="19" y="19" width="26" height="26" rx="5"/><path d="M19 25 7 17l3 15-3 15 12-8M45 25l12-8-3 15 3 15-12-8M25 19c0 7 2 12 7 15 5-3 7-8 7-15"/></g>`},
  custom:{label:"Custom uploaded icon",body:""}
};

const footerSvgs={
 glass:`<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="M14 7h36l-3 49H17L14 7Zm5 9 2 34h22l2-34H19Z"/><path fill="currentColor" d="M19 18h26l-2 32H21l-2-32Z"/></svg>`,
 phone:`<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="27" fill="none" stroke="currentColor" stroke-width="5"/><path d="M22 15c3-1 6 0 7 3l4 9c1 2 0 4-2 6l-4 3c3 7 7 11 14 14l3-4c2-2 4-3 6-2l9 4c3 1 4 4 3 7-1 4-5 7-9 7-20-2-38-20-40-40 0-4 3-8 9-7Z" fill="currentColor" transform="scale(.72) translate(12 12)"/></svg>`,
 location:`<svg viewBox="0 0 64 64" aria-hidden="true"><path fill="currentColor" d="M32 4C18 4 8 14 8 28c0 17 24 33 24 33s24-16 24-33C56 14 46 4 32 4Zm0 34a10 10 0 1 1 0-20 10 10 0 0 1 0 20Z"/></svg>`
};

function iconOptions(selected){return Object.entries(ICONS).sort(([,a],[,b])=>a.label.localeCompare(b.label,undefined,{sensitivity:"base"})).map(([key,v])=>`<option value="${key}" ${key===selected?'selected':''}>${esc(v.label)}</option>`).join("")}
function iconSvg(key){const icon=ICONS[key]||ICONS.beer;return `<svg viewBox="0 0 64 64" aria-hidden="true">${icon.body}</svg>`}

function inferIcon(name=""){
  const n=name.toLowerCase();
  if(n.includes("cider"))return n.includes("marac")||n.includes("passion")?"passionfruit":"apple";
  if(n.includes("cas")||n.includes("guava"))return "guava";
  if(n.includes("marac")||n.includes("passion"))return "passionfruit";
  if(n.includes("hibiscus")||n.includes("jamaica"))return "hibiscus";
  if(n.includes("wheat")||n.includes("weizen")||n.includes("witbier"))return "wheat";
  if(n.includes("coffee"))return "coffee";
  if(n.includes("chocolate")||n.includes("cacao")||n.includes("cocoa"))return "cacao";
  if(n.includes("coconut"))return "coconut";
  if(n.includes("pineapple"))return "pineapple";
  if(n.includes("mango"))return "mango";
  if(n.includes("strawberry"))return "strawberry";
  if(n.includes("cherry"))return "cherry";
  if(n.includes("berry")||n.includes("berries")||n.includes("blueberry")||n.includes("raspberry"))return "berries";
  if(n.includes("watermelon"))return "watermelon";
  if(n.includes("peach"))return "peach";
  if(n.includes("pear"))return "pear";
  if(n.includes("grape")||n.includes("wine"))return "grapes";
  if(n.includes("lime"))return "lime";
  if(n.includes("lemon"))return "lemon";
  if(n.includes("orange"))return "orange";
  if(n.includes("banana"))return "banana";
  if(n.includes("honey"))return "honey";
  if(n.includes("ginger"))return "ginger";
  if(n.includes("cinnamon"))return "cinnamon";
  if(n.includes("chili")||n.includes("pepper")||n.includes("spicy"))return "chili";
  if(n.includes("barrel")||n.includes("bourbon")||n.includes("whiskey")||n.includes("oak"))return "barrel";
  if(n.includes("smoked")||n.includes("rauch"))return "smoke";
  if(n.includes("winter")||n.includes("ice")||n.includes("cold"))return "snowflake";
  if(n.includes("hazy")||n.includes("neipa"))return "cloud";
  if(n.includes("pumpkin"))return "pumpkin";
  if(n.includes("maple"))return "maple";
  if(n.includes("floral")||n.includes("rose"))return "floral";
  if(n.includes("spruce")||n.includes("pine"))return "spruce";
  if(n.includes("saison")||n.includes("farmhouse"))return "farmhouse";
  if(n.includes("stout")||n.includes("porter")||n.includes("vanilla"))return n.includes("vanilla")?"vanilla":"coffee";
  if(n.includes("pils")||n.includes("lager")||n.includes("kölsch")||n.includes("kolsch"))return "pilsner";
  if(n.includes("blonde")||n.includes("citra"))return "citrus";
  if(n.includes("nz"))return "leaf";
  if(n.includes("sour")||n.includes("gose")||n.includes("berliner"))return "waterdrop";
  if(n.includes("ipa")||n.includes("pale"))return "hop";
  return "beer";
}

function renderedIcon(item){
  if(item.icon==="custom"&&item.customIcon)return `<img src="${esc(item.customIcon)}" alt="">`;
  return iconSvg(item.icon);
}
