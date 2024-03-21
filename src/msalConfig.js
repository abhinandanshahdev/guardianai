// msalConfig.js
import { PublicClientApplication } from '@azure/msal-browser';

export const msalConfig = {
    auth: {
        clientId: "4e58be87-fa2c-44af-b4a3-a5bc4e915fb2", // Your Azure AD application client ID
        authority: "https://login.microsoftonline.com/common", // Or your Azure AD tenant ID
        redirectUri: "http://localhost:4000" // The redirect URI registered in Azure AD
    },
    cache: {
        cacheLocation: "sessionStorage", // This configures where your tokens are stored
        storeAuthStateInCookie: false, // Set to true if you are having issues on IE11 or Edge
    }
};

// Initialize the MSAL application object
export const msalInstance = new PublicClientApplication(msalConfig);
await msalInstance.initialize();
