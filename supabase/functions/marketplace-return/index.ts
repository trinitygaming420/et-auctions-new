import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve((request) => {
  const url = new URL(request.url);
  const result = url.searchParams.get("result");

  const cancelled = result === "cancel";
  const needsRefresh = result === "refresh";

  let heading = "Financial setup received";
  let message =
    "Return to E&T Auctions. The app will check your Stripe account status.";

  if (cancelled) {
    heading = "Setup cancelled";
    message =
      "No changes were made. Return to E&T Auctions when you are ready to continue.";
  }

  if (needsRefresh) {
    heading = "Continue financial setup";
    message =
      "Your secure Stripe setup link expired or needs to be refreshed. Return to E&T Auctions and select Start or continue setup again.";
  }

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >
  <title>E&T Auctions Financial Setup</title>
  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: #0b0d12;
      color: #ffffff;
      font-family: Arial, Helvetica, sans-serif;
    }

    .card {
      width: 100%;
      max-width: 520px;
      padding: 32px;
      border: 1px solid #29303d;
      border-radius: 22px;
      background: #12161e;
      text-align: center;
      box-shadow: 0 20px 55px rgba(0, 0, 0, 0.4);
    }

    .logo {
      width: 72px;
      height: 72px;
      margin: 0 auto 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: #ff5b2a;
      color: #ffffff;
      font-size: 25px;
      font-weight: 800;
    }

    h1 {
      margin: 0 0 14px;
      font-size: 28px;
    }

    p {
      margin: 0 0 26px;
      color: #aeb6c5;
      font-size: 17px;
      line-height: 1.55;
    }

    a {
      display: block;
      width: 100%;
      padding: 16px 20px;
      border-radius: 14px;
      background: #ff5b2a;
      color: #ffffff;
      font-size: 17px;
      font-weight: 700;
      text-decoration: none;
    }

    .note {
      margin-top: 18px;
      color: #737d8f;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <main class="card">
    <div class="logo">E&T</div>
    <h1>${heading}</h1>
    <p>${message}</p>

    <a href="etlive://financial-setup">
      Return to E&T Auctions
    </a>

    <div class="note">
      If the app does not open, close this page and open E&T Auctions manually.
    </div>
  </main>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
});
