import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
// import reportWebVitals from './reportWebVitals';
import { Auth0Provider } from '@auth0/auth0-react';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <Auth0Provider
domain="retail-tech.us.auth0.com"
clientId="n9I94AZIJcNyUf1eYAv2vR1vRyIy0jbm"
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

