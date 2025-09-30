#!/usr/bin/env bash
# macOS-compatible curl script: POST demo creds to /api/login, save cookies, then request /dashboard
set -euo pipefail

COOKIE_JAR="cookies.txt"
HEADERS_LOGIN="headers_login.txt"
HEADERS_DASH="headers_dashboard.txt"
DASH_BODY="dashboard_body.html"

API_LOGIN_URL="http://127.0.0.1:3000/api/login"
DASH_URL="http://127.0.0.1:3000/dashboard"

# demo credentials (adjust if your app expects different fields)
DEMO_EMAIL="admin@business.com"
DEMO_PASSWORD="admin123"

# cleanup
rm -f "$COOKIE_JAR" "$HEADERS_LOGIN" "$HEADERS_DASH" "$DASH_BODY"

echo "==> POSTing demo credentials to $API_LOGIN_URL (saving Set-Cookie to $COOKIE_JAR)"
# POST and save headers + cookies; do not follow redirects so we can observe 3xx if returned
HTTP_STATUS_LOGIN=$(curl -4 -sS -D "$HEADERS_LOGIN" -o /dev/null -w "%{http_code}" -c "$COOKIE_JAR" -X POST -H "Content-Type: application/json" -d '{"email":"'"$DEMO_EMAIL"'","password":"'"$DEMO_PASSWORD"'"}' "$API_LOGIN_URL" 2>/dev/null || true)
HTTP_STATUS_LOGIN=${HTTP_STATUS_LOGIN:-000}
echo "Login HTTP status: $HTTP_STATUS_LOGIN"
echo "Login response headers (including Set-Cookie):"
if [ -f "$HEADERS_LOGIN" ]; then
  sed -n '1,200p' "$HEADERS_LOGIN"
else
  echo "(no headers saved)"
fi
echo

echo "==> Saved cookie-jar ($COOKIE_JAR):"
if [ -s "$COOKIE_JAR" ]; then
  cat "$COOKIE_JAR"
else
  echo "(no cookies were saved in the jar)"
fi
echo

echo "==> Requesting $DASH_URL using saved cookies"
HTTP_STATUS_DASH=$(curl -4 -sS -D "$HEADERS_DASH" -o "$DASH_BODY" -w "%{http_code}" -b "$COOKIE_JAR" "$DASH_URL" 2>/dev/null || true)
HTTP_STATUS_DASH=${HTTP_STATUS_DASH:-000}
echo "Dashboard HTTP status: $HTTP_STATUS_DASH"
echo "Dashboard response headers:"
if [ -f "$HEADERS_DASH" ]; then
  sed -n '1,200p' "$HEADERS_DASH"
else
  echo "(no headers saved)"
fi
echo

echo "==> Dashboard response body saved to: $DASH_BODY (first 800 chars):"
if [ -f "$DASH_BODY" ]; then
  head -c 800 "$DASH_BODY" || true
  echo
else
  echo "(no body saved)"
fi

echo
echo "==> Quick checks / suggestions if no cookie was saved:"
echo "- Did the /api/login handler issue a Set-Cookie header? Check the 'Set-Cookie' lines above."
echo "- If Set-Cookie exists but the cookie-jar is empty, verify cookie attributes: SameSite, Secure, Domain, Path. For local HTTP, Secure must be false and SameSite should allow Lax or None+Secure if using HTTPS."
echo "- Ensure your frontend's fetch uses 'credentials: \"include\"' so the browser sends and stores cookies."
echo "- If the cookie name differs (e.g. server sets 'token' but client expects 'access_token'), reconcile them or update middleware accordingly."
echo "- If using a proxy, confirm it does not strip Set-Cookie or rewrite domains/paths."
