import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 20 }, // Ramp up
        { duration: '1m', target: 20 },  // Hold steady
    ],
};

export default function () {
  // Request endpoint
  const res = http.get('https://httpbin.test.k6.io/get');

  // Check if the API request was successful
  check(res, {
    'request succeeded': (r) => r.status === 200,
  });

  sleep(1); // Adjust the sleep time based on your needs
}
