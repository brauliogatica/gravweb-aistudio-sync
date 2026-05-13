import auth0 from 'auth0-js';

export const auth0Client = new auth0.WebAuth({
    clientID: process.env.REACT_APP_CLIENT_ID,
    domain: process.env.REACT_APP_AUTH0_DOMAIN
  });
  auth0Client.crossOriginVerification();