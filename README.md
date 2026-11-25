# VetBölge

Aydın / Karpuzlu ve Aydın / Koçarlı saha görevlendirme uygulaması.

## Vercel ayarları
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`

Vercel > Project > Settings > Environment Variables bölümüne:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

değerlerini ekleyin. Supabase `service_role` / secret key kullanmayın.

## Beklenen Supabase alanları
`villages`: `id`, `name`, `district`
`assignments`: `id`, `village_id`, `vet_name`, `status`, `notes`, `created_at`, `updated_at`

Uygulama ortak ekip hesabıyla giriş yapacak şekilde tasarlanmıştır.
