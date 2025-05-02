import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// import reportWebVitals from './reportWebVitals';
import { Auth0Provider } from '@auth0/auth0-react';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Auth0Provider
domain="optimus-sandbox.us.auth0.com"
clientId="oqwR0oWXVLzbdfjiQ13xq8TvZW5a2aNR"
authorizationParams={{
  redirect_uri: window.location.origin, 
}}
cacheLocation="memory" // Changes from localStorage to memory storage
useRefreshTokens={true} // Enables silent authentication
useRefreshTokensFallback={true} // Ensures it works in all browsers
>
<React.StrictMode>
<App />
</React.StrictMode>

</Auth0Provider>, 
// document. getElementById('root')
);

