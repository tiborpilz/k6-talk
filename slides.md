---
layout: cover
theme: apple-basic
---

# Load Testing with K6

---

# About Me

Tibor Pilz

- Senior Software Engineer @ Team Foundation
- TODO: More info

---

# Purpose

- Understand the importance of load testing
- Learn about K6

<!--
Q: Who here maintains endpoints? Something like /bookings/student-information, etc.?
Q: Who here knows, roughly, how fast these endpoints respond? Is it 100ms, 1s, 10s?
Q: How do you know? Do you measure it?

- Browser DevTools
- Monitoring
-->

---

# Agenda

<v-clicks>

1. Understanding Load Testing
2. Introduction to K6
3. Running K6 Tests
4. Analyzing Results

</v-clicks>


---

# Terminology

<v-clicks>

- **Performance Testing**
- **Load Testing**
- **Stress Testing**
- **Spike Testing**
- **Endurance Testing**

</v-clicks>

<!--
https://grafana.com/load-testing/types-of-load-testing/#load-testing-vs-performance-testing
- **Performance Testing**: Umbrella term for all tests measuring system performance
- **Load Testing**: Generally refers to testing under expected load
- **Stress Testing**: Testing beyond expected load
- **Spike Testing**: Testing sudden load spikes
- **Endurance Testing**: Testing over a long period
-->

---

# What is Load Testing?

- **Definition**: Load testing examines how a system behaves under (heavy) load.
- **Mechanism**: Simulates multiple users and measures performance metrics.
- **Outcome**: Identifies expected performance, system limits and potential bottlenecks

<!--
Performance metrics include response time, resource utilization, etc. Also, checks for system errors under stress.
-->

---

# Why Load Testing?

<v-clicks>

- **Performance Dependency**
- **High Load Impact**
- **Non-Linear Scaling**
- **Bottleneck Identification**
- **Bug Detection**

</v-clicks>

<!-- 
[click]
### Performance Dependency
System performance changes with varying user loads.

[click]
### High Load Impact
User load can affect performance and system stability.

[click]
### Non-Linear Scaling
Performance is not linearly scalable. For example, doubling the load might not double the response time. It might increase exponentially.
Your system might work fine with 100 users but will start to randomly drop requests with 1000 users. The failure rate itself won't scale linearly either,
it could be that ~900 users are fine, but the last 100 users will suddenly push the system to fail half of the requests.

[click]
### Bottleneck Identification
Identify performance bottlenecks that are not apparent under normal load conditions.

[click]
### Bug Detection
Reveal concurrency issues, database deadlocks, and other bugs not seen under light loads.
-->

---

# What to test?

- Individual routes:
  - For example, Login:
    1. Connect to login page
    2. Send login request
    3. Connect to user dashboard
- Always test API requests
- Sometimes test asset requests
- Define failure conditions for routes

<!-- 
Technically, login might just be sending credentials to an endpoint, but for a user, it involves several steps. Hence, measuring the total time makes sense as it's irrelevant to the user whether the login request or the page load took longer.
-->

---

# What to Measure / How to Evaluate?

- **Error Rate**: Frequency of errors under load.
- **Connection Times**: Key metrics include average, median, percentiles (90th, 95th), minimum, and maximum times.
  - **Average**: Overall performance.
  - **Median**: Typical user experience.
  - **Percentiles**: Performance for the majority of users, excluding outliers.
  - **Min/Max**: Identify extreme performance issues.

<!-- 
The average is not very indicative and is often mentioned just for completeness. The median is less influenced by outliers. The 90th percentile excludes the worst 10%, offering a look at the upper limits of poor performance. Percentiles help ensure a minimum quality level for most users without being skewed by outliers. Min/Max provide additional insights, like if there's an extreme delay over 1 minute.
-->

---

# How to Test?

For basic testing, simple tools like shell scripts and curl can suffice.

---

# Testing with Curl - Simple Call

````md magic-move
```bash
curl -s -o /dev/null -w $'%{time_total}\n' https://www.google.de
```
```bash
URL=https://www.google.de
N=20

seq $N \
  | parallel -j $N "curl -o /dev/null -sL -w $'{}: %{time_total}\n' $URL" \
  | sort -n \
  > out_$N.log
```
````

````md magic-move
```bash
0.193175
```
```bash
1:      0.263425
2:      0.262657
3:      0.258604
4:      0.249628
...
```
````

<!-- 
Curl is silenced with `-s`, output redirected to `/dev/null` with `-o`, and an additional output for total connection time is defined with `-w`.
-->

---

# Testing with Curl


Output:
```
1:      0.263425
2:      0.262657
3:      0.258604
4:      0.249628
...
```

<!-- 
GNU Parallel executes commands in parallel. This is a basic use case where `seq` generates a sequence used by `parallel` to perform `N` parallel tasks, and the results are sorted and logged.
-->

---

# Testing with Curl - GNU Datamash

````md magic-move {at:2}
```bash{*|1|2-3}
cat out_20.log \
  | cut -d $'\t' -f 2 \
  | datamash mean 1 median 1 max 1 min 1 --header-out
```
````

```
mean(field-1)   median(field-1) max(field-1)    min(field-1)
0.22805215      0.2242635       0.268756        0.188365
```

<!-- 
GNU Datamash is a command-line tool used here to further process the output of `parallel`, calculating statistical data like mean, median, maximum, and minimum times.
-->

---

# Testing with Curl - Limitations

- **Scalability**: Curl is limited to simple requests and does not scale well for complex scenarios.

- **Multi-Step-Scenarios**: Persisting and reusing cookies or other session data is cumbersome

- **Simplicity**: Curl is great for straightforward requests but falls short for complex scenarios involving multiple steps, dynamic data, authentication, and error handling.


<!-- 
Complex cases exceed simple scripting capabilities, involving multiple requests, authentication, cookies, error handling, HTML parsing, and dynamic data.
-->

---

# K6

- CLI and scripting in JavaScript
- Open Source and enterprise SaaS
- Use cases: load testing and performance monitoring
- Maintained by Grafana Labs

<!-- 
K6 was acquired by Grafana Labs in 2021.
-->

---

# Anatomy of a K6 Test

````md magic-move
```javascript{1-2|4|6|8|10}
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
        { duration: '10s', target: 0 },  // Ramp down
    ],
};

export function setup() {}

export default function (data) {}

export function teardown(data) {}
```
```javascript{6-13}
import http from 'k6/http';
import { sleep, check } from 'k6';

export const options = {};

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
````

---
