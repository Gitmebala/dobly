export default function PostHogSnippet() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
  const autocapture = process.env.NEXT_PUBLIC_POSTHOG_AUTOCAPTURE === "true";
  const sessionReplay = process.env.NEXT_PUBLIC_POSTHOG_SESSION_REPLAY === "true";
  const requireConsent = process.env.NEXT_PUBLIC_ANALYTICS_REQUIRE_CONSENT === "true";

  if (!key) return null;

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once unregister identify alias set_config get_distinct_id isFeatureEnabled onFeatureFlags reloadFeatureFlags opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing reset".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
          posthog.init(${JSON.stringify(key)}, {
            api_host: ${JSON.stringify(host)},
            capture_pageview: false,
            autocapture: ${JSON.stringify(autocapture)},
            disable_session_recording: ${JSON.stringify(!sessionReplay)},
            opt_out_capturing_by_default: ${JSON.stringify(requireConsent)},
            persistence: "localStorage+cookie",
            person_profiles: "identified_only",
            loaded: function(posthog) {
              try {
                posthog.register({
                  app: "dobly",
                  environment: ${JSON.stringify(process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || "development")}
                });
              } catch (e) {}
            }
          });
        `,
      }}
    />
  );
}
