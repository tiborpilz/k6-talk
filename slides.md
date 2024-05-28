---
layout: cover
theme: apple-basic
---

# Load Testing with K6

Tibor Pilz

<!--
Q: Who here maintains endpoints? Something like /bookings/student-information, etc.?
Q: Who here knows, roughly, how fast these endpoints respond? Is it 100ms, 1s, 10s?
Q: How do you know? Do you measure it?

- Browser DevTools
- Monitoring
-->

---

# Terminoloy
Load Testing vs. Stress Testing vs. Performance Testing

- **Performance Testing**: Umbrella term for all tests measuring system performance
- **Load Testing**: Generally refers to testing under expected load
- **Stress Testing**: Testing beyond expected load


(For simplicity, this talk will use "load testing" to loosely refer to all three.)

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

- **Performance Dependency**: System performance changes with varying user loads.
- **High Load Impact**: User load can affect performance and system stability.
- **Non-Linear Scaling**: Performance can degrade exponentially under stress.
- **Bottleneck Identification**: Identify performance bottlenecks that are not apparent under normal load conditions.
- **Bug Detection**: Reveal concurrency issues, database deadlocks, and other bugs not seen under light loads.

<!-- 
Specific bugs like Concurrency issues, DB Deadlocks, etc., generally occur only under high stress conditions.
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

```bash
curl -s -o /dev/null -w $'%{time_total}\n' https://www.google.de
```

Output:
```
0.193175
```

<!-- 
Curl is silenced with `-s`, output redirected to `/dev/null` with `-o`, and an additional output for total connection time is defined with `-w`.
-->

---

# Testing with Curl - GNU Parallel

```bash
URL=https://www.google.de
N=20

seq $N \
  | parallel -j $N "curl -o /dev/null -sL -w $'{}: %{time_total}\n' $URL" \
  | sort -n \
  > out_$N.log
```

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

# K6 Example

```javascript
import k6 from 'k6';

export default function () {
  http.get('https://google.com');
}
```

---
