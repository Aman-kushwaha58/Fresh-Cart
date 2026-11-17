import bcrypt from 'bcryptjs';
import { count, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { categories, products, profiles } from './schema.ts';

const IMAGES = {
  fruitsOrchard: '/src/assets/images/prod_fruits_orchard_1794931468680.jpg',
  vegetables: '/src/assets/images/prod_fresh_vegetables_1794931469245.jpg',
  citrusBerries: '/src/assets/images/prod_citrus_berries_1794931469003.jpg',
  dairyMilkEggs: '/src/assets/images/prod_dairy_milk_eggs_1794931469948.jpg',
  cheeseYogurt: '/src/assets/images/prod_artisan_cheese_yogurt_1794931470246.jpg',
  bakeryBread: '/src/assets/images/prod_bakery_bread_1794931470228.jpg',
  beverages: '/src/assets/images/prod_beverages_juice_1794931470698.jpg',
  snacks: '/src/assets/images/prod_snacks_treats_1794931471278.jpg',
  pantry: '/src/assets/images/prod_pantry_staples_1794931471147.jpg',
  household: '/src/assets/images/prod_household_essentials_1794931472556.jpg',
};

const SEED_CATEGORIES = [
  {
    name: 'Fruits & Vegetables',
    slug: 'fruits-vegetables',
    description: 'Farm-picked organic fruits, leafy greens, and crisp root vegetables.',
    imageUrl: IMAGES.fruitsOrchard,
  },
  {
    name: 'Dairy & Eggs',
    slug: 'dairy-eggs',
    description: 'Pasture-raised milk, free-range eggs, cultured butter, and artisan cheeses.',
    imageUrl: IMAGES.dairyMilkEggs,
  },
  {
    name: 'Bakery',
    slug: 'bakery',
    description: 'Daily baked sourdough loaves, flaky butter croissants, and seeded bagels.',
    imageUrl: IMAGES.bakeryBread,
  },
  {
    name: 'Beverages',
    slug: 'beverages',
    description: 'Cold-pressed fruit juices, single-origin coffee, and loose-leaf teas.',
    imageUrl: IMAGES.beverages,
  },
  {
    name: 'Snacks',
    slug: 'snacks',
    description: 'Kettle-cooked chips, butter biscuits, dark chocolate, and roasted nuts.',
    imageUrl: IMAGES.snacks,
  },
  {
    name: 'Pantry',
    slug: 'pantry',
    description: 'Aged basmati rice, cold-pressed olive oil, heirloom flour, and pasta.',
    imageUrl: IMAGES.pantry,
  },
  {
    name: 'Household Essentials',
    slug: 'household-essentials',
    description: 'Plant-based dish soap, biodegradable laundry detergent, and bamboo paper goods.',
    imageUrl: IMAGES.household,
  },
];

interface SeedProduct {
  name: string;
  description: string;
  unit: string;
  price: string;
  originalPrice?: string;
  categorySlug: string;
  imageUrl: string;
  stock: number;
  isFeatured: boolean;
  salesCount: number;
}

const SEED_PRODUCTS: SeedProduct[] = [
  // Fruits & Vegetables (9)
  {
    name: 'Honeycrisp Apples',
    description: 'Crisp, sweet-tart orchard apples harvested at peak ripeness for snacking or baking.',
    unit: '1 kg bag',
    price: '4.49',
    originalPrice: '5.49',
    categorySlug: 'fruits-vegetables',
    imageUrl: IMAGES.fruitsOrchard,
    stock: 48,
    isFeatured: true,
    salesCount: 184,
  },
  {
    name: 'Organic Cavendish Bananas',
    description: 'Naturally sweet, potassium-rich bananas ideal for smoothies, oatmeal, and daily energy.',
    unit: '1 bunch (~6 pcs)',
    price: '1.99',
    categorySlug: 'fruits-vegetables',
    imageUrl: IMAGES.fruitsOrchard,
    stock: 72,
    isFeatured: false,
    salesCount: 240,
  },
  {
    name: 'Hass Avocados',
    description: 'Creamy, rich-textured avocados ready for toast, guacamole, and fresh salads.',
    unit: '2 pack',
    price: '3.79',
    originalPrice: '4.50',
    categorySlug: 'fruits-vegetables',
    imageUrl: IMAGES.fruitsOrchard,
    stock: 36,
    isFeatured: true,
    salesCount: 165,
  },
  {
    name: 'Heirloom Rainbow Carrots',
    description: 'Sweet, earthy farm-fresh carrots with leafy green tops, triple-washed and ready to roast.',
    unit: '500 g bunch',
    price: '2.49',
    categorySlug: 'fruits-vegetables',
    imageUrl: IMAGES.vegetables,
    stock: 54,
    isFeatured: false,
    salesCount: 118,
  },
  {
    name: 'Vine-Ripened Tomatoes',
    description: 'Fragrant, juicy red tomatoes picked on the vine for sauces, caprese, and sandwiches.',
    unit: '500 g',
    price: '3.29',
    originalPrice: '3.99',
    categorySlug: 'fruits-vegetables',
    imageUrl: IMAGES.vegetables,
    stock: 44,
    isFeatured: true,
    salesCount: 152,
  },
  {
    name: 'Yukon Gold Potatoes',
    description: 'Velvety, thin-skinned potatoes ideal for roasting, mashing, or hearty stews.',
    unit: '1.5 kg bag',
    price: '3.49',
    categorySlug: 'fruits-vegetables',
    imageUrl: IMAGES.vegetables,
    stock: 60,
    isFeatured: false,
    salesCount: 130,
  },
  {
    name: 'Sweet Red Onions',
    description: 'Crisp, mildly pungent red onions suited for caramelizing, grilling, and salads.',
    unit: '750 g bag',
    price: '2.19',
    categorySlug: 'fruits-vegetables',
    imageUrl: IMAGES.vegetables,
    stock: 65,
    isFeatured: false,
    salesCount: 112,
  },
  {
    name: 'Sweet Strawberries',
    description: 'Plump, ruby-red berries picked fresh and packed for immediate freshness.',
    unit: '400 g punnet',
    price: '4.99',
    originalPrice: '5.99',
    categorySlug: 'fruits-vegetables',
    imageUrl: IMAGES.citrusBerries,
    stock: 28,
    isFeatured: true,
    salesCount: 196,
  },
  {
    name: 'Navel Oranges',
    description: 'Seedless, vibrant citrus bursting with vitamin C and refreshing sweetness.',
    unit: '1 kg bag',
    price: '3.89',
    categorySlug: 'fruits-vegetables',
    imageUrl: IMAGES.citrusBerries,
    stock: 52,
    isFeatured: false,
    salesCount: 141,
  },

  // Dairy & Eggs (6)
  {
    name: 'Farm Fresh Whole Milk',
    description: 'Pasteurized pasture-raised whole milk bottled in recyclable glass for clean taste.',
    unit: '1 liter bottle',
    price: '3.99',
    categorySlug: 'dairy-eggs',
    imageUrl: IMAGES.dairyMilkEggs,
    stock: 40,
    isFeatured: true,
    salesCount: 215,
  },
  {
    name: 'Pasture-Raised Unsalted Butter',
    description: 'Rich, creamy 84% butterfat cultured butter crafted from grass-fed cream.',
    unit: '250 g block',
    price: '4.29',
    originalPrice: '4.99',
    categorySlug: 'dairy-eggs',
    imageUrl: IMAGES.dairyMilkEggs,
    stock: 42,
    isFeatured: false,
    salesCount: 134,
  },
  {
    name: 'Aged Sharp Cheddar Cheese',
    description: '12-month cave-aged cheddar with crystalline crunch and savory depth.',
    unit: '220 g wedge',
    price: '5.99',
    categorySlug: 'dairy-eggs',
    imageUrl: IMAGES.cheeseYogurt,
    stock: 30,
    isFeatured: true,
    salesCount: 122,
  },
  {
    name: 'Free-Range Brown Eggs',
    description: 'Deep golden-yolk eggs from pasture-foraging hens fed an organic grain diet.',
    unit: '12 large eggs',
    price: '5.49',
    categorySlug: 'dairy-eggs',
    imageUrl: IMAGES.dairyMilkEggs,
    stock: 55,
    isFeatured: true,
    salesCount: 260,
  },
  {
    name: 'Strained Greek Yogurt',
    description: 'Thick, high-protein plain Greek yogurt with live active probiotic cultures.',
    unit: '500 g tub',
    price: '4.49',
    originalPrice: '5.29',
    categorySlug: 'dairy-eggs',
    imageUrl: IMAGES.cheeseYogurt,
    stock: 38,
    isFeatured: false,
    salesCount: 148,
  },
  {
    name: 'Fresh Buffalo Mozzarella',
    description: 'Delicate, milky mozzarella packed in brine for pizzas and heirloom caprese.',
    unit: '200 g ball',
    price: '4.79',
    categorySlug: 'dairy-eggs',
    imageUrl: IMAGES.cheeseYogurt,
    stock: 24,
    isFeatured: false,
    salesCount: 89,
  },

  // Bakery (4)
  {
    name: 'Artisan Country Sourdough',
    description: 'Naturally leavened 24-hour fermented loaf with a crisp blistered crust and open crumb.',
    unit: '650 g loaf',
    price: '5.49',
    categorySlug: 'bakery',
    imageUrl: IMAGES.bakeryBread,
    stock: 26,
    isFeatured: true,
    salesCount: 178,
  },
  {
    name: 'Everything Seeded Bagels',
    description: 'Kettle-boiled and hearth-baked chewy bagels topped with sesame, poppy, and sea salt.',
    unit: '4 pack',
    price: '4.29',
    originalPrice: '4.99',
    categorySlug: 'bakery',
    imageUrl: IMAGES.bakeryBread,
    stock: 32,
    isFeatured: false,
    salesCount: 110,
  },
  {
    name: 'French Butter Croissants',
    description: 'Laminated 27-layer flaky pastry baked golden each morning with Normandy butter.',
    unit: '4 pack',
    price: '6.29',
    categorySlug: 'bakery',
    imageUrl: IMAGES.bakeryBread,
    stock: 22,
    isFeatured: true,
    salesCount: 164,
  },
  {
    name: 'Dark Chocolate Brioche Cake',
    description: 'Tender butter-rich bakery loaf swirled with single-origin dark chocolate ganache.',
    unit: '450 g loaf',
    price: '7.49',
    originalPrice: '8.99',
    categorySlug: 'bakery',
    imageUrl: IMAGES.bakeryBread,
    stock: 18,
    isFeatured: false,
    salesCount: 74,
  },

  // Beverages (4)
  {
    name: 'Cold-Pressed Valencia Orange Juice',
    description: '100% pure unpasteurized Valencia oranges pressed fresh with zero added sugar.',
    unit: '750 ml glass bottle',
    price: '4.99',
    categorySlug: 'beverages',
    imageUrl: IMAGES.beverages,
    stock: 35,
    isFeatured: true,
    salesCount: 158,
  },
  {
    name: 'Orchard Crisp Apple Juice',
    description: 'Unfiltered cold-pressed Honeycrisp and Fuji apples with bright natural sweetness.',
    unit: '750 ml glass bottle',
    price: '4.49',
    originalPrice: '5.29',
    categorySlug: 'beverages',
    imageUrl: IMAGES.beverages,
    stock: 30,
    isFeatured: false,
    salesCount: 98,
  },
  {
    name: 'Single-Origin Whole Bean Coffee',
    description: 'Medium-dark roast Arabica beans with notes of toasted hazelnut and dark cocoa.',
    unit: '340 g bag',
    price: '12.99',
    originalPrice: '14.99',
    categorySlug: 'beverages',
    imageUrl: IMAGES.beverages,
    stock: 40,
    isFeatured: true,
    salesCount: 172,
  },
  {
    name: 'Japanese Sencha Green Tea',
    description: 'First-harvest steamed loose-leaf green tea delivering a smooth, grassy finish.',
    unit: '100 g tin',
    price: '8.49',
    categorySlug: 'beverages',
    imageUrl: IMAGES.beverages,
    stock: 28,
    isFeatured: false,
    salesCount: 84,
  },

  // Snacks (4)
  {
    name: 'Sea Salt Kettle Potato Chips',
    description: 'Thick-cut Russet potatoes batch-cooked in sunflower oil and dusted with sea salt.',
    unit: '180 g bag',
    price: '3.49',
    categorySlug: 'snacks',
    imageUrl: IMAGES.snacks,
    stock: 56,
    isFeatured: false,
    salesCount: 155,
  },
  {
    name: 'All-Butter Shortbread Biscuits',
    description: 'Crumbly, melt-in-the-mouth Scottish-style biscuits baked with pure creamery butter.',
    unit: '200 g box',
    price: '3.99',
    originalPrice: '4.79',
    categorySlug: 'snacks',
    imageUrl: IMAGES.snacks,
    stock: 44,
    isFeatured: false,
    salesCount: 92,
  },
  {
    name: '72% Ecuadorian Dark Chocolate',
    description: 'Stone-ground single-estate dark chocolate bar with balanced floral and cacao notes.',
    unit: '100 g bar',
    price: '3.79',
    categorySlug: 'snacks',
    imageUrl: IMAGES.snacks,
    stock: 64,
    isFeatured: true,
    salesCount: 168,
  },
  {
    name: 'Roasted & Lightly Salted Almonds',
    description: 'Crunchy California almonds dry-roasted in small batches for wholesome snacking.',
    unit: '300 g pouch',
    price: '6.99',
    originalPrice: '8.49',
    categorySlug: 'snacks',
    imageUrl: IMAGES.snacks,
    stock: 38,
    isFeatured: false,
    salesCount: 121,
  },

  // Pantry (5)
  {
    name: 'Aged Himalayan Basmati Rice',
    description: 'Extra-long aromatic basmati grains aged 18 months for fluffy, separated texture.',
    unit: '2 kg bag',
    price: '7.99',
    categorySlug: 'pantry',
    imageUrl: IMAGES.pantry,
    stock: 46,
    isFeatured: false,
    salesCount: 146,
  },
  {
    name: 'Stone-Ground Organic Wheat Flour',
    description: 'Unbleached heirloom whole wheat flour milled slow for bread, flatbreads, and pastry.',
    unit: '1.5 kg bag',
    price: '4.29',
    categorySlug: 'pantry',
    imageUrl: IMAGES.pantry,
    stock: 50,
    isFeatured: false,
    salesCount: 105,
  },
  {
    name: 'Organic Raw Cane Sugar',
    description: 'Unrefined golden cane sugar crystals with subtle caramel notes for coffee and baking.',
    unit: '1 kg bag',
    price: '3.59',
    categorySlug: 'pantry',
    imageUrl: IMAGES.pantry,
    stock: 58,
    isFeatured: false,
    salesCount: 94,
  },
  {
    name: 'Cold-Pressed Extra Virgin Olive Oil',
    description: 'First-press Mediterranean olive oil with bright peppery finish and low acidity.',
    unit: '500 ml glass bottle',
    price: '11.49',
    originalPrice: '13.99',
    categorySlug: 'pantry',
    imageUrl: IMAGES.pantry,
    stock: 34,
    isFeatured: true,
    salesCount: 188,
  },
  {
    name: 'Bronze-Die Artisanal Penne Pasta',
    description: 'Slow-dried durum wheat semolina penne with a textured surface that holds rich sauces.',
    unit: '500 g box',
    price: '2.99',
    categorySlug: 'pantry',
    imageUrl: IMAGES.pantry,
    stock: 70,
    isFeatured: false,
    salesCount: 139,
  },

  // Household Essentials (3)
  {
    name: 'Botanical Dish Soap — Lemon Balm',
    description: 'Plant-derived grease-cutting dishwashing liquid gentle on hands and biodegradable.',
    unit: '500 ml pump bottle',
    price: '5.29',
    categorySlug: 'household-essentials',
    imageUrl: IMAGES.household,
    stock: 42,
    isFeatured: false,
    salesCount: 115,
  },
  {
    name: 'Fresh Linen Liquid Laundry Detergent',
    description: 'Concentrated hypoallergenic laundry wash delivering 32 clean loads with crisp linen scent.',
    unit: '1 liter bottle',
    price: '9.99',
    originalPrice: '11.99',
    categorySlug: 'household-essentials',
    imageUrl: IMAGES.household,
    stock: 30,
    isFeatured: false,
    salesCount: 104,
  },
  {
    name: '100% Bamboo Paper Towels',
    description: 'Unbleached, tree-free, high-absorbency kitchen rolls wrapped in plastic-free kraft paper.',
    unit: '4 jumbo rolls',
    price: '6.49',
    categorySlug: 'household-essentials',
    imageUrl: IMAGES.household,
    stock: 48,
    isFeatured: false,
    salesCount: 127,
  },
];

let seedPromise: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    try {
      const [{ value: catCount }] = await db
        .select({ value: count() })
        .from(categories);

      if (Number(catCount) === 0) {
        const insertedCategories = await db
          .insert(categories)
          .values(SEED_CATEGORIES)
          .onConflictDoNothing()
          .returning();

        const allCats =
          insertedCategories.length > 0
            ? insertedCategories
            : await db.select().from(categories);

        const slugToId = new Map(allCats.map((c) => [c.slug, c.id]));

        const [{ value: prodCount }] = await db
          .select({ value: count() })
          .from(products);

        if (Number(prodCount) === 0) {
          const rowsToInsert = SEED_PRODUCTS.map((p) => ({
            name: p.name,
            description: p.description,
            unit: p.unit,
            price: p.price,
            originalPrice: p.originalPrice ?? null,
            categoryId: slugToId.get(p.categorySlug)!,
            imageUrl: p.imageUrl,
            stock: p.stock,
            isFeatured: p.isFeatured,
            salesCount: p.salesCount,
          }));

          await db.insert(products).values(rowsToInsert);
        }
      }

      // Ensure default admin & sample verified customer exist
      const existingAdmin = await db
        .select()
        .from(profiles)
        .where(eq(profiles.email, 'admin@freshcart.com'))
        .limit(1);

      if (existingAdmin.length === 0) {
        const adminHash = await bcrypt.hash('Admin@123456', 10);
        await db
          .insert(profiles)
          .values({
            uid: 'local-admin-freshcart',
            fullName: 'FreshCart Store Manager',
            email: 'admin@freshcart.com',
            phone: '+1 (555) 210-4400',
            passwordHash: adminHash,
            role: 'admin',
            emailVerified: true,
          })
          .onConflictDoNothing();
      }

      const existingCustomer = await db
        .select()
        .from(profiles)
        .where(eq(profiles.email, 'customer@freshcart.com'))
        .limit(1);

      if (existingCustomer.length === 0) {
        const customerHash = await bcrypt.hash('Customer@123456', 10);
        await db
          .insert(profiles)
          .values({
            uid: 'local-customer-freshcart',
            fullName: 'Maya Patel',
            email: 'customer@freshcart.com',
            phone: '+1 (555) 890-1234',
            passwordHash: customerHash,
            role: 'customer',
            emailVerified: true,
          })
          .onConflictDoNothing();
      }
    } catch (error) {
      seedPromise = null;
      console.error('Failed to seed FreshCart database:', error);
      throw new Error('Database initialization failed.', { cause: error });
    }
  })();

  return seedPromise;
}
