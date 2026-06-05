export type Category = 'Starters' | 'Pasta' | 'Pizza' | 'Mains' | 'Desserts' | 'Drinks';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  imageUrl: string;
  tags?: string[];
}

export const menuData: MenuItem[] = [
  {
    id: 's1',
    name: 'Bruschetta Classica',
    description: 'Toasted artisan bread, vine-ripened tomatoes, fresh basil, garlic, and extra virgin olive oil.',
    price: 12,
    category: 'Starters',
    imageUrl: 'https://images.unsplash.com/photo-1598514982205-f36b96d1e8d4?q=80&w=2070&auto=format&fit=crop',
    tags: ['Vegetarian']
  },
  {
    id: 's2',
    name: 'Burrata e Prosciutto',
    description: 'Creamy burrata cheese from Puglia, 24-month aged prosciutto di Parma, fig balsamic glaze.',
    price: 18,
    category: 'Starters',
    imageUrl: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?q=80&w=2074&auto=format&fit=crop',
  },
  {
    id: 'p1',
    name: 'Spaghetti Carbonara',
    description: 'Guanciale, Pecorino Romano, egg yolk, and black pepper. Authentic Roman style.',
    price: 22,
    category: 'Pasta',
    imageUrl: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?q=80&w=2071&auto=format&fit=crop',
  },
  {
    id: 'p2',
    name: 'Pappardelle al Cinghiale',
    description: 'Hand-made wide ribbon pasta, slow-braised wild boar ragù, Parmigiano-Reggiano.',
    price: 26,
    category: 'Pasta',
    imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?q=80&w=2132&auto=format&fit=crop',
  },
  {
    id: 'pz1',
    name: 'Margherita Verace',
    description: 'San Marzano tomato sauce, fresh mozzarella di bufala, basil, extra virgin olive oil.',
    price: 18,
    category: 'Pizza',
    imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?q=80&w=2069&auto=format&fit=crop',
    tags: ['Vegetarian']
  },
  {
    id: 'pz2',
    name: 'Diavola',
    description: 'San Marzano tomato sauce, mozzarella, spicy Calabrian salami, chili oil, basil.',
    price: 21,
    category: 'Pizza',
    imageUrl: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?q=80&w=2080&auto=format&fit=crop',
    tags: ['Spicy']
  },
  {
    id: 'm1',
    name: 'Bistecca alla Fiorentina',
    description: '32oz dry-aged T-bone steak, grilled over wood fire, served with rosemary roasted potatoes.',
    price: 85,
    category: 'Mains',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=2069&auto=format&fit=crop',
    tags: ['For Two']
  },
  {
    id: 'm2',
    name: 'Branzino al Forno',
    description: 'Whole roasted Mediterranean sea bass, lemon, capers, white wine, cherry tomatoes.',
    price: 34,
    category: 'Mains',
    imageUrl: 'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?q=80&w=2070&auto=format&fit=crop',
  },
  {
    id: 'd1',
    name: 'Tiramisù Tradizionale',
    description: 'Ladyfingers dipped in espresso, layered with mascarpone cream, dusted with cocoa.',
    price: 10,
    category: 'Desserts',
    imageUrl: 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?q=80&w=1974&auto=format&fit=crop',
  },
  {
    id: 'd2',
    name: 'Panna Cotta',
    description: 'Vanilla bean panna cotta, mixed berry compote, micro mint.',
    price: 9,
    category: 'Desserts',
    imageUrl: 'https://images.unsplash.com/photo-1610444390558-7a55debc216d?q=80&w=1974&auto=format&fit=crop',
  },
  {
    id: 'dr1',
    name: 'Aperol Spritz',
    description: 'Aperol, prosecco, soda water, orange slice.',
    price: 14,
    category: 'Drinks',
    imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?q=80&w=2064&auto=format&fit=crop',
  },
  {
    id: 'dr2',
    name: 'Negroni Classico',
    description: 'Gin, Campari, sweet vermouth, orange peel.',
    price: 16,
    category: 'Drinks',
    imageUrl: 'https://images.unsplash.com/photo-1574768393529-67d7168dbce6?q=80&w=2072&auto=format&fit=crop',
  }
];
