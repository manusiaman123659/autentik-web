// Explicit exceptions; source schema/form compatibility is checked by the foundation harness.
const allowed = new Set([
  'lib/validations/contactSchema.ts',
  'lib/validations/productSchema.ts',
  'components/admin/ProductForm.tsx',
  'lib/validations/productTranslationSchema.ts',
  'lib/actions/productTranslations.ts',
  'lib/actions/products.ts', // 003: focused verifier covers B2B-only public invalidation.
  // DATA-INTEGRITY-001: explicit create/update covered by verify-data-integrity.cjs.
  'lib/actions/brands.ts',
  'lib/actions/careers.ts',
  'lib/actions/relasi.ts',
  'supabase/migrations/0066_product_translation_foundation.sql',
]);
module.exports = diff => diff.trim().split(/\r?\n/).filter(file => file && !allowed.has(file)).join('\n');
