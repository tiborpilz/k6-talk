import http from 'k6/http';
import { sleep, check, group } from 'k6';

const getStages = (vus) => [
  { duration: '5s', target: vus },
  { duration: '30s', target: vus },
  { duration: '5s', target: 0 },
  { duration: '5s', target: 0 },
]

export const options = {
  stages: [
    ...getStages(1),
    ...getStages(5),
    ...getStages(10),
    ...getStages(20),
    ...getStages(50),
    ...getStages(100),
    ...getStages(200),
  ],
};

export default function () {
  group('A', () => {
    const aResponse = http.get('http://localhost:8000/a');

    // Check if the API request was successful
    check(aResponse, {
      'request a succeeded': (r) => r.status === 200,
    });
  });

  group('B', () => {
    const bResponse = http.get('http://localhost:8000/b');

    // Check if the API request was successful
    check(bResponse, {
      'request b succeeded': (r) => r.status === 200,
    });
  });
  sleep(1);
}
