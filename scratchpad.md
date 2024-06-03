---
title: Unsorted Slides
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

# What to Measure

<v-clicks>

- **Connection Times**: Key metrics include average, median, percentiles (90th, 95th), minimum, and maximum times.
  - **Average**: Overall performance.
  - **Median**: Typical user experience.
  - **Percentiles**: Performance for the majority of users, excluding outliers.
  - **Min/Max**: Identify extreme performance issues.
- **Error Rate**: Frequency of errors under load.

</v-clicks>

<!-- 
The average is not very indicative and is often mentioned just for completeness. The median is less influenced by outliers. The 90th percentile excludes the worst 10%, offering a look at the upper limits of poor performance. Percentiles help ensure a minimum quality level for most users without being skewed by outliers. Min/Max provide additional insights, like if there's an extreme delay over 1 minute.
-->

---

# How to Test?

For basic testing, simple tools like shell scripts and curl can suffice.

---

# Testing with Curl

````md magic-move
```bash
curl -s -o /dev/null -w '%{time_total}\n' https://www.google.com

# output:
0.193175
```
```bash
seq 64 \
  | parallel -j $N "curl -o /dev/null -sL -w '{}: %{time_total}\n' https://www.google.com" \
  | sort -n

# output:
1: 0.263425
2: 0.262657
3: 0.258604
...
64: 0.261068
```
```bash
seq 64 \
  | parallel -j 64 "curl -o /dev/null -sL -w '{}: %{time_total}\n' https://www.google.com" \
  | cut -d ' ' -f 2 \
  | datamash mean 1 median 1 max 1 min 1 --header-out
  
# output:
mean(field-1)   median(field-1) max(field-1)    min(field-1)
0.22805215      0.2242635       0.268756        0.188365
```
````

<!-- 
Curl is silenced with `-s`, output redirected to `/dev/null` with `-o`, and an additional output for total connection time is defined with `-w`.

[click]
GNU Parallel executes commands in parallel. This is a basic use case where `seq` generates a sequence used by `parallel` to perform `N` parallel tasks, and the results are sorted and logged.

[click]
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
