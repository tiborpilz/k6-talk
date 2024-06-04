import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
  stages: [
    { duration: '5s', target: 500 },
    { duration: '10s', target: 500 },
  ],
};

export default function () {
  const res = http.get('http://localhost:8000');
  // Check if the API request was successful
  check(res, {
    'request succeeded': (r) => r.status === 200,
  });
  sleep(1);
}
