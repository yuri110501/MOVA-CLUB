import { signIn, safeAdminReturn } from '@/auth';
export const dynamic='force-dynamic';
// Top-level navigation from the admin panel starts Google sign-in.
export async function GET(request:Request){
  await signIn('google',{redirectTo:safeAdminReturn(new URL(request.url).searchParams.get('return_to'))});
}