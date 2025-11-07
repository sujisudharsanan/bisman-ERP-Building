"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type TawkUser = {
  userName?: string | null;
  userEmail?: string | null;
  accountId?: string | number | null;
};

declare global {
  interface Window {
    Tawk_API?: any;
    Tawk_LoadStart?: Date;
    __tawkInjected?: boolean;
    __tawkEmbeddedId?: string;
  }
}

const CONTAINER_ID = "erpChatBox"; // existing chat container in ERPChatWidget

function injectTawkInlineOnce(propertyId: string, widgetId: string) {
  if (typeof window === 'undefined') return;
  if (window.__tawkInjected) return;

  window.Tawk_API = window.Tawk_API || {};
  window.Tawk_LoadStart = new Date();
  // mount into our container rather than floating widget
  window.Tawk_API.embedded = CONTAINER_ID;

  const scriptId = "tawk-inline-script";
  if (!document.getElementById(scriptId)) {
    const s1 = document.createElement("script");
    s1.id = scriptId;
    s1.async = true;
    s1.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
    s1.charset = "UTF-8";
    s1.setAttribute("crossorigin", "*");
    const s0 = document.getElementsByTagName("script")[0] || document.body.firstChild;
    (s0?.parentNode || document.head).insertBefore(s1, s0 as any);
  }

  window.__tawkInjected = true;
  window.__tawkEmbeddedId = CONTAINER_ID;
}

function configureVisitor(user: TawkUser) {
  if (!window.Tawk_API) return;
  try {
    if (user.userName || user.userEmail) {
      window.Tawk_API.setVisitor?.({
        name: user.userName || undefined,
        email: user.userEmail || undefined,
      }, () => {});
    }
  } catch {}

  try {
    window.Tawk_API.setAttributes?.({
      accountId: user.accountId ? String(user.accountId) : undefined,
    }, () => {});
  } catch {}
}

function hideFloatingIfAny() {
  try {
    window.Tawk_API?.hideWidget?.();
    window.Tawk_API?.minimize?.();
  } catch {}
}

export default function TawkInline({ open, user }: { open: boolean; user: TawkUser }) {
  const pathname = usePathname();
  const initialized = useRef(false);

  const enabled = String(process.env.NEXT_PUBLIC_TAWK_ENABLED ?? 'true').toLowerCase() !== 'false';
  const propertyId = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID || '';
  const widgetId = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID || '';

  // Lazy load when panel opens
  useEffect(() => {
    if (!enabled || !open || !propertyId || !widgetId) return;
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    injectTawkInlineOnce(propertyId, widgetId);

    if (window.Tawk_API) {
      configureVisitor(user);
      hideFloatingIfAny();
    } else {
      // wait for script load then configure
      window.Tawk_API = window.Tawk_API || {};
      const prevOnLoad = window.Tawk_API.onLoad;
      window.Tawk_API.onLoad = function () {
        prevOnLoad?.();
        configureVisitor(user);
        hideFloatingIfAny();
      };
    }

    initialized.current = true;
  }, [open, enabled, propertyId, widgetId, user?.userName, user?.userEmail, user?.accountId]);

  // SPA route updates
  useEffect(() => {
    if (!initialized.current || !window.Tawk_API) return;
    try {
      window.Tawk_API.setAttributes?.({ route: pathname, url: typeof window !== 'undefined' ? window.location.href : '' }, () => {});
    } catch {}
  }, [pathname]);

  return null;
}
