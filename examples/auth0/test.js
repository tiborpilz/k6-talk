import http from 'k6/http';
import { check, sleep } from 'k6';

const env = JSON.parse(open('./env.json'));

const { domain, clientId, audience, username, password } = env;

let authToken;

function getToken() {
  const tokenResponse = http.post(`https://${domain}/oauth/token`, {
    grant_type: 'password',
    client_id: clientId,
    username: username,
    password: password,
    audience: audience,
    scope: 'openid profile email'
  });

  // Check if the token request was successful
  check(tokenResponse, {
    'Token request succeeded': (r) => r.status === 200,
  });

  authToken = tokenResponse.json('access_token');
}

export default function () {
  if (__ITER === 0) { // Only fetch the token on the first iteration
    getToken();
  }

  // Use the token to authenticate a request
  const apiResponse = http.get('https://api-dev.iu.org/myiu-booking/v1/student?forceSync=false', {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  console.log(apiResponse.body);

  // Check if the API request was successful
  check(apiResponse, {
    'API request succeeded': (r) => r.status === 200,
  });

  sleep(1);
}
