import { put } from '@vercel/blob';
 
export async function PUT(request: Request) {
  const form = await request.formData();
  const file = form.get('file') as File;
  const blob = await put('avatars/user-42.png', file, { access: 'public' });
 
  return Response.json(blob);
}