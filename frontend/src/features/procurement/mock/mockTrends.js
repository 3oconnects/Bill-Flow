// Mock monthly trend data — last 6 months
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun']

export const MOCK_MONTHLY = [
  { month:'Jan', stockValue:1820000, procurement:680000, units:142, categories:{ electronics:980000, accessories:320000, storage:280000, networking:160000, furniture:80000 } },
  { month:'Feb', stockValue:1950000, procurement:720000, units:158, categories:{ electronics:1050000, accessories:340000, storage:290000, networking:180000, furniture:90000 } },
  { month:'Mar', stockValue:2100000, procurement:810000, units:174, categories:{ electronics:1140000, accessories:370000, storage:310000, networking:190000, furniture:90000 } },
  { month:'Apr', stockValue:1980000, procurement:640000, units:163, categories:{ electronics:1060000, accessories:355000, storage:295000, networking:185000, furniture:85000 } },
  { month:'May', stockValue:2240000, procurement:890000, units:191, categories:{ electronics:1230000, accessories:390000, storage:330000, networking:200000, furniture:90000 } },
  { month:'Jun', stockValue:2380000, procurement:920000, units:204, categories:{ electronics:1310000, accessories:415000, storage:345000, networking:215000, furniture:95000 } },
]

export const MOCK_PRODUCT_TRENDS = {
  m1:  [22,18,25,20,23,23], // HP Pavilion
  m2:  [10,8,9,7,8,8],
  m3:  [8,10,12,11,12,12],
  m4:  [28,30,32,29,31,31],
  m5:  [6,5,7,6,5,5],
  m6:  [14,16,18,17,18,18],
  m7:  [38,40,42,40,41,42],
  m8:  [5,6,7,7,7,7],
  m9:  [12,13,14,14,14,14],
  m10: [48,50,52,53,54,55],
}
