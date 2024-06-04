---
layout: intro-image
theme: apple-basic
image: ./OVH-fire.jpeg
transition: fade
mdc: true
---

# Load Testing with k6
June, 2024

---

# About Me

<!-- 2 minutes -->

Tibor Pilz

- Senior Software Engineer @ Team Foundation
- Avid tinkerer
- ~~Overengineering~~ Automation enthusiast

<div class="absolute bottom-10">
<p><a href="https://github.com/tiborpilz">tiborpilz</a> on Github</p>
<p><a href="https://bumscode.com/@tibor">@tibor@bumscode</a> on Mastodon</p>
</div>

<!--

[click]
- Senior Software Engineer @ Team Foundation
  - Responsible for the platform of myCampus 2.0
  - Microfrontend Orchestrator
  - Authentication
  - Booking Microservice that is used directly or inderectly by all microfrontends on the platform

[click]
- Avid tinkerer
  - I like to play around with new technologies
  - modded my espresso machine to be controlled by an Arduino
  - Broke a lot of things in the process
  
[click]
- Automation obsessed
  - I like to automate things
  - If I'm doing something more than once, you can bet that I'm spending hours building an automation
    even if only it takes 30 minutes twice a year.
-->

---


# Agenda

<!-- 1 Minute 30 Seocnds -->

1. Understanding Load Testing
2. Introduction to k6
3. Running k6 Tests
4. Analyzing Results

---

# How fast is your API?

<!-- 5 minutes -->

How do you know?

<v-clicks>

- Browser Dev Tools
  - Manual process
  - Snapshot in time and environment
  - No aggregable data
- Monitoring
  - Real user data
  - Aggregated
  - Only current state of features & load

</v-clicks>

<!--

- guessing most people maintain some sort of endpoint
- have some idea of how fast they are
- maybe not absolute numbers, but relative to each other
  - there's the fast one that you don't even think about
  - there's the slow one - the one that processes a pdf or depends on a slow third-party service (careful with those)
- But how do you know?

