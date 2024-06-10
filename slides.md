---
layout: intro-image
theme: apple-basic
mdc: true
---

# Load Testing with k6
June, 2024

---

# About Me

Tibor Pilz

- Senior Software Engineer @ Team Foundation
- Avid tinkerer
- ~~[Overengineering]{class="opacity-60"}~~ Automation enthusiast

::socials
  [tiborpilz](https://github.com/tiborpilz) on Github <Github />  
  [@tibor@bumscode](https://bumscode.com/@tibor) on Mastodon <Mastodon />
::

<!--

[click]
- Senior Software Engineer @ Team Foundation
  - Responsible for the platform of myCampus 2.0
  - Including the microfrontend orchestrator & core utilities

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
    
- Prior experience with load testing:
  - Tested an application for a client at my previous job
  - Purpose: Find out how many user the system can handle before it hits 2 seconds response time or breaks
-->

---

# Agenda

1. Understanding Load Testing
2. Introduction to k6
3. Running k6 Tests
4. Analyzing Results

---

# How fast is your API?
<!-- 5 minutes -->

How do you know?

::v-clicks
- Browser Dev Tools
  - Manual process
  - Snapshot in time and environment
  - No aggregable data
- Monitoring
  - Real user data
  - Aggregated
  - Only current state of features & load
::

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

::v-clicks
- **Performance Testing**
- **Load Testing**
- **Stress Testing**
- **Spike Testing**
- **Endurance Testing**
::

<Source href="https://grafana.com/load-testing/types-of-load-testing" />

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

::v-clicks
- **Non-Linear Scaling**
- **Bottleneck Identification**
- **Bug Detection**
::


<Source href="https://k6.io/why-your-organization-should-perform-load-testing/" />

<!-- 

- talked about benefits of load testing over monitoring already
- let's go into more detail
- why not just extrapolate from monitoring data?

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
- with proper load tests, you're not only looking at response times
  but also check the responses for correctness
- concurrency issues
- database deadlocks
- cache issues
- things you generally won't see under light loads.
-->

---

# What does a Load Test look like?

- Look at user journeys
- Model realistic user behavior
- Don't split up interactions
- Consider only necessary requests

<!--

- Your tests should encompass some part of a user journey
- If an interaction requires multiple requests in sequence, don't split them up
- Don't include requests that are not necessary for the test
  - This includes images, fonts, etc.

-->

---

# k6

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

export default function (data) {...}

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
```javascript{6-17|16}
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {...};

export function setup() {
  const { username, password } = JSON.parse(open('./env.json'));
  
  const tokenResponse = http.post('https://api.example.com/oauth/token', {
    grant_type: 'password',
    username,
    password,
  })

  authToken = tokenResponse.json('access_token');
  return { authToken };
}

export default function (data) {...}

export function teardown(data) {...}
```
```javascript{8-19|9-13|14-16|17}
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {...};

export function setup() {...}

export default function (data) {
  const apiResponse = http.get('https://api-dev.iu.org/myiu-booking/v1/student?forceSync=false', {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });
  check(apiResponse, {
    'API request succeeded': (r) => r.status === 200,
  });
  sleep(1);
}

export function teardown(data) {...}
```
```javascript{10-12}
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {...};

export function setup() {...}

export default function (data) {...}

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

# Structuring Tests and Results

- Modules
- Groups
- Tags

<!--
- For simple tests, the example above is sufficient
- But as we said earlier, we want to test journeys
- For cases with more than one request, it's useful to structure the test code
- 1. To keep the test code organized and maintainable
- 2. To get more useful results

- Both Modules and Groups help with that
- Tags help with filtering and categorizing test results

-->

---

# Modules

- Built-in modules
  - `k6`
  - `k6/http`
  - ... and more
- Remote modules
  - Installable via HTTP (like deno)
  - No central registry
- Local modules
- No native support of npm modules (try a bundler)

<Source href="https://k6.io/docs/using-k6/modules/" />

<!--
- We already saw an example for built-in modules, `http` and `check`
- There's more:
  - `html` for parsing HTML
  - `crypto` for cryptographic functions
  - `ws` for WebSocket testing
  
- you can use remote modules for more functionality
  - These are modules that are not part of the k6 runtime
  - They can be installed via http, similar to deno
  - (There's no central registry)

- Local modules are just files in the same directory as the test file
  - They can be imported using relative paths
  - They can be used to organize test code
  - They have no impact on the test results
  
- Due to the custom runtime, npm modules are not supported
  - The official recommendation is to use a bundler
  - Though you might run into compatibility issues
  
-->

---

# Tags & Groups

````md magic-move
```javascript{*|2|3-4}
export default function () {
  const [commentsResponse, postsResponse] = http.batch([
    ['GET', 'https://api.example.com/user/comments'],
    ['GET', 'https://api.example.com/user/posts'],
  ]);
}
```
```javascript{3-4}
export default function () {
  const [commentsResponse, postsResponse] = http.batch([
    ['GET', 'https://api.example.com/user/comments', { tags: { service: 'User' } }],
    ['GET', 'https://api.example.com/user/posts', { tags: { service: 'User' } }],
  ]);
}
```
```javascript{*|2}
export default function () {
  group('User Profile', function () {
    const [commentsResponse, postsResponse] = http.batch([
      ['GET', 'https://api.example.com/user/comments'],
      ['GET', 'https://api.example.com/user/posts'],
    ]);
  });
}
```
```javascript{8-11}
export default function () {
  group('Profile', function () {
    const [commentsResponse, postsResponse] = http.batch([
      ['GET', 'https://api.example.com/user/comments'],
      ['GET', 'https://api.example.com/user/posts'],
    ]);
    
    const ids = commentsResponse.slice(0, 5).map(({ id }) => id);
    const commentsResponse = http.batch(
      ids.map((id) => http.get(`https://api.example.com/comment/${id}`))
    );
  });
}
```
```javascript{2-16|3-8|10-15}
export default function () {
  group('Profile', function () {
    group('Overview', function () {
      const [commentsResponse, postsResponse] = http.batch([
        ['GET', 'https://api.example.com/user/comments'],
        ['GET', 'https://api.example.com/user/posts'],
      ]);
    });
    
    group('Comments', function () {
      const ids = commentsResponse.slice(0, 5).map(({ id }) => id);
      const commentsResponse = http.batch(
        ids.map((id) => ['GET', `https://api.example.com/comment/${id}`])
      );
    });
  });
}
```
````

<Source href="https://k6.io/docs/using-k6/tags-and-groups/" />

<!--
- example: testing the API for a user profile page
- two requests, one for a user's comments and one for their posts
- hypothetical user service

[click]
- http.batch` to make them parallel (remember, k6 is sync-per-default)
  
[click]
- only way to distinguish the two requests is by the URL
- but if they are part of a larger test suite, it would be nice to know that these are part of the user service

[click]
- To add metadata to requests, we can use the `tags` parameter
- This example tags them with `service: User`
- Tags can be used later to filter results

[click]
- Another approach: Grouping

[click]
- Done by wrapping parts of the test in a `group` function together with a name
- Useful for splitting up the test into logical parts
- Also useful for measuring multiple requests together

[click]
- Add another request to the example that can only be made after the comments have been fetched
- If we don't want to measure the duration of the individual requests, we can also measure the entire group's duration
- Vital for testing bigger chunks of functionality
-->

---

# Typescript Support

- No built-in support for typescript
- `@types/k6` for type definitions
- `grafana/k6-template-typescript` for webpack setup
  - (Bonus: can bundle npm modules)
  
<Source href="https://github.com/grafana/k6-template-typescript" />

---

# Record tests
- Browser Recorder
  - Chrome & Firefox extension
  - Records browser interactions
  - Saves as k6 test
  
- HAR to k6 converter
  - Convert browser network logs to k6 tests

- Need to be cleaned up
- No dynamic data

<Source href="https://k6.io/docs/test-authoring/create-tests-from-recordings/" />

---

# Execution Modes

- Local
  - Runs on your machine
  - Surprisingly sufficient up to a thousand VUs
- Distributed
  - Runs on k8s using k6-operator
  - Runs on multiple machines
- Cloud
  - Uses k6 Cloud SaaS

---

# Running k6 Tests

```bash{*}
k6 run test.js
```

```bash{*|11|14-16|16}
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
    ...
```

<!--

- Running a test with `k6 run test.js` will execute the test and output a summary

- Summary of some general information
  - execution mode
  - script file
  - output format (if any, more on that later)
  - number of VUs, stages - the duration
  - Graceful stop keeps the VUs running for a bit (default 30 seconds) to finish their current iteration
  - Otherwise there'd be errors at the end of the test

[click]
- Shows how many checks failed

[click]
- Shows metrics for all requests
- It splits up the http metrics into parts of the request, like blocked, connecting etc.
  (there's more metrics, truncated here)
  
[click]
- Also shows metrics for the entire http duration
- While helpful as an overview, since this is aggregated accross all requests, it's not useful for actual insights

-->

---

# Output

<v-clicks>

- Console
  ```bash
  k6 run test.js
  ```

- JSON
  ```bash
  k6 run --out json=test.json test.js
  ```

- InfluxDB
  ```bash
  k6 run --out influxdb=http://localhost:8086/k6 test.js
  ```

</v-clicks>

---

# InfluxDB & Grafana

<v-clicks>

- InfluxDB
  - Time-series database
  - Stores individual request data
- Grafana
  - Visualization tool
  - Connects to InfluxDB
- Can both be run locally via `docker-compose`

</v-clicks>

---
layout: fullscreen
---

<iframe class="w-full h-full" src="http://localhost:3000/d/XKhgaUpik/k6-load-testing-results-by-groups?orgId=1&var-Measurement=http_req_duration&var-URL=All&var-Group=All&var-Tag=All&from=1717661751437&to=1717662118017" />

---

# (Unsorted) Thoughts & Outlook

- Load testing should be a team's responsibility
- Shared functionality in k6 framework looks like a good way to go
- k6 go extensions seem pretty cool

---

# Fin

- Thanks for listening!
- Questions?
