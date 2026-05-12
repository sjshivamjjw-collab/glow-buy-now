
-- Rename existing categories to fit new taxonomy
UPDATE public.categories SET name='Beauty & Personal Care', slug='beauty-personal-care', description='Skincare, makeup, grooming' WHERE slug='beauty';
UPDATE public.categories SET name='Home Decor', slug='home-decor', description='Decor and home essentials' WHERE slug='home-kitchen';
UPDATE public.categories SET name='Kids & Baby', slug='kids-baby', description='Kids clothing, toys, baby care' WHERE slug='fashion';

-- Reassign products from categories we will remove → Home Decor
UPDATE public.products SET category_id=(SELECT id FROM public.categories WHERE slug='home-decor')
WHERE category_id IN (SELECT id FROM public.categories WHERE slug IN ('books','electronics','sports'));

-- Remove unused categories
DELETE FROM public.categories WHERE slug IN ('books','electronics','sports');

-- Add Food & Beverage
INSERT INTO public.categories (name, slug, description)
VALUES ('Food & Beverage','food-beverage','Snacks, drinks, gourmet')
ON CONFLICT (slug) DO NOTHING;
