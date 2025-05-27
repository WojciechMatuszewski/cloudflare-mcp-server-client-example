import {
  OAuthProviders,
  OTPMethods,
  Products,
  type StytchEvent,
  type StytchLoginConfig
} from "@stytch/vanilla-js";
import {
  IdentityProvider,
  StytchLogin,
  useStytch,
  useStytchUser
} from "@stytch/react";
import { useEffect, useMemo } from "react";

const withLoginRequired = (Component: React.FC) => () => {
  const { user, fromCache } = useStytchUser();

  useEffect(() => {
    if (!user && !fromCache) {
      localStorage.setItem("returnTo", window.location.href);
      window.location.href = "/login";
    }
  }, [user, fromCache]);

  if (!user) {
    return null;
  }

  return <Component />;
};

const onLoginComplete = () => {
  const returnTo = localStorage.getItem("returnTo");
  if (returnTo) {
    localStorage.setItem("returnTo", "");
    window.location.href = returnTo;
  } else {
    window.location.href = "/todoapp";
  }
};

export function Login() {
  const loginConfig = useMemo<StytchLoginConfig>(
    () => ({
      products: [Products.otp, Products.oauth],
      otpOptions: {
        expirationMinutes: 10,
        methods: [OTPMethods.Email]
      },
      oauthOptions: {
        providers: [{ type: OAuthProviders.Google }],
        loginRedirectURL: window.location.origin + "/authenticate",
        signupRedirectURL: window.location.origin + "/authenticate"
      }
    }),
    []
  );

  const handleOnLoginComplete = (evt: StytchEvent) => {
    if (evt.type !== "AUTHENTICATE_FLOW_COMPLETE") return;
    onLoginComplete();
  };

  return (
    <StytchLogin
      config={loginConfig}
      callbacks={{ onEvent: handleOnLoginComplete }}
    />
  );
}

/**
 * The OAuth Authorization page implementation. Wraps the Stytch IdentityProvider UI component.
 * View all configuration options at https://stytch.com/docs/sdks/idp-ui-configuration
 */
export const Authorize = withLoginRequired(function () {
  return <IdentityProvider />;
});

/**
 * The Authentication callback page implementation. Handles completing the login flow after OAuth
 */
export function Authenticate() {
  const client = useStytch();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) return;

    client.oauth
      .authenticate(token, { session_duration_minutes: 60 })
      .then(onLoginComplete);
  }, [client]);

  return <>Loading...</>;
}

export const Logout = function () {
  const stytch = useStytch();
  const { user } = useStytchUser();

  if (!user) return null;

  return (
    <button className="primary" onClick={() => stytch.session.revoke()}>
      {" "}
      Log Out{" "}
    </button>
  );
};
