/**
 * Legacy URL Redirect
 * This route now redirects to the unified /dashboard
 * The dashboard dynamically handles STORE_INCHARGE role
 */

import { redirect } from 'next/navigation';

export default function StoreInchargeRedirect() {
  redirect('/dashboard');
}