[click]
- Browser DevTools
  - Checking the network tab, either to look at the response times or just to see if the request was made at all
  - But this is manual and only gives you a snapshot
  - Maybe it's even on dev only
  - Since it's manual, you can't aggregate the data (you can't even save it, really, unless you want to copy it into a spreadsheet)

[click]
- Monitoring
  - Gives you a more complete picture
  - Actual userdata
  - Maybe you even aggregate it, look at percentiles (we'll get to that)
  - But it will only tell you what's currently happening 
  - both in terms of amount of users
  - and in terms of features
  - Can the feature you have been working for months on actually handle the load you expect?
  - Can your system handle a new intake of students, bigger than the ones seen before?

-->

---

# Terminology

<!-- 3 Minutes -->

<v-clicks>

- **Performance Testing**
- **Load Testing**
- **Stress Testing**
- **Spike Testing**
- **Endurance Testing**

</v-clicks>

<div class="absolute bottom-5 right-14 text-xs opacity-60">
<a href="https://grafana.com/load-testing/types-of-load-testing">https://grafana.com/load-testing/types-of-load-testing</a>
</div>


<!--

- Before we get into the details, let's clarify some terminology.

[click]
- **Performance Testing**: Umbrella term for all tests measuring system performance
[click]
- **Load Testing**: Tests using synthetic load
  - If used specifically, refers to the expected load
  - For example, if you expect 100k students doing 100 requests per minute, that's your aim
  - Generally, any test involving synthetic load
  - This is also the definition we'll use today
[click]
- **Stress Testing**: Testing beyond expected load
  - Using the example above, you don't stop at X requests per minute, you go beyond that until something breaks
[click]
- **Spike Testing**: Testing sudden load spikes
  - stress testing is about increasing the load over a period of time
  - spike testing is about condensing that into a very short period, to see whether the system is overwhelmed
[click]
- **Endurance Testing**: Testing over a long period
  - Goes in the opposite direction of spike testing
  - Regular load tests might run for a few minutes up to half an hopur
  - Endurance tests run for dozens of hours, sometimes even days
  - Purpose is to find difference in behavior under sustained load, like memory leaks

https://grafana.com/load-testing/types-of-load-testing/#load-testing-vs-performance-testing
-->

---

# Why Load Testing?

<div class="absolute bottom-5 right-14 text-xs opacity-60">
https://k6.io/why-your-organization-should-perform-load-testing/
</div>
<!-- 3 Minutes 30 Seconds -->

<v-clicks>

- **Performance Dependency**
- **Non-Linear Scaling**
- **Bottleneck Identification**
- **Bug Detection**

</v-clicks>

<!-- 

- talked about benefits of load testing over monitoring already
- let's go into more detail
- why not just extrapolate from monitoring data?

[click]
### Performance Dependency
System performance changes with varying user loads.

[click]
### Non-Linear Scaling
- Performance is not linearly scalable.
- doubling the load doesn't just the response time.
- It might not impact the response time at all, because there's juIt might increase exponentially.
Your system might work fine with 100 users but will start to randomly drop requests with 1000 users. The failure rate itself won't scale linearly either,
it could be that ~900 users are fine, but the last 100 users will suddenly push the system to fail half of the requests.

[click]
### Bottleneck Identification
- When encountering performance issues, you want to find what's responsible
- Something like concurrent database connections, slow third-party services, or even inefficient code

[click]
### Bug Detection
- concurrency issues
- database deadlocks
- cache issues
- things you generally won't see under light loads.
-->

---

# k6

<!-- 1 Minute 30 seconds -->

- CLI tool
- Scripted tests written in Javascript
- Custom runtime
- Open Source and enterprise SaaS
- Maintained by Grafana Labs

<!-- 
- CLI tool that executes tests written in Javascript
- Uses a custom runtime written in go, allowing for high concurrency and sync-per-default behavior
- SaaS offering includes cloud execution, results storage (using InfluxDB) and Grafana dashboards
- The good thing is, those things can be self-configured as well
- k6 was acquired by Grafana Labs in 2021.
-->

---

# Anatomy of a k6 Test

````md magic-move
```javascript{*|1-2}
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {...};

export function setup() {...}

export default function () {...}

export function teardown(data) {...}

```
```javascript{4-10}
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {
    stages: [
        { duration: '30s', target: 20 }, // Ramp up
        { duration: '1m', target: 20 },  // Hold steady
    ],
};

export function setup() {...}

export default function (data) {...}

export function teardown(data) {...}
```
```javascript{6-13|12}
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {...};

export function setup() {
  const res = http.post('https://api.example.com/auth/login', {
    username: 'testuser',
    password: 'testpassword',
  });
  const authToken = res.json('authToken');
  return { authToken };
}

export default function (data) {...}

export function teardown(data) {...}
```
```javascript{8-15|9-13|14|15}
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {...};

export function setup() {...}

export default function (data) {
  const res = http.get('https://api.example.com/user', {
    headers: {
      Authorization: `Bearer ${data.authToken}`,
    },
  });
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}

export function teardown(data) {...}
```
```javascript{10-12}
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {...};

export function setup() {...}

export default function () {...}

export function teardown(data) {
  // Clean up resources, call a webhook, etc.
}
```
````

<!--
- Basic structure of a k6 test

[click]
- Bulding blocks are imported from the k6 module
  - This module is not a standard node module but part of the k6 runtime
  
[click]
- Options object contains configuration about the test
  - stages is an array of objects, each object representing a stage of the test
  - duration is the time the stage should run
  - target is the number of virtual users to simulate
  
[click]
- The setup function is called once before the test starts
  - It can be used to set up data that is needed for the test
  - The setup function is optional, but handy when doing authentication or other setup tasks
  
[click]
  - It can return data that is passed to the default and teardown functions
  
[click]
- The default function is the main function of the test
  - It is executed for each virtual user and for each iteration of the test
  - It is where the actual requests are made
  - It uses the data returned from the setup function
  
[click]
  - The request has been made synchronously
  
[click]
  - it can be checked immediately - checks are used to verify the response
  
[click]
  - After the request, the virtual user sleeps for 1 second because otherwise, it would just hammer the server with requests

[click]
- Lastly, the teardown function is called once after the test has finished
  - It can be used to clean up resources that were created in the setup function
  - It receives the data returned from the setup function
  - This stage is optional, but can be useful for cleaning up resources
  
  
https://k6.io/docs/using-k6/test-lifecycle/
 -->

---

# Running k6 Tests

```
k6 run test.js
```
```bash{*|11|16}
execution: local
    script: test.js
    output: -

scenarios: (100.00%) 1 scenario, 20 max VUs, 2m0s max duration (incl. graceful stop):
          * default: Up to 20 looping VUs for 1m30s over 2 stages (gracefulRampDown: 30s, gracefulStop: 30s)


    ✓ request succeeded

    checks.........................: 100.00% ✓ 1334      ✗ 0
    data_received..................: 820 kB  9.0 kB/s
    data_sent......................: 152 kB  1.7 kB/s
    http_req_blocked...............: avg=3.53ms   min=1µs      med=8µs      max=258.91ms p(90)=14µs     p(95)=20µs
    http_req_connecting............: avg=1.7ms    min=0s       med=0s       max=118.62ms p(90)=0s       p(95)=0s
    http_req_duration..............: avg=126.49ms min=110.57ms med=114.32ms max=10.11s   p(90)=120.23ms p(95)=120.95ms
      { expected_response:true }...: avg=126.49ms min=110.57ms med=114.32ms max=10.11s   p(90)=120.23ms p(95)=120.95ms
    http_req_failed................: 0.00%   ✓ 0         ✗ 1334
    http_req_receiving.............: avg=134.76µs min=17µs     med=102µs    max=2.76ms   p(90)=178µs    p(95)=233.34µs
    http_req_sending...............: avg=38.5µs   min=3µs      med=34µs     max=1.21ms   p(90)=55µs     p(95)=65µs
    http_req_tls_handshaking.......: avg=1.81ms   min=0s       med=0s       max=140.55ms p(90)=0s       p(95)=0s
    http_req_waiting...............: avg=126.31ms min=110.48ms med=114.11ms max=10.11s   p(90)=120.07ms p(95)=120.81ms
    http_reqs......................: 1334    14.649164/s
    iteration_duration.............: avg=1.13s    min=1.11s    med=1.11s    max=11.11s   p(90)=1.12s    p(95)=1.12s
    iterations.....................: 1334    14.649164/s
    vus............................: 1       min=1       max=20
    vus_max........................: 20      min=20      max=20


running (1m31.1s), 00/20 VUs, 1334 complete and 0 interrupted iterations
default ✓ [======================================] 00/20 VUs  1m30s
```
